import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /data → returns email-type record (triggers "email" switch branch)
	const s1 = nock('https://api.example.com')
		.get('/data')
		.reply(200, { type: 'email', recipient: 'test@example.com', phone: '555-1234' });

	// POST /email → email branch handler
	const s2 = nock('https://api.example.com').post('/email').reply(200, { success: true });

	return [s1, s2];
}
