import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://example.com').post('/').reply(200, { result: 'ok' });
	return [api];
}
