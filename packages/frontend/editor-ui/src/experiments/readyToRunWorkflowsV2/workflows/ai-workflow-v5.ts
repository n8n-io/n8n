import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const READY_TO_RUN_WORKFLOW_V5: WorkflowDataCreate = {
	name: 'Chat with the news',
	meta: { templateId: 'ready-to-run-ai-workflow-v5' },
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
			position: [288, 0],
			id: '261ee04a-4695-4d1a-bec3-9f86b5efd5eb',
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
			position: [400, 288],
			id: '201ee441-da46-49fc-befa-312ad4b60479',
			name: 'OpenAI Model',
			credentials: {},
		},
		{
			parameters: {},
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			typeVersion: 1.3,
			position: [576, 288],
			id: 'aa874554-17b1-41a1-9e1f-8c6c197e7e2f',
			name: 'Simple Memory',
		},
		{
			parameters: {
				url: 'https://hnrss.org/frontpage',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [1120, 288],
			id: '5788980c-2a63-40ed-a375-c68ca7a3b9c0',
			name: 'Hackernews',
		},
		{
			parameters: {
				url: 'https://www.theverge.com/rss/index.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [960, 288],
			id: 'f250ef18-d913-4a76-a607-b1eeebcbab23',
			name: 'TheVerge',
		},
		{
			parameters: {
				url: 'https://feeds.bbci.co.uk/news/rss.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [800, 288],
			id: '0c375d2e-4b2d-4fa6-8b3e-31ac931117cb',
			name: 'BBC News',
		},
		{
			parameters: {
				content:
					'✅ This AI News agent is ready to use. Chat with it! \n✨ We gave you free OpenAI credits\n💡 Learn [how to build](https://n8n.io/workflows/6270-build-your-first-ai-agent/) your own agent  ',
				height: 80,
				width: 448,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [0, -176],
			id: '052068ba-ea50-4521-9946-63ded13b23b0',
			name: 'Sticky Note2',
		},
		{
			parameters: {
				options: {
					systemMessage:
						"=News Agent\n\n# Role\n\nYou are a concise, factual news assistant with access to these RSS tools:\n\n* BBC (Global news)\n* TheVerge (Consumer tech)\n* Hacker News (Tech discussions)\n\nYou always keep replies **short and focused (maximum 100 words total)**.\n\n# Behavior\n\n* On the first message only, greet the user and say you can search recent news.\n* When the user asks for news, always check all RSS tools and combine results from multiple feeds if relevant, but surface only the **top 1 to 5 most relevant items**.\n* Never invent information. Only use content found in the tools.\n\n# Answer Format\n\n* **Maximum 100 words per reply** (including any follow-up sentence).\n* Start with **one short intro sentence**.\n* Then provide **3–5 bullet points**, each a **single short sentence**.\n* Use short, clear sentences.\n* Add a link to the original article or source in at least one bullet.\n* Include a section **“Sources checked:”** listing the feeds used (e.g., “Sources checked: BBC, TheVerge”).\n\n# Edge Cases\n\n* If you find too little information, say so and suggest adding more news sources to the agent.\n* If the user asks you to build workflows or do non-news tasks, say you are only a news agent and point them to n8n’s AI Workflow Builder (✨ icon) and the docs: [https://docs.n8n.io/advanced-ai/ai-workflow-builder/](https://docs.n8n.io/advanced-ai/ai-workflow-builder/)\n* If the user asks for opinions or predictions, stay neutral and summarize facts only.\n* After sharing news results with the user for the first time, mention that they can also get AI-summarized news by email using this template: https://n8n.io/workflows/6270-build-your-first-ai-agent/. Only make this suggestion once in the entire chat history, not after every question (check your previous responses to make sure you don't repeat the suggestion).\n\n# Date\n\nToday is {{ $today }}\n",
				},
			},
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 3,
			position: [608, 0],
			id: 'e481d1a1-3a3d-4583-98ae-87a9b39471a8',
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
	},
};
