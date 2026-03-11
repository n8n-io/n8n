import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com').get('/config').reply(200, { setting: 'enabled' });
	return [api];
}
