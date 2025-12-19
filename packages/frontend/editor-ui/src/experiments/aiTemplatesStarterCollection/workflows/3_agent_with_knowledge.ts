import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const AGENT_WITH_KNOWLEDGE: WorkflowDataCreate = {
	meta: {
		templateId: '035_template_onboarding-agent_with_knowledge',
	},
	name: '3. Agent with knowledge',
	nodes: [
		{
			parameters: {
				formTitle: 'Upload your data to test RAG',
				formFields: {
					values: [
						{
							fieldLabel: 'Upload your file(s)',
							fieldType: 'file',
							acceptFileTypes: '.pdf, .csv',
							requiredField: true,
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.formTrigger',
			typeVersion: 2.2,
			position: [-368, -304],
			id: 'e45eaedc-7ed9-4fd6-b79b-82a155734bce',
			name: 'Upload your file here',
			webhookId: '82848bc4-5ea2-4e5a-8bb6-3c09b94a8c5d',
		},
		{
			parameters: {
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
			typeVersion: 1.2,
			position: [288, 176],
			id: 'f9f1745a-9c6d-42cf-8f8b-19a1c4c91b77',
			name: 'Embeddings OpenAI',
		},
		{
			parameters: {
				dataType: 'binary',
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
			typeVersion: 1.1,
			position: [80, -144],
			id: '56da285f-9ad9-4cb4-a7d4-fb0f035e9071',
			name: 'Default Data Loader',
		},
		{
			parameters: {
				content:
					'### Readme\nLoad your data into a vector database with the 📚 **Load Data** flow, and then use your data as chat context with the 🐕 **Retriever** flow.\n\n**Quick start**\n1. Click on the `Execute Workflow` button to run the 📚 **Load Data** flow.\n2. Click on `Open Chat` button to run the 🐕 **Retriever** flow. Then ask a question about content from your document(s)\n\n\nFor more info, check [our docs on RAG in n8n](https://docs.n8n.io/advanced-ai/rag-in-n8n/).',
				height: 300,
				width: 440,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			position: [-896, -368],
			typeVersion: 1,
			id: '72cb28c7-572b-41ce-ba4c-2dd0dc80acb4',
			name: 'Sticky Note',
		},
		{
			parameters: {
				content: '### 📚 Load Data Flow',
				height: 460,
				width: 700,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			position: [-416, -368],
			typeVersion: 1,
			id: '075a4895-8b5f-487b-b7ff-8766aa1d1450',
			name: 'Sticky Note1',
		},
		{
			parameters: {
				mode: 'insert',
				memoryKey: {
					__rl: true,
					value: 'vector_store_key',
					mode: 'list',
					cachedResultName: 'vector_store_key',
				},
			},
			type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
			typeVersion: 1.2,
			position: [-176, -304],
			id: 'd24732cb-b6b4-4eb6-ad47-1f290f0da13d',
			name: 'Insert Data to Store',
		},
		{
			parameters: {
				mode: 'retrieve-as-tool',
				toolName: 'knowledge_base',
				toolDescription: 'Use this knowledge base to answer questions from the user',
				memoryKey: {
					__rl: true,
					mode: 'list',
					value: 'vector_store_key',
				},
			},
			type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
			typeVersion: 1.2,
			position: [704, -96],
			id: '8915e9b6-2a6c-472c-b043-78c1d77888ae',
			name: 'Query Data Tool',
		},
		{
			parameters: {
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 2,
			position: [704, -320],
			id: 'a2baaa1d-beee-40a2-8b5f-757b2b1aaca9',
			name: 'AI Agent',
		},
		{
			parameters: {
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [480, -320],
			id: 'c0a831dd-362c-4352-9409-bfe8c2e6f5ab',
			name: 'When chat message received',
			webhookId: '4091fa09-fb9a-4039-9411-7104d213f601',
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: 'list',
					value: 'gpt-4o-mini',
				},
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1.2,
			position: [480, -96],
			id: '2ba103b5-7783-49a7-9693-a156383ca697',
			name: 'OpenAI Chat Model',
		},
		{
			parameters: {
				content: '### 🐕 2. Retriever Flow',
				height: 460,
				width: 680,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			position: [368, -368],
			typeVersion: 1,
			id: '729f9492-3811-43d8-8230-d9ad78d910f7',
			name: 'Sticky Note2',
		},
		{
			parameters: {
				content:
					'### Embeddings\n\nThe Insert and Retrieve operation use the same embedding node.\n\nThis is to ensure that they are using the **exact same embeddings and settings**.\n\nDifferent embeddings might not work at all, or have unintended consequences.\n',
				height: 240,
				width: 320,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			position: [432, 144],
			typeVersion: 1,
			id: '20a6b946-5588-4df2-b1f6-952fc82d166c',
			name: 'Sticky Note3',
		},
	],
	connections: {
		'Upload your file here': {
			main: [
				[
					{
						node: 'Insert Data to Store',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Embeddings OpenAI': {
			ai_embedding: [
				[
					{
						node: 'Insert Data to Store',
						type: 'ai_embedding',
						index: 0,
					},
					{
						node: 'Query Data Tool',
						type: 'ai_embedding',
						index: 0,
					},
				],
			],
		},
		'Default Data Loader': {
			ai_document: [
				[
					{
						node: 'Insert Data to Store',
						type: 'ai_document',
						index: 0,
					},
				],
			],
		},
		'Query Data Tool': {
			ai_tool: [
				[
					{
						node: 'AI Agent',
						type: 'ai_tool',
						index: 0,
					},
				],
			],
		},
		'When chat message received': {
			main: [
				[
					{
						node: 'AI Agent',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'OpenAI Chat Model': {
			ai_languageModel: [
				[
					{
						node: 'AI Agent',
						type: 'ai_languageModel',
						index: 0,
					},
				],
			],
		},
	},
	pinData: {},
};
