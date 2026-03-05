async function enrichUser(userId) {
	const user = await http.get('https://jsonplaceholder.typicode.com/users/' + userId);
	const posts = await http.get('https://jsonplaceholder.typicode.com/users/' + userId + '/posts');
	await http.post('https://httpbin.org/post', {
		name: user.name,
		email: user.email,
		postCount: posts.length,
	});
}

onSchedule({ every: '6h' }, async () => {
	const todos = await http.get('https://jsonplaceholder.typicode.com/todos');
	const pending = todos.filter((t) => !t.completed && t.id <= 10);

	for (const task of pending) {
		await enrichUser(task.userId);
	}

	await http.post('https://httpbin.org/post', { processed: pending.length });
});
