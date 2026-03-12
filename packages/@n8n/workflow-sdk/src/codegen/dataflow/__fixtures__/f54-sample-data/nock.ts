import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const profile = nock('https://api.example.com')
		.get('/profile')
		.reply(200, { userId: 42, name: 'Alice', email: 'alice@example.com' });
	return [profile];
}
