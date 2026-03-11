workflow({ name: 'Loop Try Catch' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const users = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			params: { url: 'https://api.example.com/users' },
			version: 4,
		});
		batch(users, (user) => {
			try {
				const send_Email = executeNode({
					type: 'n8n-nodes-base.emailSend',
					name: 'Send Email',
					params: { toEmail: 'user@example.com' },
					version: 2,
				});
			} catch (e) {
				const log_Error = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Log Error',
					params: {},
					version: 3,
				});
			}
		});
		const summary = executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Summary',
			params: {},
			version: 3,
		});
	});
});
