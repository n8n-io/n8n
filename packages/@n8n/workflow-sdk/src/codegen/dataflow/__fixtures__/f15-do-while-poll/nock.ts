import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com')
		.get('/status')
		.reply(200, { status: 'complete', progress: 100 });
	return [api];
}
