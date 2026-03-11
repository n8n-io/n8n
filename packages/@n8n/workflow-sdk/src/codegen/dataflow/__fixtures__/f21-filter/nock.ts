import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const getData = nock('https://api.example.com')
		.get('/data')
		.reply(200, { status: 'active', name: 'Test Item' });
	const notify = nock('https://api.example.com').post('/notify').reply(200, { notified: true });
	return [getData, notify];
}
