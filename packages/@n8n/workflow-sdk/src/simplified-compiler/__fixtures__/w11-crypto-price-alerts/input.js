onSchedule({ every: '5m' }, async () => {
	const tickers = await http.get('https://api.binance.com/api/v1/ticker/24hr');

	const significant = tickers
		.filter(function (coin) {
			return Math.abs(parseFloat(coin.priceChangePercent)) >= 15;
		})
		.sort(function (a, b) {
			return b.priceChangePercent - a.priceChangePercent;
		});

	let message = '';
	for (const coin of significant) {
		message += coin.symbol + ': ' + coin.priceChangePercent + '%\n';
	}

	if (message) {
		await http.post('https://api.telegram.org/bot/sendMessage', {
			chat_id: '123456789',
			text: 'Price alerts triggered',
		});
	}
});
