workflow({ name: 'F17: Multi-trigger (3 independent triggers)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: 'Orders Webhook',
			params: { path: '/orders', options: {} },
			version: 2,
			outputSampleData: [{ orderId: 'ORD-1' }],
		},
		(items) => {
			const process_Order = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Process Order',
				params: {},
				version: 3.4,
				output: [{ orderId: 'ORD-1', processed: true }],
			});
		},
	);
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: 'Returns Webhook',
			params: { path: '/returns', options: {} },
			version: 2,
			outputSampleData: [{ returnId: 'RET-1' }],
		},
		(items) => {
			const process_Return = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Process Return',
				params: {},
				version: 3.4,
				output: [{ returnId: 'RET-1', processed: true }],
			});
		},
	);
	onTrigger(
		{
			type: 'n8n-nodes-base.scheduleTrigger',
			name: 'Daily Cleanup',
			params: { rule: { interval: [{ field: 'days', betweenInterval: 1 }] } },
			version: 1.2,
			outputSampleData: [{}],
		},
		(items) => {
			const run_Cleanup = executeNode({
				type: 'n8n-nodes-base.httpRequest',
				name: 'Run Cleanup',
				params: { url: 'https://api.example.com/cleanup', method: 'POST' },
				version: 4,
			});
		},
	);
});
