workflow({ name: 'F19: Sub-workflow (execute child workflow)' }, () => {
	onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
		const generate_Report = executeNode({
			type: 'n8n-nodes-base.executeWorkflow',
			name: 'Generate Report',
			params: { workflowId: 'abc123' },
			version: 1,
			output: [{ reportData: 'Monthly Summary' }],
		});
		const send_Report = executeNode({
			type: 'n8n-nodes-base.httpRequest',
			name: 'Send Report',
			params: { url: 'https://api.example.com/reports', method: 'POST' },
			version: 4,
		});
	});
});
