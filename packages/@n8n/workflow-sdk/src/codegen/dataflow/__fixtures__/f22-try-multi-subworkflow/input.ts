workflow({ name: 'Multi Node Error Handling' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		try {
			const hTTP_Request = executeNode({
				type: 'n8n-nodes-base.httpRequest',
				params: { url: 'https://api.example.com' },
				version: 4,
			});
			const transform = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Transform',
				params: {},
				version: 3,
			});
		} catch (e) {
			const error_Handler = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Error Handler',
				params: {},
				version: 3,
			});
		}
	});
});
