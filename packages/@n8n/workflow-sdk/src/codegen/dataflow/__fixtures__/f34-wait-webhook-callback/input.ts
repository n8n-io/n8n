workflow({ name: 'Wait Webhook Callback' }, () => {
	onTrigger(
		{ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1, sampleData: [{ id: 1 }] },
		(items) => {
			waitOnWebhook((resumeUrl) => {
				const notify_Service = executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Notify Service',
					params: {
						url: 'https://api.example.com/start',
						method: 'POST',
						body: { callback: resumeUrl },
					},
					version: 4,
				});
			});
			const process_Result = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Process Result',
				params: {},
				version: 3,
			});
		},
	);
});
