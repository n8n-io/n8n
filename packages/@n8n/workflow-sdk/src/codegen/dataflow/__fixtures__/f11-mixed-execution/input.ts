workflow({ name: 'Mixed Execution' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const fetch_Users = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Fetch Users',
			params: { url: 'https://api.example.com/users' },
			version: 4,
		});
		const send_Email = fetch_Users.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.emailSend',
				name: 'Send Email',
				params: {
					toEmail: expr('{{ $json.email }}'),
					subject: 'Welcome',
					text: expr('{{ $json.name }}'),
				},
				version: 2,
			}),
		);
	});
});
