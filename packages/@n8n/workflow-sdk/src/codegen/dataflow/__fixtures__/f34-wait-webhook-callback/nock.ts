import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const start = nock('https://api.example.com').post('/start').reply(200, { requestId: 'req-456' });
	return [start];
}
