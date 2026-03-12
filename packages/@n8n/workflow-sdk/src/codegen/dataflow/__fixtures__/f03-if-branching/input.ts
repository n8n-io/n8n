workflow({ name: 'F03: IF branching (Trigger → IF → true/false)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [{ status: 'active' }],
		},
		(items) => {
			items.branch(
				(item) => item.json.status === 'active',
				(items) => {
					const true_Branch = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'True Branch',
						params: {
							assignments: {
								assignments: [{ id: 'a1', name: 'result', type: 'string', value: 'active-path' }],
							},
						},
						version: 3.4,
					});
				},
				(items) => {
					const false_Branch = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'False Branch',
						params: {
							assignments: {
								assignments: [{ id: 'a2', name: 'result', type: 'string', value: 'inactive-path' }],
							},
						},
						version: 3.4,
					});
				},
			);
		},
	);
});
