async function enrichData(id) {
	const result = await http.get('https://api.com/enrich/' + id);
	return result;
}

async function processAndNotify(itemId) {
	const enriched = await enrichData(itemId);
	await http.post('https://slack.com/notify', { data: enriched });
}

/** @example [{ triggered: true }] */
onManual(async () => {
	await processAndNotify('item1');
});
