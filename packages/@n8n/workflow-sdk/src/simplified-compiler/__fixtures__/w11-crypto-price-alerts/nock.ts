import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /api/v1/ticker/24hr → Binance ticker data
	const s1 = nock('https://api.binance.com')
		.get('/api/v1/ticker/24hr')
		.reply(200, [
			{ symbol: 'BTCUSDT', priceChangePercent: '16.5', lastPrice: '68432.10' },
			{ symbol: 'ETHUSDT', priceChangePercent: '-2.1', lastPrice: '3521.80' },
			{ symbol: 'SOLUSDT', priceChangePercent: '22.3', lastPrice: '142.55' },
		]);

	// POST /bot/sendMessage → Telegram alert
	const s2 = nock('https://api.telegram.org')
		.post('/bot/sendMessage')
		.reply(200, { ok: true, result: { message_id: 123 } });

	return [s1, s2];
}
