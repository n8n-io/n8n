import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /movies/movies.php?show=newpreorders → HTML page with preorder data
	const s1 = nock('https://www.blu-ray.com')
		.get('/movies/movies.php?show=newpreorders')
		.reply(200, {
			data: '<html><body><table><tr><td>Alien (1979)</td><td>January 15, 2025</td></tr></table></body></html>',
		});

	// POST /api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN → Discord webhook
	const s2 = nock('https://discord.com')
		.post('/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN')
		.reply(200, { id: 'msg_001' });

	return [s1, s2];
}
