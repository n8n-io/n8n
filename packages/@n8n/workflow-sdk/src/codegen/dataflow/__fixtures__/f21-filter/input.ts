workflow({ name: 'F21: Filter (.filter() to Filter node)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = items.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.httpRequest',
				params: { url: 'https://api.example.com/data' },
				version: 4,
			}),
		);
		const filter = hTTP_Request.filter((item) => item.json.status === 'active');
		const notify_Active = filter.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.httpRequest',
				name: 'Notify Active',
				params: { url: 'https://api.example.com/notify', method: 'POST' },
				version: 4,
			}),
		);
	});
});
