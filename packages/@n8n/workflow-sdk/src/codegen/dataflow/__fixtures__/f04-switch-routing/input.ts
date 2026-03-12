workflow({ name: 'F04: Switch routing (Trigger → Switch → 3 cases + default)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [{ destination: 'London' }],
		},
		(items) => {
			items.route((item) => item.json.destination, {
				London: (items) => {
					const london_Handler = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'London Handler',
						params: {
							assignments: {
								assignments: [{ id: 'a1', name: 'city', type: 'string', value: 'London' }],
							},
						},
						version: 3.4,
					});
				},
				'New York': (items) => {
					const new_York_Handler = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'New York Handler',
						params: {
							assignments: {
								assignments: [{ id: 'a2', name: 'city', type: 'string', value: 'New York' }],
							},
						},
						version: 3.4,
					});
				},
				default: (items) => {
					const default_Handler = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'Default Handler',
						params: {
							assignments: {
								assignments: [{ id: 'a3', name: 'city', type: 'string', value: 'unknown' }],
							},
						},
						version: 3.4,
					});
				},
			});
		},
	);
});
