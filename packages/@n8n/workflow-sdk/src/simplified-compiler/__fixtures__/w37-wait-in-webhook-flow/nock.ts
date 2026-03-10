import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const s1 = nock('https://api.example.com').post('/orders').reply(200, { id: 'order_001' });

	const s2 = nock('https://api.example.com').post('/ship').reply(200, { ok: true });

	const s3 = nock('https://api.example.com').post('/notify').reply(200, { ok: true });

	return [s1, s2, s3];
}
