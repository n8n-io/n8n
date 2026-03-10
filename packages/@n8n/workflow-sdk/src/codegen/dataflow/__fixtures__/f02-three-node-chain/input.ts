workflow({ name: 'Three Node Chain' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = items.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.httpRequest',
				params: { url: 'https://example.com', method: 'POST' },
				version: 4,
			}),
		);
		const set = hTTP_Request.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.set',
				params: { values: { string: [{ name: 'key', value: 'val' }] } },
				version: 3,
			}),
		);
	});
});
