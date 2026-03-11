import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const getUsers = nock('https://api.example.com')
		.get('/users')
		.reply(200, { status: 'active', email: 'alice@example.com' });
	const notify = nock('https://api.example.com').post('/notify').reply(200, { notified: true });
	const log = nock('https://api.example.com').post('/log').reply(200, { logged: true });
	return [getUsers, notify, log];
}
