const wf = workflow('DMhzwW0cXxIdPi3r', 'Template Supabase Postgres', { executionOrder: 'v1' })
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: { position: [-208, 336], name: 'When chat message received' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
						version: 1.3,
						config: { name: 'Your Chat Memory' },
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: { name: 'OpenAI Chat Model' },
					}),
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
							version: 1,
							config: {
								subnodes: {
									embedding: embedding({
										type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
										version: 1.2,
										config: { name: 'Embeddings OpenAI' },
									}),
								},
								name: 'Retrieve and push documents',
							},
						}),
					],
				},
				position: [48, 128],
				name: 'RAG AI Assistant',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-208, 992], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { position: [16, 992] } }))
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
			version: 1,
			config: {
				subnodes: {
					embedding: embedding({
						type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
						version: 1.2,
						config: { name: 'Embeddings OpenAI1' },
					}),
					documentLoader: documentLoader({
						type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
						version: 1,
						config: {
							subnodes: {
								textSplitter: textSplitter({
									type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
									version: 1,
									config: { name: 'Recursive Character Text Splitter' },
								}),
							},
							name: 'Default Data Loader',
						},
					}),
				},
				position: [256, 992],
				name: 'Storing documents',
			},
		}),
	)
	.add(sticky('', { position: [-64, 848] }))
	.add(sticky('', { name: 'Sticky Note1', position: [224, 848] }))
	.add(sticky('', { name: 'Sticky Note2', position: [432, 208] }))
	.add(sticky('', { name: 'Sticky Note3', position: [96, 320] }));
