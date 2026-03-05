async function fetchData(url) {
	const result = await http.get(url);
	return result;
}

/** @example [{ triggered: true }] */
onManual(async () => {
	const data = await fetchData('https://api.example.com/data');
	await http.post('https://slack.com/notify', { info: data.name });
});
