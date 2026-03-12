workflow({ name: 'F10: Execute-once three-node chain (Fetch → Transform → Send)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const fetch_Data = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch Data',
			params: { url: 'https://api.example.com/users' },
			version: 4,
		});
		const transform = executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Transform',
			params: {
				assignments: {
					assignments: [
						{ id: '1', name: 'username', type: 'string', value: fetch_Data[0].json.name },
					],
				},
			},
			version: 3.4,
		});
		const send_Notification = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Send Notification',
			params: {
				url: 'https://hooks.example.com/notify',
				method: 'POST',
				sendBody: true,
				bodyParameters: { parameters: [{ name: 'user', value: transform[0].json.username }] },
			},
			version: 4,
		});
	});
});
