const wf = workflow('L9nteAq0NLYqIGxH', 'RAG Pipeline', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'Add your file here',
					formFields: {
						values: [
							{
								fieldType: 'file',
								fieldLabel: 'File',
								requiredField: true,
								acceptFileTypes: '.pdf',
							},
						],
					},
				},
				name: 'On form submission',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreQdrant',
			version: 1.2,
			config: {
				parameters: {
					mode: 'insert',
					options: {},
					qdrantCollection: { __rl: true, mode: 'id', value: 'rag_collection' },
				},
				credentials: {
					qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' },
				},
				position: [220, 0],
				name: 'Qdrant Vector Store',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [940, -20],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					options: {
						systemMessage:
							'You are a helpful assistant. You have access to a tool to retrieve data from a semantic database to answer questions. Always provide arguments when you execute the tool',
					},
				},
				position: [1220, -20],
				name: 'AI Agent',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.embeddingsOllama',
			version: 1,
			config: {
				parameters: { model: 'mxbai-embed-large:latest' },
				credentials: {
					ollamaApi: { id: 'credential-id', name: 'ollamaApi Credential' },
				},
				position: [60, 220],
				name: 'Embeddings Ollama',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
			version: 1,
			config: {
				parameters: { options: {}, chunkSize: 200, chunkOverlap: 50 },
				position: [460, 440],
				name: 'Recursive Character Text Splitter',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
			version: 1,
			config: {
				parameters: { options: {}, dataType: 'binary' },
				position: [360, 220],
				name: 'Default Data Loader',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOllama',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					ollamaApi: { id: 'credential-id', name: 'ollamaApi Credential' },
				},
				position: [1060, 220],
				name: 'Ollama Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: { position: [1260, 220], name: 'Simple Memory' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.embeddingsOllama',
			version: 1,
			config: {
				parameters: { model: 'mxbai-embed-large:latest' },
				credentials: {
					ollamaApi: { id: 'credential-id', name: 'ollamaApi Credential' },
				},
				position: [1460, 440],
				name: 'Embeddings Ollama1',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreQdrant',
			version: 1.2,
			config: {
				parameters: {
					mode: 'retrieve-as-tool',
					options: {},
					toolName: 'retriever',
					toolDescription: 'Retrieve data from a semantic database to answer questions',
					qdrantCollection: { __rl: true, mode: 'id', value: 'rag_collection' },
				},
				credentials: {
					qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' },
				},
				position: [1540, 240],
				name: 'Qdrant Vector Store1',
			},
		}),
	)
	.add(
		sticky('## Data Ingestion\n**Add data to the semantic database', {
			color: 3,
			position: [-140, -100],
			width: 840,
			height: 700,
		}),
	)
	.add(
		sticky('## RAG Chatbot\n**Chat with your data', {
			name: 'Sticky Note1',
			color: 4,
			position: [740, -100],
			width: 1200,
			height: 700,
		}),
	);
