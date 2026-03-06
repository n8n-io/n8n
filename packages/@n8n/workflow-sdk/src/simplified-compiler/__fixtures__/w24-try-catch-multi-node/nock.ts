import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /users → succeeds, so try body completes and catch is skipped
	const s1 = nock('https://api.example.com')
		.get('/users')
		.reply(200, { users: [{ id: 1, name: 'Alice' }] });

	// POST /process → second node in try body
	const s2 = nock('https://api.example.com').post('/process').reply(200, { processed: true });

	// POST /error → catch branch (won't be hit)
	const s3 = nock('https://hooks.slack.com').post('/error').reply(200, { ok: true });

	return [s1, s2, s3];
}
