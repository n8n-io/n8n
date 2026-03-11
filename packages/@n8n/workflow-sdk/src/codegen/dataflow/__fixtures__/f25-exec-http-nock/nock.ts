import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com')
		.get('/users')
		.reply(200, { users: [{ name: 'Alice' }] });
	return [api];
}
