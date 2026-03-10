workflow({ name: 'Simple Chain' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = items.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.httpRequest',
				params: { url: 'https://example.com' },
				version: 4,
			}),
		);
	});
});
