workflow({ name: 'Multi Condition Notification' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			sampleData: [{ status: 'active', priority: 8 }],
		},
		(items) => {
			if (items[0].json.status === 'active' && items[0].json.priority > 5) {
				const send_Notification = executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Send Notification',
					params: { url: 'https://api.example.com/notify', method: 'POST' },
					version: 4,
				});
			} else {
				const skip_Notification = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Skip Notification',
					params: {},
					version: 3,
				});
			}
		},
	);
});
