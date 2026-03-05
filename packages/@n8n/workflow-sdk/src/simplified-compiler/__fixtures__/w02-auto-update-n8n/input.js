onSchedule({ cron: '0 5 * * *' }, async () => {
	const latest = await http.get('https://registry.npmjs.org/n8n/latest');

	const local = await http.get('http://0.0.0.0:5678/rest/settings', {
		auth: { type: 'bearer', credential: 'n8n API' },
	});

	await http.post('https://my-server/api/exec', {
		latestVersion: latest.version,
		currentVersion: local.data.versionCli,
	});
});
