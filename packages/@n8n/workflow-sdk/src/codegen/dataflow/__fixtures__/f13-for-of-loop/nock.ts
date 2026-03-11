import nock from 'nock';

export function setupNock(): nock.Scope[] {
	const api = nock('https://api.example.com')
		.get('/items')
		.reply(200, [
			{ id: 1, task: 'Buy milk' },
			{ id: 2, task: 'Walk dog' },
		]);
	return [api];
}
