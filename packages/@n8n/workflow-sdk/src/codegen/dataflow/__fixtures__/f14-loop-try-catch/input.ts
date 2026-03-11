workflow({ name: 'F14: Loop with try-catch (SplitInBatches + error handling)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const hTTP_Request = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			params: { url: 'https://api.example.com/users' },
			version: 4,
		});
		batch(hTTP_Request, (item) => {
			try {
				const send_Email = executeNode({
					type: 'n8n-nodes-base.emailSend',
					name: 'Send Email',
					params: { toEmail: 'user@example.com' },
					version: 2,
					output: [{}],
				});
			} catch (e) {
				const log_Error = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Log Error',
					params: {},
					version: 3.4,
				});
			}
		});
		const summary = executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Summary',
			params: {},
			version: 3.4,
		});
	});
});
