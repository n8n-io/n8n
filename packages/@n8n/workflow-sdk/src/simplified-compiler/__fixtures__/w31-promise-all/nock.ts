import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const s1 = nock('https://api.example.com')
		.get('/users')
		.reply(200, [
			{ id: 1, name: 'Alice' },
			{ id: 2, name: 'Bob' },
		]);

	const s2 = nock('https://api.example.com')
		.get('/orders')
		.reply(200, [
			{ id: 101, product: 'Widget', quantity: 3 },
			{ id: 102, product: 'Gadget', quantity: 1 },
		]);

	const s3 = nock('https://api.example.com')
		.post('/dashboard')
		.reply(200, { status: 'ok', dashboardId: 'dash_001' });

	return [s1, s2, s3];
}
