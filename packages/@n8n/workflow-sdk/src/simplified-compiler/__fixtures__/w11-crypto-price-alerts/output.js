const t0 = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.2,
	config: { parameters: { rule: { interval: [{ field: 'minutes', minutesInterval: 5 }] } } },
});

const http1 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'GET api.binance.com/api/v1/ticker/24hr',
		parameters: {
			method: 'GET',
			url: 'https://api.binance.com/api/v1/ticker/24hr',
			options: {},
		},
		executeOnce: true,
	},
});

const code1 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
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
let message = '';\nreturn [{ json: { significant, message } }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const code2 = node({
	type: 'n8n-nodes-base.code',
	version: 2,
	config: {
		name: 'Code 2',
		parameters: {
			jsCode: `// From: Code 1\nconst message = $('Code 1').all().map(i => i.json);\nmessage += coin.symbol + ': ' + coin.priceChangePercent + '%\n';\nreturn [{ json: {} }];`,
			mode: 'runOnceForAllItems',
		},
		executeOnce: true,
	},
});

const sib1 = splitInBatches({
	version: 3,
	config: { name: 'Loop 1', parameters: { batchSize: 1 }, executeOnce: true },
}).to(code2);

const http2 = node({
	type: 'n8n-nodes-base.httpRequest',
	version: 4.2,
	config: {
		name: 'POST api.telegram.org/bot/sendMessage',
		parameters: {
			method: 'POST',
			url: 'https://api.telegram.org/bot/sendMessage',
			options: {},
			sendBody: true,
			contentType: 'json',
			specifyBody: 'json',
			jsonBody: '{"chat_id":"123456789","text":"Price alerts triggered"}',
		},
		executeOnce: true,
	},
});

const if1 = ifElse({
	version: 2.2,
	config: {
		name: 'IF 1',
		parameters: { conditions: { options: { leftValue: 'message' } } },
		executeOnce: true,
	},
}).onTrue(http2);

export default workflow('compiled', 'Compiled Workflow').add(
	t0.to(http1).to(code1).to(sib1).to(if1),
);
