const t0 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {"rule":{"interval":[{"field":"minutes","minutesInterval":5}]}} } });

const http1 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "GET api.binance.com/api/v1/ticker/24hr",
    "parameters": {
      "method": "GET",
      "url": "https://api.binance.com/api/v1/ticker/24hr",
      "options": {}
    },
    "executeOnce": true,
    "pinData": [
      {
        "symbol": "BTCUSDT",
        "priceChangePercent": "16.5",
        "lastPrice": "68432.10"
      },
      {
        "symbol": "ETHUSDT",
        "priceChangePercent": "-2.1",
        "lastPrice": "3521.80"
      },
      {
        "symbol": "SOLUSDT",
        "priceChangePercent": "22.3",
        "lastPrice": "142.55"
      }
    ]
  }
});

const code1 = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Code 1',
    parameters: {
      jsCode: `// From: GET api.binance.com/api/v1/ticker/24hr\nconst tickers = $('GET api.binance.com/api/v1/ticker/24hr').all().map(i => i.json);\nconst significant = tickers
	.filter(function (coin) {
		return Math.abs(parseFloat(coin.priceChangePercent)) >= 15;
	})
	.sort(function (a, b) {
		return b.priceChangePercent - a.priceChangePercent;
	});

let message = '';
for (const coin of significant) {
	message += coin.symbol + ': ' + coin.priceChangePercent + '%\\n';
}\nreturn [{ json: { significant, message, coin } }];`,
      mode: 'runOnceForAllItems'
    },
    executeOnce: true
  }
});

const http2 = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.2,
  config: {
    "name": "POST api.telegram.org/bot/sendMessage",
    "parameters": {
      "method": "POST",
      "url": "https://api.telegram.org/bot/sendMessage",
      "options": {},
      "sendBody": true,
      "contentType": "json",
      "specifyBody": "json",
      "jsonBody": "{\"chat_id\":\"123456789\",\"text\":\"Price alerts triggered\"}"
    },
    "executeOnce": true
  }
});

const if1 = ifElse({ version: 2.2, config: { name: 'IF 1', parameters: { conditions: {"conditions":[{"leftValue":"={{ $('Code 1').first().json.message }}","rightValue":"","operator":{"type":"string","operation":"exists","singleValue":true}}],"combinator":"and"} }, executeOnce: true } })
  .onTrue(http2);

export default workflow('compiled', 'Compiled Workflow')
  .add(t0.to(http1).to(code1).to(if1));