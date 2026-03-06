import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /status → system status check
	const s1 = nock('https://api.example.com')
		.get('/status')
		.reply(200, {
			summary: 'All systems operational',
			uptime: '99.97%',
			lastIncident: '2024-01-10',
		});

	// POST /api/chat.postMessage → Slack notification in notifyTeam sub-function
	const s2 = nock('https://slack.com')
		.post('/api/chat.postMessage')
		.reply(200, { ok: true, channel: 'C123', ts: '1234567890.123456' });

	return [s1, s2];
}
