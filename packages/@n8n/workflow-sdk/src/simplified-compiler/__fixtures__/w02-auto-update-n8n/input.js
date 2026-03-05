onSchedule({ cron: '0 5 * * *' }, async () => {
	/** @example [{ version: "1.62.1", name: "n8n" }] */
	const latest = await http.get('https://registry.npmjs.org/n8n/latest');

	/** @example [{ data: { versionCli: "1.61.0" } }] */
	const local = await http.get('http://0.0.0.0:5678/rest/settings', {
		auth: { type: 'bearer', credential: 'n8n API' },
	});

	await http.post('https://my-server/api/exec', {
		latestVersion: latest.version,
		currentVersion: local.data.versionCli,
	});
});
