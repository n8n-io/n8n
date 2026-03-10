workflow({ name: 'Filter Workflow' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const data = items.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.httpRequest',
				params: { url: 'https://api.example.com/data' },
				version: 4,
			}),
		);
		const active = data.filter((item) => item.json.status === 'active');
		const notify_Active = active.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.httpRequest',
				name: 'Notify Active',
				params: { url: 'https://api.example.com/notify', method: 'POST' },
				version: 4,
			}),
		);
	});
});
