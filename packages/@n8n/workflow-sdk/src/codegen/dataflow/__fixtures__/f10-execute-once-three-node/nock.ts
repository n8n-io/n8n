import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const fetchApi = nock('https://api.example.com')
		.get('/users')
		.reply(200, { name: 'Alice', email: 'alice@test.com' });
	const notifyApi = nock('https://hooks.example.com').post('/notify').reply(200, { success: true });
	return [fetchApi, notifyApi];
}
