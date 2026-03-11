workflow({ name: 'F09: Execute-once chain (ManualTrigger → HTTP Request → Set)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			params: { url: 'https://api.example.com/config' },
			version: 4,
		});
		const set = executeNode({
			type: 'n8n-nodes-base.set',
			params: {
				options: {},
				assignments: {
					assignments: [{ id: 'a1', name: 'processed', type: 'string', value: 'true' }],
				},
			},
			version: 3.4,
		});
	});
});
