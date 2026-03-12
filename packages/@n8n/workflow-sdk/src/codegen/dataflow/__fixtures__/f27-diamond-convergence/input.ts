workflow({ name: 'F27: Diamond convergence (IF → branches → Merge → continuation)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [{ tier: 'premium' }],
		},
		(items) => {
			items.branch(
				(item) => item.json.tier === 'premium',
				(items) => {
					const fetch_Premium = executeNode({
						type: 'n8n-nodes-base.httpRequest',
						name: 'Fetch Premium',
						params: { url: 'https://api.example.com/premium' },
						version: 4,
					});
				},
				(items) => {
					const fetch_Basic = executeNode({
						type: 'n8n-nodes-base.httpRequest',
						name: 'Fetch Basic',
						params: { url: 'https://api.example.com/basic' },
						version: 4,
					});
				},
			);
		},
	);
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
});
