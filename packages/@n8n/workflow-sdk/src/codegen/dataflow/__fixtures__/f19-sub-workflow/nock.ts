import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com').post('/reports').reply(200, { saved: true });
	return [api];
}
