import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com').get('/').reply(200, { status: 'ok' });
	return [api];
}
