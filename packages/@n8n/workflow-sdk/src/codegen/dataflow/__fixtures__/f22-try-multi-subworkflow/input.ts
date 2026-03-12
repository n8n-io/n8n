workflow(
	{ name: 'F22: Multi-node try/catch (wraps try-block in executeWorkflow sub-workflow)' },
	() => {
		onTrigger({ type: 'n8n-nodes-base.manualTrigger', params: {}, version: 1 }, (items) => {
			const execute_Workflow = executeNode({
				type: 'n8n-nodes-base.executeWorkflow',
				params: {
					source: 'parameter',
					workflowJson:
						'{"name":"Sub-workflow","nodes":[{"id":"sub-trigger","name":"Execute Workflow Trigger","type":"n8n-nodes-base.executeWorkflowTrigger","typeVersion":1.1,"position":[0,0],"parameters":{}},{"id":"node-1","name":"HTTP Request","type":"n8n-nodes-base.httpRequest","typeVersion":4,"position":[200,0],"parameters":{"url":"https://api.example.com"}},{"id":"node-2","name":"Transform","type":"n8n-nodes-base.set","typeVersion":3.4,"position":[400,0],"parameters":{}}],"connections":{"Execute Workflow Trigger":{"main":[[{"node":"HTTP Request","type":"main","index":0}]]},"HTTP Request":{"main":[[{"node":"Transform","type":"main","index":0}]]}}}',
					options: {},
				},
				version: 1.3,
			}).handleError((items) => {
				const error_Handler = executeNode({
					type: 'n8n-nodes-base.set',
					name: 'Error Handler',
					params: {},
					version: 3.4,
				});
			});
		});
	},
);
