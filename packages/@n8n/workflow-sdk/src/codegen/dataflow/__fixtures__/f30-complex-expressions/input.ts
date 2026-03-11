import { $now } from 'n8n';

workflow({ name: 'F30: Complex expressions ($now, variable refs in params)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [{ baseUrl: 'https://api.example.com', id: '42', name: 'Test' }],
		},
		(items) => {
			const hTTP_Request = executeNode({
				type: 'n8n-nodes-base.httpRequest',
				params: {
					url: `${items.json.baseUrl}/config`,
					sendHeaders: true,
					headerParameters: { parameters: [{ name: 'X-Timestamp', value: $now.toISO() }] },
				},
				version: 4,
			});
			const update_Record = hTTP_Request.map((item) =>
				executeNode({
					type: 'n8n-nodes-base.httpRequest',
					name: 'Update Record',
					params: {
						url: `https://api.example.com/records/${item.json.id}`,
						method: 'PUT',
						sendBody: true,
						bodyParameters: {
							parameters: [
								{ name: 'name', value: item.json.name },
								{ name: 'updatedAt', value: $now.toISO() },
							],
						},
					},
					version: 4,
				}),
			);
		},
	);
});
