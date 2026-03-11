workflow({ name: 'Filter With Discard' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			sampleData: [{ status: 'active', email: 'alice@example.com' }],
		},
		(items) => {
			const data = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					params: { url: 'https://api.example.com/users' },
					version: 4,
				}),
			);
			const [active, inactive] = data.filter((item) => item.json.status === 'active');
			const notify_Active = active.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Notify Active',
					params: { url: 'https://api.example.com/notify', method: 'POST' },
					version: 4,
				}),
			);
			const log_Inactive = inactive.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Log Inactive',
					params: { url: 'https://api.example.com/log', method: 'POST' },
					version: 4,
				}),
			);
		},
	);
});
