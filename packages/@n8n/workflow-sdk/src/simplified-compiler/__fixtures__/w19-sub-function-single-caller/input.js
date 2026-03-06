async function notifyTeam(message) {
	await http.post('https://slack.com/api/chat.postMessage', { text: message });
}

onManual(async () => {
	/** @example [{ summary: "All systems operational", uptime: "99.97%", lastIncident: "2024-01-10" }] */
	const data = await http.get('https://api.example.com/status');
	await notifyTeam(data.summary);
});
