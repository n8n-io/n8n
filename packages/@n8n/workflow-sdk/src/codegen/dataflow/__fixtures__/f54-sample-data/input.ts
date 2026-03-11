workflow({ name: 'F54: Sample data on trigger and nodes (ManualTrigger → HTTP → Set)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.manualTrigger',
			params: {},
			version: 1,
			outputSampleData: [{ userId: 42, name: 'Alice' }],
		},
		(items) => {
			const fetch_Profile = executeNode({
				type: 'n8n-nodes-base.httpRequest',
				name: 'Fetch Profile',
				params: { url: 'https://api.example.com/profile', method: 'GET' },
				version: 4,
				output: [{ userId: 42, name: 'Alice', email: 'alice@example.com' }],
			});
			const format_Result = executeNode({
				type: 'n8n-nodes-base.set',
				name: 'Format Result',
				params: {
					assignments: {
						assignments: [
							{ id: 'assign_0', name: 'summary', type: 'string', value: fetch_Profile.json.name },
						],
					},
					options: {},
				},
				version: 3.4,
				output: [{ summary: 'Alice' }],
			});
		},
	);
});
