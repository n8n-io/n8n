import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const s1 = nock('https://api.example.com').get('/start').reply(200, { status: 'started' });

	const s2 = nock('https://api.example.com').get('/check').reply(200, { status: 'ok' });

	const s3 = nock('https://api.example.com').post('/finish').reply(200, { status: 'finished' });

	return [s1, s2, s3];
}
