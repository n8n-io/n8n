import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const sourceA = nock('https://api.example.com').get('/source-a').reply(200, { fromA: 'alpha' });
	const sourceB = nock('https://api.example.com').get('/source-b').reply(200, { fromB: 'beta' });
	const sourceC = nock('https://api.example.com').get('/source-c').reply(200, { fromC: 'gamma' });
	return [sourceA, sourceB, sourceC];
}
