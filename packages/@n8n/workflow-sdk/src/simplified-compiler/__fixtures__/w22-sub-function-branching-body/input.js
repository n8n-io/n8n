async function classify(priority) {
	if (priority === 'high') {
		await http.post('https://api.com/urgent', { priority });
	} else {
		await http.post('https://api.com/normal', { priority });
	}
}

onManual(async () => {
	const item = await http.get('https://api.com/item');
	await classify(item.priority);
});
