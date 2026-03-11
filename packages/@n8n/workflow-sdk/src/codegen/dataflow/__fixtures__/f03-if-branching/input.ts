workflow({ name: 'IF Workflow' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			sampleData: [{ status: 'active' }],
		},
		(items) => {
			if (items[0].json.status === 'active') {
				const true_Branch = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'True Branch',
					params: {},
					version: 3,
				});
			} else {
				const false_Branch = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'False Branch',
					params: {},
					version: 3,
				});
			}
		},
	);
});
