workflow({ name: 'Pin Data Test' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const set_Values = executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Set Values',
			params: {
				assignments: {
					assignments: [{ id: 'assign_0', name: 'greeting', type: 'string', value: 'hello' }],
				},
				options: {},
			},
			version: 3.4,
		});
		const format_Output = executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Format Output',
			params: {
				assignments: {
					assignments: [
						{ id: 'assign_0', name: 'message', type: 'string', value: set_Values.json.greeting },
					],
				},
				options: {},
			},
			version: 3.4,
		});
	});
});
