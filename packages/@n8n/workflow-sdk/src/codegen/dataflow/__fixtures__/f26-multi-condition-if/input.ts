workflow(
	{ name: 'F26: Multi-condition IF (AND combinator — status active AND priority > 5)' },
	() => {
		onTrigger(
			{
				type: 'n8n-nodes-base.manualTrigger',
				params: {},
				version: 1,
				outputSampleData: [{ status: 'active', priority: 8 }],
			},
			(items) => {
				items.branch(
					(item) => item.json.status === 'active' && item.json.priority > 5,
					(items) => {
						const send_Notification = executeNode({
							type: 'n8n-nodes-base.httpRequest',
							name: 'Send Notification',
							params: { url: 'https://api.example.com/notify', method: 'POST' },
							version: 4,
						});
					},
					(items) => {
						const skip_Notification = executeNode({
							type: 'n8n-nodes-base.set',
							name: 'Skip Notification',
							params: {},
							version: 3.4,
						});
					},
				);
			},
		);
	},
);
