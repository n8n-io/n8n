onSchedule({ cron: '0 2 * * *' }, async () => {
	const items = await http.get('https://api.app.com/items?status=stale', {
		auth: { type: 'basic', credential: 'App API' },
	});
	for (const item of items) {
		await http.delete('https://api.app.com/items/remove', {
			auth: { type: 'basic', credential: 'App API' },
		});
	}
});
