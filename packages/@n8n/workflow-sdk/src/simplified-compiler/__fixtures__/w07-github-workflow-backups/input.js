onSchedule({ every: '24h' }, async () => {
	await http.post(
		'https://slack.com/api/chat.postMessage',
		{
			channel: '#notifications',
			text: 'Starting Workflow Backup...',
		},
		{ auth: { type: 'bearer', credential: 'Slack' } },
	);

	const config = { owner: 'myuser', repo: 'n8n-workflows', path: 'workflows' };

	/** @example [{ id: 1, name: "Daily Report", updatedAt: "2024-01-15T10:00:00Z", nodes: [] }, { id: 2, name: "Lead Sync", updatedAt: "2024-01-14T08:00:00Z", nodes: [] }] */
	const workflows = await http.get('http://localhost:5678/api/v1/workflows', {
		auth: { type: 'bearer', credential: 'n8n API' },
	});

	const recent = workflows.filter(function (w) {
		return new Date(w.updatedAt) >= new Date(Date.now() - 86400000);
	});

	for (const wf of recent) {
		const filePath = config.path + '/' + wf.name + '.json';

		function sortKeys(obj) {
			return Object.keys(obj)
				.sort()
				.reduce(function (acc, k) {
					acc[k] = obj[k];
					return acc;
				}, {});
		}

		const wfJson = JSON.stringify(sortKeys(wf), null, 2);

		let existing = null;
		try {
			existing = await http.get(
				'https://api.github.com/repos/myuser/n8n-workflows/contents/' + filePath,
				{ auth: { type: 'bearer', credential: 'GitHub' } },
			);
		} catch {}

		if (!existing) {
			await http.put(
				'https://api.github.com/repos/myuser/n8n-workflows/contents/' + filePath,
				{ message: 'new', content: wfJson },
				{ auth: { type: 'bearer', credential: 'GitHub' } },
			);
		} else {
			if (wfJson !== existing.content) {
				await http.put(
					'https://api.github.com/repos/myuser/n8n-workflows/contents/' + filePath,
					{ message: 'updated', content: wfJson, sha: existing.sha },
					{ auth: { type: 'bearer', credential: 'GitHub' } },
				);
			}
		}
	}

	await http.post(
		'https://slack.com/api/chat.postMessage',
		{
			channel: '#notifications',
			text: 'Backup completed.',
		},
		{ auth: { type: 'bearer', credential: 'Slack' } },
	);
});
