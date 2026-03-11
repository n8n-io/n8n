workflow({ name: 'Order Processing' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			sampleData: [{ orderType: 'express', isUrgent: true }],
		},
		(items) => {
			switch (items[0].json.orderType) {
				case 'express': {
					if (items[0].json.isUrgent) {
						const rush_Delivery = executeNode({
							type: 'n8n-nodes-base.httpRequest',
							name: 'Rush Delivery',
							params: { url: 'https://api.example.com/rush', method: 'POST' },
							version: 4,
						});
					} else {
						const standard_Express = executeNode({
							type: 'n8n-nodes-base.set',
							name: 'Standard Express',
							params: {},
							version: 3.4,
						});
					}
					break;
				}
				case 'standard': {
					const standard_Delivery = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'Standard Delivery',
						params: {},
						version: 3.4,
					});
					break;
				}
				default: {
					const unknown_Order = executeNode({
						type: 'n8n-nodes-base.set',
						name: 'Unknown Order',
						params: {},
						version: 3.4,
					});
					break;
				}
			}
		},
	);
});
