import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const AGENT_WITH_MEMORY: WorkflowDataCreate = {
	meta: {
		templateId: '035_template_onboarding-agent_with_memory',
	},
	name: '1. Agent with memory',
	nodes: [
		{
			id: '536fa635-c0c8-4fd1-84ef-d19585be64cf',
			name: 'When chat message received',
			webhookId: '9baee3d2-b9cb-4333-b4d5-3b07db8da9b2',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.1,
			position: [0, 0],
			parameters: {
				options: {},
			},
		},
		{
			id: '1393095b-ec84-4514-b481-432609d1a5c5',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 2.1,
			position: [208, 0],
			parameters: {
				options: {
					systemMessage: '=You are a helpful assistant\n\nTodays date: {{ $now }}',
				},
			},
		},
		{
			id: '658eb127-5a9d-4404-9270-72ef1da36ea3',
			name: 'Sticky Note',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-464, -32],
			parameters: {
				content:
					'### Readme\nChat with an AI agent that remembers your previous messages during a conversation.\n\n**Quick Start**\n1. Open the **Model** node to claim your free API credits and connect to OpenAI. \n2. Click the **Open chat** button to start talking to the agent. Provide it with some information to remember, like your name.\n3. Ask a follow-up question about the information you shared: "What\'s my name?"\n\n---\n\n**Learn More**\n- [AI Agent node documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/)\n- [Simple Memory node documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.memorybufferwindow/)',
				height: 396,
				width: 392,
				color: 4,
			},
		},
		{
			id: '186173c3-d043-4485-b939-9fca3d1e906f',
			name: 'Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1.2,
			position: [160, 240],
			parameters: {
				model: {
					__rl: true,
					mode: 'list',
					value: 'gpt-4.1-mini',
				},
				options: {},
			},
		},
		{
			id: 'dadaaa19-8378-4e23-9573-f9d3ff52c884',
			name: 'Memory',
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			typeVersion: 1.3,
			position: [352, 240],
			parameters: {},
		},
	],
	connections: {
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
		Model: {
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
		Memory: {
			ai_memory: [
				[
					{
						node: 'AI Agent',
						type: 'ai_memory',
						index: 0,
					},
				],
			],
		},
	},
	// parentFolderId: newFolder.id,
};
