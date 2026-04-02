import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const READY_TO_RUN_WORKFLOW_V4: WorkflowDataCreate = {
	name: 'AI Agent workflow',
	meta: { templateId: 'ready-to-run-ai-workflow-v4' },
	nodes: [
		{
			parameters: {
				url: 'https://www.theverge.com/rss/index.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [288, 160],
			id: '6160830b-4f20-437c-b1a2-586bffe62d66',
			name: 'Get Tech News',
		},
		{
			parameters: {
				toolDescription: 'Reads the news',
				url: '=https://feeds.bbci.co.uk/news/world/rss.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [416, 160],
			id: '4f8ae14c-8c6a-4cf8-b51b-99af6bd23ed1',
			name: 'Get World News',
		},
		{
			parameters: {
				model: {
					__rl: true,
					mode: 'list',
					value: 'gpt-4.1-mini',
				},
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			typeVersion: 1.2,
			position: [32, 160],
			id: '95986360-8ca1-4b8a-af7e-f101e89e3654',
			name: 'OpenAI Model',
			notesInFlow: true,
			credentials: {},
			notes: 'Free n8n credits ',
		},
		{
			parameters: {
				promptType: 'define',
				text: '=Summarize world news and tech news from the last 24 hours. \nSkip your comments. \nThe titles should be "World news:" and "Tech news:" \nLimit to 10 bullet points. \nToday is {{ $today }}',
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 2.2,
			position: [32, -64],
			id: 'd36975bc-d51f-472f-a51f-f6c745b29a8d',
			name: 'AI Summary Agent',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {
				content:
					'### ✅ This test workflow is ready to use \n\n1. Click the orange "Execute workflow" button\n\n2. Watch the workflow get the latest news and summarize it with AI \n\n3. (Bonus) Connect the `Gmail node` to the workflow to send the summary via email\n\n',
				height: 256,
				width: 352,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-832, -128],
			id: '13abc1af-da4a-427d-8cc4-e260dff43307',
			name: 'Sticky Note2',
		},
		{
			parameters: {
				content:
					'[![Learn to use an AI Agent in your workflow](https://n8niostorageaccount.blob.core.windows.net/n8nio-strapi-blobs-prod/assets/thumb_2e91cdcea1.png)](https://www.youtube.com/watch?v=cMyOkQ4N-5M "Watch on YouTube")\n',
				height: 208,
				width: 352,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-832, 160],
			id: 'e0e15104-1954-43b9-b748-0ff8441f6aeb',
			name: 'Sticky Note',
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: '85b5c530-2c13-4424-ab83-05979bc879a5',
							name: 'output',
							value: '={{ $json.output }}',
							type: 'string',
						},
					],
				},
				options: {},
			},
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [464, -64],
			id: 'bef94b0a-b2aa-42f6-85bb-2e23f530d799',
			name: 'Output (News Summary)',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [-256, -64],
			id: '55cb3e43-b73c-48cb-b420-dd618de68a58',
			name: 'Execute workflow',
		},
		{
			parameters: {
				subject: 'Your news daily summary',
				emailType: 'text',
				message: '={{ $json.output }}',
				options: {},
			},
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.1,
			position: [768, -64],
			id: 'e74f8dac-d766-4f4d-91f3-36604a2d4e7a',
			name: 'Send summary with Gmail',
			webhookId: '093b04f1-5e78-4926-9863-1b100d6f2ead',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
	],
	connections: {
		'Get Tech News': {
			ai_tool: [
				[
					{
						node: 'AI Summary Agent',
						type: 'ai_tool',
						index: 0,
					},
				],
			],
		},
		'Get World News': {
			ai_tool: [
				[
					{
						node: 'AI Summary Agent',
						type: 'ai_tool',
						index: 0,
					},
				],
			],
		},
		'OpenAI Model': {
			ai_languageModel: [
				[
					{
						node: 'AI Summary Agent',
						type: 'ai_languageModel',
						index: 0,
					},
				],
			],
		},
		'AI Summary Agent': {
			main: [
				[
					{
						node: 'Output (News Summary)',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Output (News Summary)': {
			main: [[]],
		},
		'Execute workflow': {
			main: [
				[
					{
						node: 'AI Summary Agent',
						type: 'main',
						index: 0,
					},
				],
			],
		},
	},
	pinData: {},
};
