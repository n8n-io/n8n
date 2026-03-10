workflow({ name: 'Three Node Chain' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = node({
			type: 'n8n-nodes-base.httpRequest',
			params: { url: 'https://example.com', method: 'POST' },
			version: 4,
		})(items);
		const set = node({
			type: 'n8n-nodes-base.set',
			params: { values: { string: [{ name: 'key', value: 'val' }] } },
			version: 3,
		})(hTTP_Request);
	});
});
