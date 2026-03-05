onSchedule({ cron: '0 2 * * *' }, async () => {
	/** @example [{ id: 101, name: "Old Campaign", status: "stale", lastAccessed: "2023-06-15" }, { id: 202, name: "Expired Report", status: "stale", lastAccessed: "2023-05-01" }] */
	const items = await http.get('https://api.app.com/items?status=stale', {
		auth: { type: 'basic', credential: 'App API' },
	});
	for (const item of items) {
		await http.delete('https://api.app.com/items/remove', {
			auth: { type: 'basic', credential: 'App API' },
		});
	}
});
