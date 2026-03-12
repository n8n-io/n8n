workflow({ name: 'F28: Nested control flow (Switch with IF inside a case)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [{ orderType: 'express', isUrgent: true }],
		},
		(items) => {
			items.route((item) => item.json.orderType, {
				express: (items) => {
					items.branch(
						(item) => item.json.isUrgent,
						(items) => {
							const rush_Delivery = executeNode({
								type: 'n8n-nodes-base.httpRequest',
								name: 'Rush Delivery',
								params: { url: 'https://api.example.com/rush', method: 'POST' },
								version: 4,
							});
						},
						(items) => {
							const standard_Express = executeNode({
								type: 'n8n-nodes-base.set',
								name: 'Standard Express',
								params: {},
								version: 3.4,
							});
						},
					);
				},
				standard: (items) => {
					const standard_Delivery = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'Standard Delivery',
						params: {},
						version: 3.4,
					});
				},
				default: (items) => {
					const unknown_Order = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'Unknown Order',
						params: {},
						version: 3.4,
					});
				},
			});
		},
	);
});
