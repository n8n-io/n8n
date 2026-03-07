import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /data → called in fetchData() sub-function (dynamic URL parameter)
	const s1 = nock('https://api.example.com')
		.get('/data')
		.reply(200, { name: 'Test Dataset', version: 2 });

	// POST /notify → called in main callback
	const s2 = nock('https://slack.com').post('/notify').reply(200, { ok: true });

	return [s1, s2];
}
