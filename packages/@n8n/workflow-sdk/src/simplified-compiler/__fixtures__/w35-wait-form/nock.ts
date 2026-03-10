import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const s1 = nock('https://slack.com').post('/api/chat.postMessage').reply(200, { ok: true });

	const s2 = nock('https://api.example.com').post('/complete').reply(200, { ok: true });

	return [s1, s2];
}
