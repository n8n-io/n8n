import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /users → succeeds (200), so catch branch is skipped
	const s1 = nock('https://api.example.com')
		.get('/users')
		.reply(200, { users: [{ id: 1, name: 'Alice' }] });

	// POST /error → catch branch (won't be hit since GET succeeds)
	const s2 = nock('https://hooks.slack.com').post('/error').reply(200, { ok: true });

	// POST /process → called after successful try
	const s3 = nock('https://api.example.com').post('/process').reply(200, { processed: true });

	return [s1, s2, s3];
}
