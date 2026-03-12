workflow({ name: 'F24: Execution with pin data only (ManualTrigger → Set → Set)' }, () => {
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
			output: [{ greeting: 'hello' }],
		});
		const format_Output = executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Format Output',
			params: {
				assignments: {
					assignments: [
						{ id: 'assign_0', name: 'message', type: 'string', value: set_Values[0].json.greeting },
					],
				},
				options: {},
			},
			version: 3.4,
			output: [{ message: 'hello' }],
		});
	});
});
