workflow({ name: 'F06: AI starter (Chat Trigger → Agent + OpenAI model)' }, () => {
	onTrigger(
		{
			type: 'n8n-nodes-base.webhook',
			name: 'Webhook',
			params: { path: 'chat', options: {}, httpMethod: 'POST' },
			version: 2,
		},
		(items) => {
			const agent = executeNode({
				type: '@n8n/n8n-nodes-langchain.agent',
				params: {
					promptType: 'define',
					text: items[0].json.chatInput,
					options: {
						systemMessage: 'You are a friendly assistant. Respond concisely and helpfully.',
					},
				},
				version: 3.1,
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						params: { options: {} },
						version: 1.3,
						name: 'OpenAI Model',
					}),
				},
			});
		},
	);
});
