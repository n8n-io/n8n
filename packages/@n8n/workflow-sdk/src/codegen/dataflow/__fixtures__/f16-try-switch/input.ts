workflow({ name: 'F16: Try-switch (try/catch wrapping switch routing)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			params: { url: 'https://api.example.com/data' },
			version: 4,
		}).handleError((items) => {
			const error_Handler = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Error Handler',
				params: {},
				version: 3.4,
			});
		});
		hTTP_Request.route((item) => item.json.type, {
			email: (items) => {
				const send_Email = executeNode({
					type: 'n8n-nodes-base.emailSend',
					name: 'Send Email',
					params: { toEmail: 'user@example.com' },
					version: 2,
					output: [{}],
				});
			},
			sms: (items) => {
				const send_SMS = executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Send SMS',
					params: { url: 'https://sms.example.com/send', method: 'POST' },
					version: 4,
				});
			},
			default: (items) => {
				const log_Unknown = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Log Unknown',
					params: {},
					version: 3.4,
				});
			},
		});
	});
});
