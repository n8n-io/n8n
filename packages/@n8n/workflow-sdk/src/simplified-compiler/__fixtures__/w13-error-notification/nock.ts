import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// POST /incidents → PagerDuty incident creation
	const s1 = nock('https://api.pagerduty.com')
		.post('/incidents')
		.reply(201, { incident: { id: 'P123ABC', status: 'triggered' } });

	return [s1];
}
