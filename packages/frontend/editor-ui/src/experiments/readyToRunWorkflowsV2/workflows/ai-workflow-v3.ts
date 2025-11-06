import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const READY_TO_RUN_WORKFLOW_V3: WorkflowDataCreate = {
	name: 'AI Agent workflow',
	meta: { templateId: 'ready-to-run-ai-workflow-v3' },
	nodes: [
		{
			parameters: {
				url: 'https://www.theverge.com/rss/index.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [128, 448],
			id: '7febc10d-90ce-4329-90fb-a9a2ca0185c4',
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
			position: [272, 448],
			id: '9424428d-45e2-4085-99f6-ee223802ba5a',
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
			position: [-144, 448],
			id: 'a4fcf631-d3d9-4c4d-9e7b-02c93e70b23f',
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
			position: [-144, 192],
			id: '99bed296-3855-4d89-b983-f30539cfa775',
			name: 'AI Summary Agent',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {
				content:
					'### ✅ This test workflow is ready to use:\nHover over here and click the orange "Execute workflow" button below.\n',
				height: 240,
				width: 400,
				color: 5,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-672, 112],
			id: 'e664273f-63c6-4f12-804a-0fcd99c294cb',
			name: 'Sticky Note2',
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
			position: [688, 192],
			id: 'd0e843dc-c398-4d32-8c56-0bf83176add3',
			name: 'Send summary with Gmail',
			webhookId: '99bdd654-5c17-4ba1-b091-3d726e56f88d',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [-432, 192],
			id: 'e6618880-9281-4d92-91ff-c9a000429b7d',
			name: 'Manual execution',
		},
		{
			parameters: {
				content:
					'###  Bonus (optional)\nConnect the `Output (News Summary)` to the node below, add your Google account info, and send the News summary by email.',
				height: 112,
				width: 384,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [544, 16],
			id: '5e33fbe1-1971-48f8-81c7-08bd32e24aca',
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
			position: [256, 192],
			id: 'f0a79856-ddcf-404b-95a7-a9bf882697ff',
			name: 'Output (News summary)',
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
						node: 'Output (News summary)',
						type: 'main',
						index: 0,
					},
				],
			],
		},
		'Manual execution': {
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
		'Output (News summary)': {
			main: [[]],
		},
	},
	pinData: {},
};
