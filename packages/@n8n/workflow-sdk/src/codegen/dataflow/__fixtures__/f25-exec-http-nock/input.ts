workflow({ name: 'HTTP Nock Test' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const fetch_Data = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch Data',
			params: { url: 'https://api.example.com/users', method: 'GET', options: {} },
			version: 4.2,
			sampleData: [{ users: [{ name: 'Alice' }] }],
		});
	});
});
