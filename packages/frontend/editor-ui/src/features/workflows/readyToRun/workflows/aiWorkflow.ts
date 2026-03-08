import type { WorkflowDataCreate } from '@n8n/rest-api-client';

export const READY_TO_RUN_AI_WORKFLOW: WorkflowDataCreate = {
	name: 'AI Agent workflow',
	meta: { templateId: 'ready-to-run-ai-workflow' },
	nodes: [
		{
			parameters: {
				url: 'https://www.theverge.com/rss/index.xml',
				options: {},
			},
			type: 'n8n-nodes-base.rssFeedReadTool',
			typeVersion: 1.2,
			position: [128, 448],
			id: 'a26f16ce-82a5-4392-a032-622467e0098f',
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
			id: '91d1a929-b913-4399-977a-4306fe8349c7',
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
			id: '482c5e90-74ea-424c-9ec3-1dc14dd460f9',
			name: 'OpenAI Model',
			notesInFlow: true,
			credentials: {},
			notes: 'Free n8n credits ',
		},
		{
			parameters: {
				promptType: 'define',
				text: '=Provide a summary of world and tech news from the last 24 hours. \n\n- Use the headings "World News" and "Tech News." \n- Exclude comments, insights, and any news that is considered sad or distressing. \n- Include up to 10 concise bullet points, prioritizing major events and developments. \n- Focus on key developments from credible sources.\n- Consider today to be {{ $today }}. \n',
				options: {},
			},
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 2.2,
			position: [-144, 192],
			id: '62d75a96-d7de-4618-a79e-1ca945e5db3e',
			name: 'AI Summary Agent',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {
				content:
					'✅ This demo workflow is ready to use\n✨ We gave you free OpenAI credits to play with',
				height: 256,
				width: 400,
				color: 4,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-672, 112],
			id: '0b71e8e9-e824-46a0-b1da-df4827ef6954',
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
			id: 'a7f201ba-9d35-4d4e-a425-77bda8a4d2cf',
			name: 'Send summary with Gmail',
			webhookId: 'e0c46fef-51f3-4a8d-8aaf-b6e17ea89346',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {
				content:
					'### ✨ Bonus step \nSend the news summary via email. Open the node and connect your Gmail account [(= new credential)](https://www.youtube.com/shorts/2K6ltfI4YRg)',
				height: 96,
				width: 384,
				color: 7,
			},
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [544, 48],
			id: '72b95793-9f63-4fe0-aebc-8ca0d3796e9b',
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
			id: '346ea905-9762-4349-8b8b-3cb137837fda',
			name: 'Output (News summary)',
			notesInFlow: true,
			notes: 'Double-click to open',
		},
		{
			parameters: {},
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [-432, 192],
			id: '909e2605-386c-46bc-acff-97f132431d92',
			name: 'Workflow trigger',
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
		'Output (News summary)': {
			main: [[]],
		},
		'Workflow trigger': {
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
