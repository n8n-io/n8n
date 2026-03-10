workflow({ name: 'API fundamentals' }, () => {
	onTrigger(
		{ type: 'n8n-nodes-base.manualTrigger', name: 'Start Tutorial', params: {}, version: 1 },
		(items) => {
			const CONFIGURATION = executeNode({
				type: 'n8n-nodes-base.set',
				name: '⚙️CONFIGURATION⚙️',
				params: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '7edededc-2f40-4b8e-b8db-ab4816f1a28e',
								name: 'your_n8n_webhook_url',
								type: 'string',
								value: 'PASTE_YOUR_WEBHOOK_URL_HERE',
							},
						],
					},
				},
				version: 3.4,
			});
			const base_URL = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Base URL',
				params: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '7edededc-2f40-4b8e-b8db-ab4816f1a28e',
								name: 'base_url',
								type: 'string',
								value: expr(
									"{{ $json.your_n8n_webhook_url.match(/^(https?:\\/\\/[^\\/]+)\\/(webhook-test|webhook|v1|[^\\/]+)/)[1] + '/' + $json.your_n8n_webhook_url.match(/^(https?:\\/\\/[^\\/]+)\\/(webhook-test|webhook|v1|[^\\/]+)/)[2].replace('webhook-test','webhook') }}",
								),
							},
						],
					},
				},
				version: 3.4,
			});
			const _1_The_Customer_GET_Menu_Item = base_URL.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: '1. The Customer (GET Menu Item)',
					params: { url: expr('{{ $json.base_url }}/tutorial/api/menu'), options: {} },
					version: 4.1,
				}),
			);
			const _2_The_Customer_GET_with_Query_Params = base_URL.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: '2. The Customer (GET with Query Params)',
					params: {
						url: expr('{{ $json.base_url }}/tutorial/api/order'),
						options: {},
						sendQuery: true,
						queryParameters: { parameters: [{ name: 'extra_cheese', value: 'true' }] },
					},
					version: 4.1,
				}),
			);
			const _3_The_Customer_POST_with_Body = base_URL.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: '3. The Customer (POST with Body)',
					params: {
						url: expr('{{ $json.base_url }}/tutorial/api/review'),
						method: 'POST',
						options: {},
						sendBody: true,
						bodyParameters: {
							parameters: [
								{ name: 'comment', value: 'The pizza was amazing!' },
								{ name: 'rating', value: 5 },
							],
						},
					},
					version: 4.1,
				}),
			);
			const _4_The_Customer_GET_with_Headers_Auth = base_URL.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: '4. The Customer (GET with Headers/Auth)',
					params: {
						url: expr('{{ $json.base_url }}/tutorial/api/secret-dish'),
						options: {},
						sendHeaders: true,
						headerParameters: { parameters: [{ name: 'x-api-key', value: 'super-secret-key' }] },
					},
					version: 4.1,
				}),
			);
			const _5_The_Customer_Request_with_Timeout = base_URL.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: '5. The Customer (Request with Timeout)',
					params: {
						url: expr('{{ $json.base_url }}/tutorial/api/slow-service'),
						options: { timeout: 2000 },
					},
					version: 4.1,
				}),
			);
		},
	);
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: '1. The Kitchen (GET /menu)',
			params: { path: '/tutorial/api/menu', options: {}, responseMode: 'lastNode' },
			version: 2,
		},
		(items) => {
			const prepare_Menu_Data = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Prepare Menu Data',
				params: {
					options: {},
					assignments: {
						assignments: [
							{ id: '12345', name: 'item', type: 'string', value: 'Pizza' },
							{ id: '67890', name: 'price', type: 'number', value: 12 },
						],
					},
				},
				version: 3.4,
			});
		},
	);
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: '2. The Kitchen (GET /order)',
			params: { path: '/tutorial/api/order', options: {}, responseMode: 'lastNode' },
			version: 2,
		},
		(items) => {
			if (items[0].json.query.extra_cheese) {
				const prepare_Cheese_Pizza = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Prepare Cheese Pizza',
					params: {
						options: {},
						assignments: {
							assignments: [
								{ id: '12345', name: 'order', type: 'string', value: 'Pizza with extra cheese' },
							],
						},
					},
					version: 3.4,
				});
			} else {
				const prepare_Plain_Pizza = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Prepare Plain Pizza',
					params: {
						options: {},
						assignments: {
							assignments: [{ id: '12345', name: 'order', type: 'string', value: 'Plain Pizza' }],
						},
					},
					version: 3.4,
				});
			}
		},
	);
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: '3. The Kitchen (POST /review)',
			params: {
				path: '/tutorial/api/review',
				options: {},
				httpMethod: 'POST',
				responseMode: 'lastNode',
			},
			version: 2,
		},
		(items) => {
			const process_Review_Data = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Process Review Data',
				params: {
					options: {},
					assignments: {
						assignments: [
							{ id: '12345', name: 'status', type: 'string', value: 'review_received' },
							{
								id: '67890',
								name: 'your_comment',
								type: 'string',
								value: expr('{{ $json.body.comment }}'),
							},
							{
								id: '91011',
								name: 'your_rating',
								type: 'number',
								value: expr('{{ $json.body.rating }}'),
							},
						],
					},
				},
				version: 3.4,
			});
		},
	);
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: '4. The Kitchen (GET /secret-dish)',
			params: { path: '/tutorial/api/secret-dish', options: {}, responseMode: 'responseNode' },
			version: 2,
		},
		(items) => {
			if (items[0].json.headers['x-api-key'] === 'super-secret-key') {
				const respond_with_Secret = executeNode({
					type: 'n8n-nodes-base.respondToWebhook',
					name: 'Respond with Secret',
					params: {
						options: {},
						respondWith: 'json',
						responseBody: '{\n  "dish": "The Chef\'s Special Truffle Pasta"\n}',
					},
					version: 1.4,
				});
			} else {
				const respond_Unauthorized_401 = executeNode({
					type: 'n8n-nodes-base.respondToWebhook',
					name: 'Respond: Unauthorized (401)',
					params: {
						options: { responseCode: 401 },
						respondWith: 'text',
						responseBody: 'You are not authorized to see the secret dish.',
					},
					version: 1.4,
				});
			}
		},
	);
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: '5. The Kitchen (GET /slow-service)',
			params: { path: '/tutorial/api/slow-service', options: {}, responseMode: 'lastNode' },
			version: 2,
		},
		(items) => {
			const wait_3_seconds = executeNode({
				type: 'n8n-nodes-base.wait',
				name: 'Wait 3 seconds',
				params: { amount: 3 },
				version: 1.1,
			});
			const prepare_Slow_Response = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Prepare Slow Response',
				params: {
					options: {},
					assignments: {
						assignments: [
							{ id: '12345', name: 'status', type: 'string', value: 'Finally, your food is here!' },
						],
					},
				},
				version: 3.4,
			});
		},
	);
});
