workflow({ name: 'Diamond Convergence' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			sampleData: [{ tier: 'premium' }],
		},
		(items) => {
			if (items[0].json.tier === 'premium') {
				const fetch_Premium = executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Fetch Premium',
					params: { url: 'https://api.example.com/premium' },
					version: 4,
				});
			} else {
				const fetch_Basic = executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Fetch Basic',
					params: { url: 'https://api.example.com/basic' },
					version: 4,
				});
			}
			const merge_node = executeNode(
				{
					type: 'n8n-nodes-base.merge',
					params: { mode: 'combine', combineBy: 'combineByPosition' },
					version: 3,
				},
				[fetch_Premium, fetch_Basic],
			);
			const send_Notification = merge_node.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Send Notification',
					params: { url: 'https://api.example.com/notify', method: 'POST' },
					version: 4,
				}),
			);
		},
	);
});
