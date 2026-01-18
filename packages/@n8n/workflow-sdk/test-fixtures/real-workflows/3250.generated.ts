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
			config: { position: [48, 128], name: 'RAG AI Assistant' },
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-208, 992], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: { position: [16, 992], name: 'Google Drive' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
			version: 1,
			config: { position: [256, 992], name: 'Storing documents' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: { position: [-48, 432], name: 'OpenAI Chat Model' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
			version: 1.2,
			config: { position: [528, 640], name: 'Embeddings OpenAI' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
			version: 1,
			config: { position: [432, 416], name: 'Retrieve and push documents' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
			version: 1.2,
			config: { position: [240, 1216], name: 'Embeddings OpenAI1' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter',
			version: 1,
			config: { position: [448, 1408], name: 'Recursive Character Text Splitter' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
			version: 1,
			config: { position: [368, 1216], name: 'Default Data Loader' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
			version: 1.3,
			config: { position: [176, 336], name: 'Your Chat Memory' },
		}),
	)
	.add(sticky('', { position: [-64, 848] }))
	.add(sticky('', { name: 'Sticky Note1', position: [224, 848] }))
	.add(sticky('', { name: 'Sticky Note2', position: [432, 208] }))
	.add(sticky('', { name: 'Sticky Note3', position: [96, 320] }));
