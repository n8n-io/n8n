import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// POST /api/chat.postMessage → Slack notifications (called twice: before and after loop)
	const s1 = nock('https://slack.com')
		.post('/api/chat.postMessage')
		.reply(200, { ok: true })
		.persist();

	// GET /api/v1/workflows → n8n API (http, not https)
	const s2 = nock('http://localhost:5678')
		.get('/api/v1/workflows')
		.reply(200, [
			{ id: 1, name: 'Daily Report', updatedAt: '2024-01-15T10:00:00Z', nodes: [] },
			{ id: 2, name: 'Lead Sync', updatedAt: '2024-01-14T08:00:00Z', nodes: [] },
		]);

	// GET /repos/myuser/n8n-workflows/contents/* → 404 (simulating new file, try/catch)
	const s3 = nock('https://api.github.com')
		.get(/\/repos\/myuser\/n8n-workflows\/contents\/.*/)
		.reply(404, { message: 'Not Found' })
		.persist();

	// PUT /repos/myuser/n8n-workflows/contents/* → per-loop file create/update
	const s4 = nock('https://api.github.com')
		.put(/\/repos\/myuser\/n8n-workflows\/contents\/.*/)
		.reply(200, { content: { sha: 'abc123' } })
		.persist();

	return [s1, s2, s3, s4];
}
