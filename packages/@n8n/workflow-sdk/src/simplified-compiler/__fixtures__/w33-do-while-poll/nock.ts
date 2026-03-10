import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /health → body includes statusCode so the while condition exits
	const s1 = nock('https://api.example.com')
		.get('/health')
		.reply(200, { statusCode: 200, status: 'healthy' });

	return [s1];
}
