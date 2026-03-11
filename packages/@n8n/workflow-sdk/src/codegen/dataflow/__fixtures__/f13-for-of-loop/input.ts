workflow({ name: 'F13: For-of loop (SplitInBatches pattern)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			params: { url: 'https://api.example.com/items' },
			version: 4,
		});
		batch(hTTP_Request, (item) => {
			const process_Item = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Process Item',
				params: {},
				version: 3.4,
			});
		});
	});
});
