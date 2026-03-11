import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com').post('/start').reply(200, { requestId: 'req-123' });
	return [api];
}
