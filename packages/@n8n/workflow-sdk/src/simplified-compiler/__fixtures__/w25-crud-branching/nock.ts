import nock from 'nock';

export function setupNock(): nock.Scope[] {
	// POST /posts → created post with id
	const s1 = nock('https://jsonplaceholder.typicode.com')
		.post('/posts', { title: 'Test Post', body: 'auto-generated', userId: 1 })
		.reply(201, { id: 101, title: 'Test Post', body: 'auto-generated', userId: 1 });

	// GET /posts/101
	const s2 = nock('https://jsonplaceholder.typicode.com')
		.get('/posts/101')
		.reply(200, { id: 101, title: 'Test Post', body: 'auto-generated', userId: 1 });

	// PUT /posts/101
	const s3 = nock('https://jsonplaceholder.typicode.com')
		.put('/posts/101')
		.reply(200, { id: 101, title: 'Updated Post', body: 'auto-generated', userId: 1 });

	// PATCH /posts/101
	const s4 = nock('https://jsonplaceholder.typicode.com')
		.patch('/posts/101')
		.reply(200, { id: 101, title: 'Final Post' });

	// DELETE /posts/101
	const s5 = nock('https://jsonplaceholder.typicode.com').delete('/posts/101').reply(200, {});

	// GET /posts/1 (try/catch backup)
	const s6 = nock('https://jsonplaceholder.typicode.com')
		.get('/posts/1')
		.reply(200, { id: 1, title: 'Backup Post', body: 'existing content', userId: 1 });

	// GET /todos/1 (switch)
	const s7 = nock('https://jsonplaceholder.typicode.com')
		.get('/todos/1')
		.reply(200, { userId: 1, id: 1, title: 'delectus aut autem', completed: true });

	// httpbin POSTs (various branches)
	const s8 = nock('https://httpbin.org').post('/post').reply(200, { success: true }).persist();

	return [s1, s2, s3, s4, s5, s6, s7, s8];
}
