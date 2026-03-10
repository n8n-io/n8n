workflow({ name: 'Do While Poll' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		do {
			const status = executeNode({
				type: 'n8n-nodes-base.httpRequest',
				name: 'Check Status',
				params: { url: 'https://api.example.com/status' },
				version: 4,
			});
		} while (status.json.statusCode !== 200);
	});
});
