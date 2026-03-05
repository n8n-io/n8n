onSchedule({ every: '1h' }, async () => {
	const users = await http.get('https://jsonplaceholder.typicode.com/users');

	const active = users.filter((u) => u.id <= 5);

	for (const user of active) {
		try {
			const posts = await http.get(
				'https://jsonplaceholder.typicode.com/users/' + user.id + '/posts',
			);
			await http.post('https://httpbin.org/post', {
				user: user.name,
				postCount: posts.length,
			});
		} catch {
			await http.post('https://httpbin.org/post', { error: 'Failed for user ' + user.name });
		}
	}

	await http.post('https://httpbin.org/post', { summary: active.length + ' users checked' });
});
