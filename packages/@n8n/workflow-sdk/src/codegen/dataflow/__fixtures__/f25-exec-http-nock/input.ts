workflow({ name: 'F25: Execution with nock HTTP mocking (ManualTrigger → HTTP Request)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const fetch_Data = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch Data',
			params: { url: 'https://api.example.com/users', method: 'GET', options: {} },
			version: 4.2,
			output: [{ users: [{ name: 'Alice' }] }],
		});
	});
});
