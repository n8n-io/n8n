import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /enrich/{id} → called in enrichData() sub-function (dynamic URL)
	const s1 = nock('https://api.com')
		.get(/\/enrich\/.*/)
		.reply(200, { id: 'item1', name: 'Enriched Item', score: 95 })
		.persist();

	// POST /notify → called in processAndNotify() sub-function
	const s2 = nock('https://slack.com').post('/notify').reply(200, { ok: true });

	return [s1, s2];
}
