workflow({ name: 'NixGuard Security Workflow' }, () => {
	const set_API_Key_Initial_Prompt1 = items.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Set API Key & Initial Prompt1',
			params: {
				values: {
					string: [
						{ name: 'apiKey', value: '' },
						{ name: 'chatInput', value: 'Scan this ip for me 0.0.0.0' },
					],
				},
				options: {},
			},
			version: 2,
		}),
	);
	const execute_NixGuard_Wazuh_Workflow = set_API_Key_Initial_Prompt1.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.executeWorkflow',
			name: 'Execute NixGuard & Wazuh Workflow',
			params: {
				options: {},
				workflowId: {
					__rl: true,
					mode: 'list',
					value: 'I0nUORqYTwDFZa51',
					cachedResultName:
						'Get Real-Time Security Insights with NixGuard RAG and Wazuh Integration',
				},
				workflowInputs: {
					value: {},
					schema: [],
					mappingMode: 'passThrough',
					matchingColumns: [],
					attemptToConvertTypes: false,
					convertFieldsToString: true,
				},
			},
			version: 1.2,
		}),
	);
	const format_NixGuard_AI_Summary_Wazuh_Insights = execute_NixGuard_Wazuh_Workflow.map((item) =>
		executeNode({
			type: 'n8n-nodes-base.set',
			name: 'Format NixGuard AI Summary & Wazuh Insights',
			params: {
				values: { string: [{ name: 'ai_summary', value: item.json.output }] },
				options: {},
			},
			version: 2,
		}),
	);
	const Optional_Send_Slack_Alert_for_High_Risk_Events =
		format_NixGuard_AI_Summary_Wazuh_Insights.map((item) =>
			executeNode({
				type: 'n8n-nodes-base.slack',
				name: '(Optional) Send Slack Alert for High-Risk Events',
				params: {
					text: expr('🚨 *NixGuard IP Analysis* 🚨\n\n*AI Summary:*\n{{ $json.ai_summary }}'),
					otherOptions: {},
					authentication: 'oAuth2',
				},
				version: 2,
			}),
		);
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: 'Webhook Trigger\n(REAL-WORLD USE)1',
			params: { path: 'my-analysis-webhook', options: {} },
			version: 1,
		},
		(items) => {},
	);
});
