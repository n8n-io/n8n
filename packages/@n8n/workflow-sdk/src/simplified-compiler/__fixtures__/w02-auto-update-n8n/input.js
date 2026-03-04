onSchedule({ cron: '0 5 * * *' }, async () => {
	const latest = await http.get('https://registry.npmjs.org/n8n/latest');

	const local = await http.get('http://0.0.0.0:5678/rest/settings', {
		auth: { type: 'bearer', credential: 'n8n API' },
	});

	if (latest.version !== local.data.versionCli) {
		await http.post('https://my-server/api/exec', {
			command: 'echo "true" > n8n/check_update.txt',
		});
	} else {
		await http.post('https://my-server/api/exec', {
			command: 'echo "false" > n8n/check_update.txt',
		});
	}
});
