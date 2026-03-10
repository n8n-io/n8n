import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /calendar/v3/calendars/primary/events → Calendar events
	const s1 = nock('https://www.googleapis.com')
		.get('/calendar/v3/calendars/primary/events')
		.reply(200, [
			{
				id: 'evt_001',
				status: 'confirmed',
				summary: 'Team Standup',
				start: { dateTime: '2024-01-15T10:00:00Z' },
			},
			{
				id: 'evt_002',
				status: 'cancelled',
				summary: 'Design Review',
				start: { dateTime: '2024-01-15T14:00:00Z' },
			},
		]);

	// POST /bots → per-loop bot join for confirmed events
	const s2 = nock('https://gateway.vexa.ai')
		.post('/bots')
		.reply(200, { botId: 'bot_001', status: 'joining' })
		.persist();

	// DELETE /bots/meeting123 → per-loop bot removal for cancelled events
	const s3 = nock('https://gateway.vexa.ai')
		.delete('/bots/meeting123')
		.reply(200, { deleted: true })
		.persist();

	return [s1, s2, s3];
}
