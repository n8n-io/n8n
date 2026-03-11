import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const config = nock('https://api.example.com')
		.get('/config')
		.reply(200, { id: '42', name: 'Test', env: 'production' });
	const update = nock('https://api.example.com').put('/records/42').reply(200, { updated: true });
	return [config, update];
}
