import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const s1 = nock('https://api.example.com').post('/prepare').reply(200, { ok: true });

	const s2 = nock('https://api.example.com').post('/submit').reply(200, { ok: true });

	return [s1, s2];
}
