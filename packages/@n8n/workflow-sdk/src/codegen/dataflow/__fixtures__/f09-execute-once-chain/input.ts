workflow({ name: 'Execute Once Chain' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = node({
			type: 'n8n-nodes-base.httpRequest',
			params: { url: 'https://api.example.com/config' },
			version: 4,
		})();
		const set = node({
			type: 'n8n-nodes-base.set',
			params: { values: { string: [{ name: 'processed', value: 'true' }] } },
			version: 3,
		})();
	});
});
