export const sampleWorkflow = {
	name: 'Order fulfillment',
	nodes: [
		{ name: 'Order webhook', type: 'n8n-nodes-base.webhook', position: [0, 240] },
		{ name: 'Validate order', type: 'n8n-nodes-base.code', position: [240, 240] },
		{ name: 'In stock?', type: 'n8n-nodes-base.if', position: [480, 240] },
		{ name: 'Reserve stock', type: 'n8n-nodes-base.postgres', position: [720, 80] },
		{ name: 'Notify warehouse', type: 'n8n-nodes-base.slack', position: [960, 80] },
		{ name: 'Wait for stock', type: 'n8n-nodes-base.wait', position: [720, 400] },
		{ name: 'Email customer', type: 'n8n-nodes-base.gmail', position: [960, 400] },
		{ name: 'Merge status', type: 'n8n-nodes-base.merge', position: [1200, 240] },
		{ name: 'Update order', type: 'n8n-nodes-base.httpRequest', position: [1440, 240] },
	],
	connections: {
		'Order webhook': { main: [[{ node: 'Validate order', type: 'main', index: 0 }]] },
		'Validate order': { main: [[{ node: 'In stock?', type: 'main', index: 0 }]] },
		'In stock?': {
			main: [
				[{ node: 'Reserve stock', type: 'main', index: 0 }],
				[{ node: 'Wait for stock', type: 'main', index: 0 }],
			],
		},
		'Reserve stock': { main: [[{ node: 'Notify warehouse', type: 'main', index: 0 }]] },
		'Wait for stock': { main: [[{ node: 'Email customer', type: 'main', index: 0 }]] },
		'Notify warehouse': { main: [[{ node: 'Merge status', type: 'main', index: 0 }]] },
		'Email customer': { main: [[{ node: 'Merge status', type: 'main', index: 1 }]] },
		'Merge status': { main: [[{ node: 'Update order', type: 'main', index: 0 }]] },
	},
};
