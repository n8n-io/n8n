workflow({ name: 'F03: IF branching (Trigger → IF → true/false)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [{ status: 'active' }],
		},
		(items) => {
			items.map((item) => {
				if (item.json.status === 'active') {
					const true_Branch = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'True Branch',
						params: {},
						version: 3.4,
					});
				} else {
					const false_Branch = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'False Branch',
						params: {},
						version: 3.4,
					});
				}
			});
		},
	);
});
