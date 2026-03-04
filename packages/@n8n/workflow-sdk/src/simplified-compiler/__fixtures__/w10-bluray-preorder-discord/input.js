async function checkBlurays() {
	const today = new Date();
	const formattedDate = today.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: '2-digit',
		timeZone: 'America/New_York',
	});

	const page = await http.get('https://www.blu-ray.com/movies/movies.php?show=newpreorders');

	const links = extractLinks(page);
	const todaysItems = links.filter(function (link) {
		return link.date === formattedDate;
	});

	let message = '*New 4k Preorders Today!*\n';
	for (const item of todaysItems) {
		message += item.title + '\n';
	}

	await http.post('https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN', {
		content: message.substring(0, 2000),
	});
}

onManual(async () => {
	await checkBlurays();
});
onSchedule({ cron: '0 23 * * *' }, async () => {
	await checkBlurays();
});
