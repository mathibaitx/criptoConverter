let hoy;

function dateToday() {
    hoy = new Date().toISOString().slice(0, 10);
}
dateToday();

function leerMonedasTradicionales() {
    fetch("https://api.getgeoapi.com/v2/currency/list?api_key=bf55f4c281cad60711eda6c16d402379e489a7fe")
        .then(r => r.json())
        .then(monedasTradicionalesList);
}
leerMonedasTradicionales();

function monedasTradicionalesList(data) {
    /*console.log(data);*/

    let tradList = document.querySelector("#select-monedasTrad");

    for (let i in data.currencies) {
        /*console.log(data.currencies[i]);*/
        let list = data.currencies[i];
        tradList.innerHTML += `<option value="${i}">${list}</option>`
    }
}

function leerCriptomonedas() {
    fetch("https://api.coinpaprika.com/v1/coins")
        .then(r => r.json())
        .then(criptomonedasList)
}
leerCriptomonedas();

function criptomonedasList(data) {
    data.length = 50;
    /*console.log(data);*/

    let criptoList = document.querySelector("#select-cripto");

    for (let i in data) {
        /*console.log(data[i].name);*/
        let list = data[i].name;
        let id = data[i].id;
        let symbol = data[i].symbol;
        criptoList.innerHTML += `<option id="${symbol}" data-symbol="${symbol}" value="${id}">${list}</option>`;
    }
}

const $form = document.querySelector("form");
$form.addEventListener("submit", convertir);

let busqueda;

function obternerValoresForm() {
    const monto = document.querySelector("#input-monto").value;
    const trad = document.querySelector("#select-monedasTrad").value;
    const cripto = document.querySelector("#select-cripto").value;

    busqueda = {
        monto: monto,
        trad: trad,
        cripto: cripto,
    }

    /*console.log("Monto: ", monto, "Trad: ", trad, "Cripto: ", cripto, "Fecha: ", fecha);*/
}

let fechasGraf = [];
let numerosGraf = [];

function convertir(evento) {
    obternerValoresForm();
    evento.preventDefault();

    let selectCripto = document.querySelector("#select-cripto");
    let valorCripto = document.querySelector("#select-cripto").options[selectCripto.selectedIndex].text;
    let selectTrad = document.querySelector("#select-monedasTrad");
    let valorTrad = document.querySelector("#select-monedasTrad").options[selectTrad.selectedIndex].text;
    let error = document.querySelector("#div-error");

    if (busqueda.monto !== "" && valorTrad !== "Moneda Tradicional" && valorCripto !== "Criptomoneda") {
        error.innerHTML = "";
        Promise.all([
            convertirTradDolar(),
            criptoHistorico(),
        ])
            .catch(errorApi)
    }
    else {
        error.innerHTML = "<p>Faltan Datos</>";
    }

    let divHistoricoFechas = document.querySelector("#div-historicoFechas");
    divHistoricoFechas.innerHTML = "";
    let divHistoricoNumeros = document.querySelector("#div-historicoNumeros");
    divHistoricoNumeros.innerHTML = "";
    fechasGraf = [];
    numerosGraf = [];
}

function errorApi() {
    console.log("ERROR EN LA API");
}

function convertirTradDolar() {
    fetch(`https://api.getgeoapi.com/v2/currency/historical/${hoy}?api_key=bf55f4c281cad60711eda6c16d402379e489a7fe&from=${busqueda.trad}&to=USD&amount=${busqueda.monto}`)
        .then(r => r.json())
        .then(convertirDolarCripto)
}

function convertirDolarCripto(data) {
    let dolar;
    for (let i in data.rates) {
        dolar = data.rates[i].rate_for_amount;
    }
    /*console.log(dolar);*/
    fetch(`https://api.coinpaprika.com/v1/price-converter?base_currency_id=usd-us-dollars&quote_currency_id=${busqueda.cripto}&amount=${dolar}`)
        .then(r => r.json())
        .then(resultado => {
            /*console.log(resultado);*/
            let symbol;
            for (let i in resultado) {
                if (resultado[i] === busqueda.cripto) {
                    let selectCripto = document.querySelector("#select-cripto");
                    symbol = selectCripto.options[selectCripto.selectedIndex].getAttribute("data-symbol");
                }
            }
            document.querySelector("#p-resultadoTrad").innerHTML = `${busqueda.monto} ${busqueda.trad}`;
            document.querySelector("#p-resultadoCripto").innerHTML = `${Math.round(resultado.price)} ${symbol}`;
        })
}

function criptoHistorico() {
    const start = calcularStart(hoy);
    fetch(`https://api.coinpaprika.com/v1/coins/${busqueda.cripto}/ohlcv/historical?start=${start}&end=${hoy}`)
        .then(r => r.json())
        .then(criptoHistoricoConvert);
}

function criptoHistoricoConvert(dataHist) {
    /*console.log(dataHist);*/
    let dolarHist;
    for (let i in dataHist) {
        /*console.log(dolarHist)*/
        dolarHist = dataHist[i].close;
        let fechasHist = (dataHist[i].time_close).slice(0, 10);
        let divHistoricoFechas = document.querySelector("#div-historicoFechas");
        divHistoricoFechas.innerHTML += `<p>${fechasHist} | </p>`;
        fechasGraf.push(fechasHist);
        fetch(`https://api.getgeoapi.com/v2/currency/historical/${hoy}?api_key=bf55f4c281cad60711eda6c16d402379e489a7fe&from=USD&to=${busqueda.trad}&amount=${dolarHist}`)
            .then(r => r.json())
            .then(data => {
                /*console.log(data);*/
                for (let i in data.rates) {
                    let numerosHist = data.rates[i].rate_for_amount;
                    let selectCripto = document.querySelector("#select-cripto");
                    let symbol = selectCripto.options[selectCripto.selectedIndex].getAttribute("data-symbol");
                    let divHistoricoNumeros = document.querySelector("#div-historicoNumeros");
                    divHistoricoNumeros.innerHTML += `<p> 1 ${symbol} = ${numerosHist} ${busqueda.trad}</p>`;
                    numerosGraf.push(numerosHist);
                };
                grafica();
            });
    }
}

function calcularStart(fecha) {
    const dateInicial = new Date(fecha);

    /*console.log(dateInicial);*/

    const UNA_SEMANA = 7;
    const nuevoDate = dateInicial.getDate() - UNA_SEMANA;
    dateInicial.setDate(nuevoDate);

    /*console.log(dateInicial);*/

    return formatearFecha(dateInicial);
}

function formatearFecha(fecha) {
    const year = fecha.getFullYear();
    const month = fecha.getMonth() + 1;
    const day = fecha.getDate();

    /*console.log(year, month, day);*/

    return `${year}-${formatearNum(month)}-${formatearNum(day)}`;
}

function obtenerDia(fecha) {
    const date = new Date(fecha);
    return date.getDate();
}

function formatearFecha(fecha) {
    const year = fecha.getFullYear();
    const month = fecha.getMonth() + 1;
    const day = fecha.getDate();

    /*console.log(year, month, day);*/

    return `${year}-${formatearNum(month)}-${formatearNum(day)}`;
}

function formatearNum(num) {
    return `${num}`.padStart(2, "0");
}

function grafica() {
    /*console.log(fechasGraf);
    console.log(numerosGraf);*/
    new Chart("myChart", {
        type: "line",
        data: {
            labels: fechasGraf,
            datasets: [{
                fill: false,
                lineTension: 0,
                backgroundColor: "#EA4335",
                borderColor: "rgba(0,0,255,0.1)",
                data: numerosGraf
            }]
        },
        options: {
            legend: { display: false },
            scales: {
                yAxes: [{ ticks: { min: 0, max: 1000000 } }],
            }
        }
    });
}



