import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /item → returns item with priority
	const s1 = nock('https://api.com')
		.get('/item')
		.reply(200, { id: 'task_001', priority: 'high', name: 'Critical Fix' });

	// POST /urgent → high priority branch in classify sub-function
	const s2 = nock('https://api.com').post('/urgent').reply(200, { queued: true, priority: 'high' });

	// POST /normal → normal priority branch (won't be hit with high priority input)
	const s3 = nock('https://api.com')
		.post('/normal')
		.reply(200, { queued: true, priority: 'normal' });

	return [s1, s2, s3];
}
