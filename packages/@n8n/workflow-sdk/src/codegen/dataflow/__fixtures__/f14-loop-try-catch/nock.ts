import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com')
		.get('/users')
		.reply(200, [{ name: 'Alice', email: 'alice@test.com' }]);
	return [api];
}
