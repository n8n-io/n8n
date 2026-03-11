import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com').post('/cleanup').reply(200, { cleaned: true });
	return [api];
}
