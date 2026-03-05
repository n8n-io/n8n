/** @example [{ triggered: true }] */
onManual(async () => {
	try {
		const users = await http.get('https://api.example.com/users');
		await http.post('https://api.example.com/process', users);
	} catch {
		await http.post('https://hooks.slack.com/error', { msg: 'pipeline failed' });
	}
});
