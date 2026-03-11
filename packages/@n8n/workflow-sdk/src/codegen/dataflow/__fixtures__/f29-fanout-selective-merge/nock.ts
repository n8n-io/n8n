import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const users = nock('https://api.example.com')
		.get('/users')
		.reply(200, { userId: 1, name: 'Alice' });
	const orders = nock('https://api.example.com')
		.get('/orders')
		.reply(200, { orderId: 101, total: 50 });
	const notify = nock('https://api.example.com')
		.post('/admin/notify')
		.reply(200, { notified: true });
	return [users, orders, notify];
}
