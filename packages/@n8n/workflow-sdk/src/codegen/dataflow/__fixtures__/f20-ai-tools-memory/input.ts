workflow({ name: 'AI Agent with Tools' }, () => {
	onTrigger(
		{
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			name: 'When chat message received',
			params: { options: {} },
			version: 1.4,
		},
		(items) => {
			const agent = executeNode({
				type: '@n8n/n8n-nodes-langchain.agent',
				params: {
					promptType: 'define',
					text: 'Help the user with their request',
					options: { systemMessage: 'You are a helpful assistant.' },
				},
				version: 3.1,
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						params: { model: 'gpt-4o', options: {} },
						version: 1.3,
					}),
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
							name: 'API Request',
							params: { url: 'https://api.example.com' },
							version: 1.1,
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolCode',
							name: 'Custom Code',
							params: { code: 'return []' },
							version: 1.3,
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						params: { contextWindowLength: 5 },
						version: 1.3,
					}),
				},
			});
		},
	);
});
