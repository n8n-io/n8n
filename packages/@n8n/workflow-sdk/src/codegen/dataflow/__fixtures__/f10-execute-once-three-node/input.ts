workflow({ name: 'Execute Once Three Node' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const fetch_Data = node({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch Data',
			params: { url: 'https://api.example.com/users' },
			version: 4,
		})();
		const transform = node({
			type: 'n8n-nodes-base.set',
			name: 'Transform',
			params: {
				assignments: {
					assignments: [
						{ id: '1', name: 'username', type: 'string', value: expr('{{ $json.name }}') },
					],
				},
			},
			version: 3.4,
		})();
		const send_Notification = node({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Send Notification',
			params: {
				url: 'https://hooks.example.com/notify',
				method: 'POST',
				sendBody: true,
				bodyParameters: {
					parameters: [{ name: 'user', value: expr('{{ $json.username }}') }],
				},
			},
			version: 4,
		})();
	});
});
