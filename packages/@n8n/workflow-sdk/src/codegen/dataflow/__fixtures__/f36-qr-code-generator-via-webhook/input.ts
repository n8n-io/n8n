workflow({ name: 'QR Code Generator via Webhook' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: 'Receive Data Webhook',
			params: {
				path: 'generate-qr',
				options: {},
				httpMethod: 'POST',
				responseMode: 'responseNode',
			},
			version: 2,
		},
		(items) => {
			const generate_QR_Code = items.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Generate QR Code',
					params: {
						url: expr(
							'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={{ $json.body.data }}',
						),
						method: expr('GET'),
						options: {},
					},
					version: 4.2,
				}),
			);
			const respond_with_QR_Code = generate_QR_Code.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.respondToWebhook',
					name: 'Respond with QR Code',
					params: { options: {}, respondWith: 'allIncomingItems' },
					version: 1.2,
				}),
			);
		},
	);
});
