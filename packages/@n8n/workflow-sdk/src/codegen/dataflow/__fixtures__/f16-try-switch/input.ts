workflow({ name: 'Try Switch' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		try {
			const fetch_Data = executeNode({
				type: 'n8n-nodes-base.httpRequest',
				params: { url: 'https://api.example.com/data' },
				version: 4,
			});
		} catch (e) {
			const error_Handler = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Error Handler',
				params: {},
				version: 3.4,
			});
		}
		switch (items[0].json.type) {
			case 'email': {
				const send_Email = executeNode({
					type: 'n8n-nodes-base.emailSend',
					name: 'Send Email',
					params: { toEmail: 'user@example.com' },
					version: 2,
					sampleData: [{}],
				});
				break;
			}
			case 'sms': {
				const send_SMS = executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Send SMS',
					params: { url: 'https://sms.example.com/send', method: 'POST' },
					version: 4,
				});
				break;
			}
			default: {
				const log_Unknown = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Log Unknown',
					params: {},
					version: 3.4,
				});
				break;
			}
		}
	});
});
