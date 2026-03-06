onSchedule({ cron: '0 9 * * 1' }, async () => {
	const reportTag = 'weekly-check';

	const created = await http.post('https://jsonplaceholder.typicode.com/posts', {
		title: 'Test Post',
		body: 'auto-generated',
		userId: 1,
	});
	const fetched = await http.get('https://jsonplaceholder.typicode.com/posts/' + created.id);
	await http.put('https://jsonplaceholder.typicode.com/posts/' + created.id, {
		title: 'Updated Post',
		body: fetched.body,
		userId: 1,
	});
	await http.patch('https://jsonplaceholder.typicode.com/posts/' + created.id, {
		title: 'Final Post',
	});
	await http.delete('https://jsonplaceholder.typicode.com/posts/' + created.id);

	let backup = null;
	try {
		backup = await http.get('https://jsonplaceholder.typicode.com/posts/1');
	} catch {
		await http.post('https://httpbin.org/post', { error: 'fetch failed' });
	}

	if (backup) {
		await http.post('https://httpbin.org/post', { title: backup.title, status: 'ok' });
	} else {
		await http.post('https://httpbin.org/post', { status: 'skipped' });
	}

	const todo = await http.get('https://jsonplaceholder.typicode.com/todos/1');
	switch (todo.completed) {
		case true:
			await http.post('https://httpbin.org/post', { status: 'done', title: todo.title });
			break;
		case false:
			await http.post('https://httpbin.org/post', { status: 'pending', title: todo.title });
			break;
		default:
			await http.post('https://httpbin.org/post', { status: 'unknown' });
	}

	await http.post('https://httpbin.org/post', { reportTag, result: 'complete' });
});
