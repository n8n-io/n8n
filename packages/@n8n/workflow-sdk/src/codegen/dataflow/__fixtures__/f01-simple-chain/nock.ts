import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://example.com').get('/').reply(200, { data: 'response' });
	return [api];
}
