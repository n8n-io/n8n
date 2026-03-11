workflow({ name: 'Complex Expressions' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const fetch_Config = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			params: {
				url: expr('{{ $json.baseUrl + "/config" }}'),
				authentication: 'genericCredentialType',
				genericAuthType: 'httpHeaderAuth',
				sendHeaders: true,
				headerParameters: {
					parameters: [{ name: 'X-Timestamp', value: expr('{{ $now.toISO() }}') }],
				},
			},
			version: 4,
		});
		const update_Record = fetch_Config.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.httpRequest',
				name: 'Update Record',
				params: {
					url: expr('{{ $env.API_BASE_URL + "/records/" + $json.id }}'),
					method: 'PUT',
					sendBody: true,
					bodyParameters: {
						parameters: [
							{ name: 'name', value: item.json.name },
							{ name: 'updatedAt', value: expr('{{ $now.toISO() }}') },
						],
					},
				},
				version: 4,
			}),
		);
	});
});
