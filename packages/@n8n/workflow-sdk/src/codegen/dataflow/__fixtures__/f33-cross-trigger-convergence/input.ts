workflow({ name: 'Cross Trigger' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: 'Orders Webhook',
			params: { path: '/orders', options: {} },
			version: 2,
			sampleData: [{ source: 'webhook', data: 'order-123' }],
		},
		(items) => {
			const process_Data = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Process Data',
					params: { url: 'https://api.example.com/process', method: 'POST' },
					version: 4,
				}),
			);
		},
	);
	onTrigger(
		{
			type: 'n8n-nodes-base.scheduleTrigger',
			name: 'Hourly Check',
			params: { rule: { interval: [{ field: 'hours', betweenInterval: 1 }] } },
			version: 1.2,
			sampleData: [{ source: 'schedule' }],
		},
		(items) => {
			const process_Data = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Process Data',
					params: { url: 'https://api.example.com/process', method: 'POST' },
					version: 4,
				}),
			);
		},
	);
});
