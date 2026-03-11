workflow({ name: 'F15: Batch poll (SplitInBatches pattern)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		batch(items, (item) => {
			const check_Status = executeNode({
				type: 'n8n-nodes-base.httpRequest',
				name: 'Check Status',
				params: { url: 'https://api.example.com/status' },
				version: 4,
			});
		});
	});
});
