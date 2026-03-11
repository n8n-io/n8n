workflow({ name: 'For Of Loop' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const data = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			params: { url: 'https://api.example.com/items' },
			version: 4,
		});
		batch(data, (item) => {
			const process_Item = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Process Item',
				params: {},
				version: 3,
			});
		});
	});
});
