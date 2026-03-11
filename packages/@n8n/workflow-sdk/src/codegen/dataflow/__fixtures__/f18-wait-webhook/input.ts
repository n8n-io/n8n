workflow({ name: 'Wait Webhook' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		waitOnWebhook(() => {
			const start_Request = executeNode({
				type: 'n8n-nodes-base.httpRequest',
				name: 'Start Request',
				params: { url: 'https://api.example.com/start', method: 'POST' },
				version: 4,
			});
		});
		const after_Resume = executeNode({
			type: 'n8n-nodes-base.set',
			name: 'After Resume',
			params: {},
			version: 3.4,
		});
	});
});
