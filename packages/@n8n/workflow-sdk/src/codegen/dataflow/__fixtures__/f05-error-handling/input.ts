workflow({ name: 'F05: Error handling (Trigger → HTTP with onError → error handler)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			params: { url: 'https://api.example.com' },
			version: 4,
		}).handleError((items) => {
			const error_Handler = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Error Handler',
				params: {},
				version: 3.4,
			});
		});
	});
});
