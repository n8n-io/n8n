import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// GET /todos → todo list (filtered to !completed && id <= 10 in Code node)
	const s1 = nock('https://jsonplaceholder.typicode.com')
		.get('/todos')
		.reply(200, [
			{ userId: 1, id: 1, title: 'Task 1', completed: false },
			{ userId: 1, id: 2, title: 'Task 2', completed: true },
			{ userId: 2, id: 3, title: 'Task 3', completed: false },
			{ userId: 2, id: 11, title: 'Task 11', completed: false },
		]);

	// GET /users/{id} → called in loop body sub-function (dynamic user IDs)
	const s2 = nock('https://jsonplaceholder.typicode.com')
		.get(/\/users\/\d+$/)
		.reply(200, { id: 1, name: 'Leanne Graham', email: 'leanne@test.com' })
		.persist();

	// GET /users/{id}/posts → called in loop body sub-function (dynamic user IDs)
	const s3 = nock('https://jsonplaceholder.typicode.com')
		.get(/\/users\/\d+\/posts$/)
		.reply(200, [
			{ id: 1, title: 'Post 1' },
			{ id: 2, title: 'Post 2' },
		])
		.persist();

	// POST /post → called in loop body sub-function + after loop
	const s4 = nock('https://httpbin.org').post('/post').reply(200, { success: true }).persist();

	return [s1, s2, s3, s4];
}
