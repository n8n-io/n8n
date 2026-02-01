import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const READY_TO_RUN_WORKFLOW_V6: WorkflowDataCreate = {
	name: 'Chat with the news',
	meta: { templateId: 'ready-to-run-ai-workflow-v6' },
	settings: {
		executionOrder: 'v1',
	},
	nodes: [
		{
			parameters: {
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			typeVersion: 1.4,
			position: [-160, 64],
			id: '6f4d9435-be4c-48a6-89a2-9a24cdf68d40',
			name: 'When chat message received',
			webhookId: 'b567d98b-aabb-4963-b0f8-6b1e8b5f8959',
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: 'list',
					value: 'gpt-4.1-mini',
				},
				responsesApiEnabled: false,
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1.3,
			position: [-16, 384],
			id: 'f9b6e5c5-36d1-415f-9c5c-79fb79787207',
			name: 'OpenAI Model',
			credentials: {},
		},
		{
			parameters: {},
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			typeVersion: 1.3,
			position: [160, 384],
			id: '81e7b833-c47b-44f7-950d-8d035fcb2205',
			name: 'Simple Memory',
		},
		{
			parameters: {
				url: 'https://hnrss.org/frontpage',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [432, 384],
			id: '3677c36a-813b-407b-9fdc-38565c6f73e9',
			name: 'Hackernews',
		},
		{
			parameters: {
				url: 'https://www.theverge.com/rss/index.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [592, 384],
			id: 'e1eaf4ea-0a02-44fd-b0c8-13505ad5bd22',
			name: 'TheVerge',
		},
		{
			parameters: {
				url: 'https://feeds.bbci.co.uk/news/rss.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [752, 384],
			id: 'ee0b9c96-e66d-47e3-9122-0ca998caf687',
			name: 'BBC News',
		},
		{
			parameters: {
				content:
					'✅ This AI News agent is ready to use. Chat with it! \n✨ We gave you free OpenAI credits\n💡 Next: [Connect a Google Sheet](https://n8n.io/workflows/7639-talk-to-your-google-sheets-using-chatgpt-5/) to chat with your data',
				height: 80,
				width: 448,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-416, -112],
			id: '99944422-2269-4952-bd31-715ec0eb5bb4',
			name: 'Sticky Note2',
		},
		{
			parameters: {
				documentId: {
					__rl: true,
					mode: 'list',
					value: '',
				},
				sheetName: {
					__rl: true,
					mode: 'list',
					value: '',
				},
			},
			type: 'n8n-nodes-base.googleSheetsTool',
			typeVersion: 4.7,
			position: [896, 384],
			id: 'fc10c8a7-6621-4e7d-937f-6cb1e03bc057',
			name: 'Google Sheets',
			credentials: {},
		},
		{
			parameters: {
				options: {
					systemMessage:
						'=News Agent\n\n# Role\n\nYou are a concise, factual news assistant with access to these RSS tools:\n\n* BBC (Global news)\n* TheVerge (Consumer tech)\n* Hacker News (Tech discussions)\n\nYou always keep replies **short and focused (maximum 100 words total)**.\n\n# Behavior\n\n* On the first message only, greet the user and say you can search recent news.\n* When the user asks for news, always check all RSS tools and combine results from multiple feeds if relevant, but surface only the **top 1 - 5 most relevant items**.\n* Never invent information. Only use content found in the tools.\n\n# Answer Format\n\n* **Maximum 100 words per reply** (including any follow-up sentence).\n* Start with **one short intro sentence**.\n* Then provide **3–5 bullet points**, each a **single short sentence**.\n* Use short, clear sentences.\n* Add a link to the original article or source in at least one bullet.\n\n# Edge Cases\n\n* If you find too little information, say so and suggest adding more news sources to the agent.\n* If the user asks you to build workflows or do non-news tasks, say you are only a news agent and point them to n8n’s AI Workflow Builder (✨ icon) and the docs: [https://docs.n8n.io/advanced-ai/ai-workflow-builder/](https://docs.n8n.io/advanced-ai/ai-workflow-builder/)\n* If the user asks for opinions or predictions, stay neutral and summarize facts only.\n* After sharing news results with the user for the first time, ask the user if they want to connect one of their Google Sheets so that they can chat with their own data. Only make this suggestion once in the entire chat history. If they say yes, provide these instructions:\n\n1. Connect the Google Sheets node to the AI Agent in the same way as the RSS nodes.\n2. Open the Google Sheets node and connect your Google account.\n3. Pick your Spreadsheet and Sheet from the dropdowns.\n\n\n# Date\n\nToday is {{ $today }}\n',
				},
			},
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 3,
			position: [192, 64],
			id: 'ce5dd204-b9d3-4455-ab0c-0c2ce314ad52',
			name: 'AI Agent',
		},
	],
	pinData: {},
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
		'OpenAI Model': {
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
		'Simple Memory': {
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
		Hackernews: {
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
		TheVerge: {
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
		'BBC News': {
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
		'Google Sheets': {
			ai_tool: [[]],
		},
	},
};
