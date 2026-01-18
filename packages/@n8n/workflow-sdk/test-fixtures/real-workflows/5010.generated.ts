const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'Upload your data to test RAG',
					formFields: {
						values: [
							{
								fieldType: 'file',
								fieldLabel: 'Upload your file(s)',
								requiredField: true,
								acceptFileTypes: '.pdf, .csv',
							},
						],
					},
				},
				position: [220, -120],
				name: 'Upload your file here',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
			version: 1.2,
			config: {
				parameters: {
					mode: 'insert',
					memoryKey: {
						__rl: true,
						mode: 'list',
						value: 'vector_store_key',
						cachedResultName: 'vector_store_key',
					},
				},
				subnodes: {
					embedding: embedding({
						type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
						version: 1.2,
						config: {
							parameters: { options: {} },
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'Embeddings OpenAI',
						},
					}),
					documentLoader: documentLoader({
						type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
						version: 1.1,
						config: {
							parameters: { options: {}, dataType: 'binary' },
							name: 'Default Data Loader',
						},
					}),
				},
				position: [400, -120],
				name: 'Insert Data to Store',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [1060, -140],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: { options: {} },
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
							version: 1.2,
							config: {
								parameters: {
									mode: 'retrieve-as-tool',
									toolName: 'knowledge_base',
									memoryKey: { __rl: true, mode: 'list', value: 'vector_store_key' },
									toolDescription: 'Use this knowledge base to answer questions from the user',
								},
								subnodes: {
									embedding: embedding({
										type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
										version: 1.2,
										config: {
											parameters: { options: {} },
											credentials: {
												openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
											},
											name: 'Embeddings OpenAI',
										},
									}),
								},
								name: 'Query Data Tool',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							name: 'OpenAI Chat Model',
						},
					}),
				},
				position: [1280, -140],
				name: 'AI Agent',
			},
		}),
	)
	.add(
		sticky(
			'### Readme\nLoad your data into a vector database with the 📚 **Load Data** flow, and then use your data as chat context with the 🐕 **Retriever** flow.\n\n**Quick start**\n1. Click on the `Execute Workflow` button to run the 📚 **Load Data** flow.\n2. Click on `Open Chat` button to run the 🐕 **Retriever** flow. Then ask a question about content from your document(s)\n\n\nFor more info, check our [docs on RAG in n8n](https://docs.n8n.io/advanced-ai/rag-in-n8n/)',
			{ color: 4, position: [-320, -180], width: 440, height: 300 },
		),
	)
	.add(
		sticky('### 📚 Load Data Flow', {
			name: 'Sticky Note1',
			color: 7,
			position: [160, -180],
			width: 700,
			height: 460,
		}),
	)
	.add(
		sticky('### 🐕 2. Retriever Flow', {
			name: 'Sticky Note2',
			color: 7,
			position: [940, -180],
			width: 680,
			height: 460,
		}),
	)
	.add(
		sticky(
			'### Embeddings\n\nThe Insert and Retrieve operation use the same embedding node.\n\nThis is to ensure that they are using the **exact same embeddings and settings**.\n\nDifferent embeddings might not work at all, or have unintended consequences.\n',
			{ name: 'Sticky Note3', color: 4, position: [1000, 320], width: 320, height: 240 },
		),
	);
