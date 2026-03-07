import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /orders/{id} → dynamic URL in processOrder sub-function
	const s1 = nock('https://api.com')
		.get(/\/orders\/.*/)
		.reply(200, { id: 'ORD-123', product: 'Widget Pro', quantity: 5, status: 'processing' })
		.persist();

	// POST /crm → in processOrder sub-function
	const s2 = nock('https://api.com').post('/crm').reply(200, { created: true }).persist();

	// POST /done → after processOrder in webhook callback
	const s3 = nock('https://notify.com').post('/done').reply(200, { ok: true });

	// GET /pending → schedule callback
	const s4 = nock('https://api.com')
		.get('/pending')
		.reply(200, { orderId: 'ORD-456', status: 'pending' });

	return [s1, s2, s3, s4];
}
