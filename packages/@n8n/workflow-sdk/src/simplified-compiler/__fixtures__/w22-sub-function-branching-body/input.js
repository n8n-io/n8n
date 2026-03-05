async function classify(priority) {
	if (priority === 'high') {
		await http.post('https://api.com/urgent', { priority });
	} else {
		await http.post('https://api.com/normal', { priority });
	}
}

/** @example [{ triggered: true }] */
onManual(async () => {
	/** @example [{ id: "task_001", priority: "high", name: "Critical Fix" }] */
	const item = await http.get('https://api.com/item');
	await classify(item.priority);
});
