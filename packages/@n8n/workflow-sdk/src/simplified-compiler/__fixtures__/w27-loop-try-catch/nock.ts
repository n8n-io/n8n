import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /users → user list (filtered to id <= 5 in Code node)
	const s1 = nock('https://jsonplaceholder.typicode.com')
		.get('/users')
		.reply(200, [
			{ id: 1, name: 'Leanne Graham', email: 'leanne@test.com' },
			{ id: 2, name: 'Ervin Howell', email: 'ervin@test.com' },
			{ id: 6, name: 'Mrs. Dennis Schulist', email: 'dennis@test.com' },
		]);

	// GET /users/{id}/posts → called in loop body try block (dynamic user IDs)
	const s2 = nock('https://jsonplaceholder.typicode.com')
		.get(/\/users\/\d+\/posts$/)
		.reply(200, [{ id: 1, title: 'Post 1' }])
		.persist();

	// POST /post → called in loop body (try + catch branches) + after loop
	const s3 = nock('https://httpbin.org').post('/post').reply(200, { success: true }).persist();

	return [s1, s2, s3];
}
