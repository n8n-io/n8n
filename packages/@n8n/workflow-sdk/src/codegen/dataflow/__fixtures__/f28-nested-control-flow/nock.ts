import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const rush = nock('https://api.example.com').post('/rush').reply(200, { delivered: true });
	return [rush];
}
