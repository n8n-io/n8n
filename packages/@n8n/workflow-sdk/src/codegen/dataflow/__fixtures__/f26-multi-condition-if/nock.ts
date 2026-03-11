import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const notify = nock('https://api.example.com').post('/notify').reply(200, { notified: true });
	return [notify];
}
