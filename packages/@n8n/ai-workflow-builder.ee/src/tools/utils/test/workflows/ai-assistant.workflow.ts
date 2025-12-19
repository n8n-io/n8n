import type { WorkflowMetadata } from '@/types';

// template for test: https://n8n.io/workflows/8237-personal-life-manager-with-telegram-google-services-and-voice-enabled-ai/

export const aiAssistantWorkflow: WorkflowMetadata = {
	name: 'Personal Life Manager with Telegram, Google Services & Voice-Enabled AI',
	description:
		'This project teaches you to create a personal AI assistant named Jackie that operates through Telegram. Jackie can summarize unread emails, check calendar events, manage Google Tasks, and handle both voice and text interactions. The assistant provides a comprehensive digital life management solution accessible via Telegram messaging.',
	workflow: {
		name: 'Personal Life Manager with Telegram, Google Services & Voice-Enabled AI',
		nodes: [
			{
				parameters: {
					operation: 'getAll',
					calendar: {
						__rl: true,
						mode: 'id',
						value: '=<insert email here>',
					},
					options: {
						timeMin: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('After', ``, 'string') }}",
						timeMax:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Before', ``, 'string') }}",
						fields: '=items(summary, start(dateTime))',
					},
				},
				id: 'b70bab99-2919-42c0-a64f-ea8340503a81',
				name: 'Google Calendar',
				type: 'n8n-nodes-base.googleCalendarTool',
				position: [3232, 832],
				typeVersion: 1.1,
				credentials: {},
			},
			{
				parameters: {
					sessionIdType: 'customKey',
					sessionKey: "={{ $('Listen for incoming events').first().json.message.from.id }}",
				},
				id: '621a4839-bc0d-4c73-b228-3831ad50ca3c',
				name: 'Window Buffer Memory',
				type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				position: [2016, 832],
				typeVersion: 1.2,
			},
			{
				parameters: {
					operation: 'getAll',
					limit: 20,
					filters: {
						labelIds: ['INBOX'],
						readStatus: 'unread',
						receivedAfter:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Received_After', ``, 'string') }}",
						receivedBefore:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Received_Before', ``, 'string') }}",
					},
				},
				id: '89d9a5d9-d3c7-48c1-98cf-cc8987ba9391',
				name: 'Get Email',
				type: 'n8n-nodes-base.gmailTool',
				position: [2800, 832],
				webhookId: 'a4ae7b5d-7686-4bee-a753-848932860b4e',
				typeVersion: 2.1,
				credentials: {},
			},
			{
				parameters: {
					updates: ['message'],
					additionalFields: {},
				},
				id: '88f2bfc3-a997-4838-a4e6-911c60d377ec',
				name: 'Listen for incoming events',
				type: 'n8n-nodes-base.telegramTrigger',
				position: [880, 480],
				webhookId: '322dce18-f93e-4f86-b9b1-3305519b7834',
				typeVersion: 1,
				credentials: {},
			},
			{
				parameters: {
					chatId: "={{ $('Listen for incoming events').first().json.message.from.id }}",
					text: '={{ $json.output }}',
					additionalFields: {
						appendAttribution: false,
						parse_mode: 'Markdown',
					},
				},
				id: 'fe37d04d-2bb4-4130-8386-665364195dce',
				name: 'Telegram',
				type: 'n8n-nodes-base.telegram',
				position: [2688, 464],
				webhookId: '2c133a40-af48-4106-bc1a-be6047840a89',
				typeVersion: 1.1,
				credentials: {},
				onError: 'continueErrorOutput',
			},
			{
				parameters: {
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'a0bf9719-4272-46f6-ab3b-eda6f7b44fd8',
								operator: {
									type: 'string',
									operation: 'empty',
									singleValue: true,
								},
								leftValue: '={{ $json.message.text }}',
								rightValue: '',
							},
						],
					},
					options: {},
				},
				id: 'a5717776-2c85-4dfb-9e05-bf9b805f9004',
				name: 'If',
				type: 'n8n-nodes-base.if',
				position: [1328, 480],
				typeVersion: 2.2,
			},
			{
				parameters: {
					fields: {
						values: [
							{
								name: 'text',
								stringValue: '={{ $json?.message?.text || "" }}',
							},
						],
					},
					options: {},
				},
				id: 'dc3d741a-2ed6-4c34-b14f-91a728b3fffd',
				name: 'Voice or Text',
				type: 'n8n-nodes-base.set',
				position: [1104, 480],
				typeVersion: 3.2,
			},
			{
				parameters: {
					resource: 'file',
					fileId: "={{ $('Listen for incoming events').item.json.message.voice.file_id }}",
					additionalFields: {},
				},
				id: '7c7cbb13-8b9d-4e98-9287-4002166ff159',
				name: 'Get Voice File',
				type: 'n8n-nodes-base.telegram',
				position: [1552, 400],
				webhookId: 'ef3f120e-c212-45ff-99b5-b6a5a82598d8',
				typeVersion: 1.1,
				credentials: {},
			},
			{
				parameters: {
					content: '## Process Telegram Request\n',
					height: 279,
					width: 624,
					color: 7,
				},
				id: '8078f53c-0aed-4f01-bf8f-f0e65a8291c0',
				name: 'Sticky Note',
				type: 'n8n-nodes-base.stickyNote',
				position: [1072, 368],
				typeVersion: 1,
			},
			{
				parameters: {
					content:
						'\n\n\n\n\n\n\n\n\n\n\n\n1. [In OpenRouter](https://openrouter.ai/settings/keys) click **“Create API key”** and copy it.\n\n2. Open the ```OpenRouter``` node:\n   * **Select Credential → Create New**\n   * Paste into **API Key** and **Save**\n',
					height: 316,
					width: 294,
					color: 3,
				},
				id: '9006e460-0a4f-4250-876c-1743d7526909',
				name: 'Sticky Note1',
				type: 'n8n-nodes-base.stickyNote',
				position: [1584, 784],
				typeVersion: 1,
				notes: '© 2025 Lucas Peyrin',
			},
			{
				parameters: {
					options: {},
				},
				id: '7e0fa1ed-2cd6-48a6-bf04-d67d4d7fe842',
				name: 'OpenRouter',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
				position: [1680, 816],
				typeVersion: 1,
				credentials: {},
			},
			{
				parameters: {
					content:
						'\n\n\n\n\n\n\n\n\n\n\n\n\n\nThis node helps your agent remember the last few messages to stay on topic.',
					height: 260,
					width: 308,
					color: 7,
				},
				id: 'f326d185-cd53-421e-a3d1-ae3b0d162bfa',
				name: 'Sticky Note15',
				type: 'n8n-nodes-base.stickyNote',
				position: [1904, 784],
				typeVersion: 1,
				notes: '© 2025 Lucas Peyrin',
			},
			{
				parameters: {
					content:
						'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nThis node allows your agent create and get tasks from Google Tasks\n',
					height: 260,
					width: 484,
					color: 7,
				},
				id: '48c06490-e261-45f5-ad0c-2b2648203ab0',
				name: 'Sticky Note16',
				type: 'n8n-nodes-base.stickyNote',
				position: [2240, 784],
				typeVersion: 1,
				notes: '© 2025 Lucas Peyrin',
			},
			{
				parameters: {
					content: '\n\n\n\n\n\n\n\n\n\n\n\n\n\nThis node allows your agent access your gmail\n',
					height: 260,
					width: 308,
					color: 7,
				},
				id: '8bb0d940-eda3-4ecf-8a1d-15b1a6445a83',
				name: 'Sticky Note18',
				type: 'n8n-nodes-base.stickyNote',
				position: [2752, 784],
				typeVersion: 1,
				notes: '© 2025 Lucas Peyrin',
			},
			{
				parameters: {
					content:
						'\n\n\n\n\n\n\n\n\n\n\n\n\n\nThis node allows your agent access your Google calendar\n',
					height: 260,
					width: 404,
					color: 7,
				},
				id: 'cf8916e8-4701-4644-9d92-e2dd78665448',
				name: 'Sticky Note19',
				type: 'n8n-nodes-base.stickyNote',
				position: [3088, 784],
				typeVersion: 1,
				notes: '© 2025 Lucas Peyrin',
			},
			{
				parameters: {
					content:
						'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nUses OpenAI to convert voice to text.\n[In OpenAI](https://platform.openai.com/api-keys) click **“Create new secret key”** and copy it.',
					height: 276,
					width: 324,
					color: 7,
				},
				id: 'a5db0c52-ba8d-4622-8a0a-eae3a7f0d90f',
				name: 'Sticky Note20',
				type: 'n8n-nodes-base.stickyNote',
				position: [1760, 368],
				typeVersion: 1,
				notes: '© 2025 Lucas Peyrin',
			},
			{
				parameters: {
					content:
						'Caylee, your peronal AI Assistant:\n1. Get email\n2. Check calendar\n3. Get and create to-do tasks \n\nEdit the **System Message** to adjust your agent’s thinking, behavior, and replies.\n\n\n\n\n\n\n\n\n\n\n',
					height: 380,
					width: 396,
					color: 7,
				},
				id: 'fd8b069a-19da-4740-a3ce-d88ee0e81331',
				name: 'Sticky Note13',
				type: 'n8n-nodes-base.stickyNote',
				position: [2144, 272],
				typeVersion: 1,
				notes: '© 2025 Lucas Peyrin',
			},
			{
				parameters: {
					content:
						'# Try It Out!\n\nLaunch Jackie—your personal AI assistant that handles voice & text via Telegram to manage your digital life.\n\n**To get started:**\n\n1. **Connect all credentials** (Telegram, OpenAI, Gmail, etc.)\n2. **Activate the workflow** and message your Telegram bot:\n   • "What emails do I have today?"\n   • "Show me my calendar for tomorrow"\n   • "Craete new to-do item"\n   • 🎤 Send voice messages for hands-free interaction\n\n## Questions or Need Help?\n\nFor setup assistance, customization, or workflow support, join my Skool community!\n\n### [AI Automation Engineering Community](https://www.skool.com/ai-automation-engineering-3014)\n\nHappy learning! -- Derek Cheung\n',
					height: 568,
					width: 460,
					color: 4,
				},
				id: '1c27ac6c-39d7-4f07-8134-624e1cb21e07',
				name: 'Sticky Note3',
				type: 'n8n-nodes-base.stickyNote',
				position: [368, 240],
				typeVersion: 1,
			},
			{
				parameters: {
					content: '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nSend message back to Telegram\n',
					height: 288,
					width: 304,
					color: 7,
				},
				id: 'fd801aac-5dfa-4a51-abbd-b187a6e588e8',
				name: 'Sticky Note4',
				type: 'n8n-nodes-base.stickyNote',
				position: [2592, 368],
				typeVersion: 1,
			},
			{
				parameters: {
					task: 'MTY1MTc5NzMxMzA5NDc5MTQ5NzQ6MDow',
					title: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Title', ``, 'string') }}",
					additionalFields: {},
				},
				id: '4a44f67a-65b1-4de7-898f-ee7724e33bb1',
				name: 'Create a task in Google Tasks',
				type: 'n8n-nodes-base.googleTasksTool',
				position: [2336, 848],
				typeVersion: 1,
				credentials: {},
			},
			{
				parameters: {
					operation: 'getAll',
					task: 'MTY1MTc5NzMxMzA5NDc5MTQ5NzQ6MDow',
					additionalFields: {},
				},
				id: '0262484e-23cc-49b3-be29-8f205e49077a',
				name: 'Get many tasks in Google Tasks',
				type: 'n8n-nodes-base.googleTasksTool',
				position: [2528, 848],
				typeVersion: 1,
				credentials: {},
			},
			{
				parameters: {
					content: '## [Video Tutorial](https://youtu.be/ROgf5dVqYPQ)\n@[youtube](ROgf5dVqYPQ)',
					height: 400,
					width: 544,
					color: 7,
				},
				id: 'ef46cbde-6e82-4488-b027-d70087f1b5f4',
				name: 'Sticky Note2',
				type: 'n8n-nodes-base.stickyNote',
				position: [2944, 256],
				typeVersion: 1,
			},
			{
				parameters: {
					resource: 'audio',
					operation: 'transcribe',
					options: {},
				},
				id: '3acacedb-bafa-4fbf-8d3e-f198b19b9308',
				name: 'Transcribe a recording',
				type: '@n8n/n8n-nodes-langchain.openAi',
				position: [1872, 400],
				typeVersion: 1.8,
				credentials: {},
			},
			{
				parameters: {
					sendTo: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('To', ``, 'string') }}",
					subject: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Subject', ``, 'string') }}",
					message:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Message', `Please format this nicely in html`, 'string') }}",
					options: {
						appendAttribution: false,
					},
				},
				id: '2ea5b79c-2e49-4d7e-933c-8b1a58d2415c',
				name: 'Send Email',
				type: 'n8n-nodes-base.gmailTool',
				position: [2944, 832],
				webhookId: 'a4ae7b5d-7686-4bee-a753-848932860b4e',
				typeVersion: 2.1,
				credentials: {},
			},
			{
				parameters: {
					promptType: 'define',
					text: '={{ $json.text }}',
					options: {
						systemMessage:
							"=You are a helpful personal assistant called Jackie. \n\nToday's date is {{ $today.format('yyyy-MM-dd') }}.\n\nGuidelines:\n- When summarizing emails, include Sender, Message date, subject, and brief summary of email.\n- if the user did not specify a date in the request assume they are asking for today\n- When answering questions about calendar events, filter out events that don't apply to the question.  For example, the question is about events for today, only reply with events for today. Don't mention future events if it's more than 1 week away\n- When creating calendar entry, the attendee email is optional",
					},
				},
				id: '4ec85126-51da-4f3b-a04f-16552fdcb244',
				name: 'Jackie, AI Assistant 👩🏻‍🏫',
				type: '@n8n/n8n-nodes-langchain.agent',
				position: [2224, 464],
				typeVersion: 1.6,
			},
		],
		connections: {
			'Google Calendar': {
				ai_tool: [
					[
						{
							node: 'Jackie, AI Assistant 👩🏻‍🏫',
							type: 'ai_tool',
							index: 0,
						},
					],
				],
			},
			'Window Buffer Memory': {
				ai_memory: [
					[
						{
							node: 'Jackie, AI Assistant 👩🏻‍🏫',
							type: 'ai_memory',
							index: 0,
						},
					],
				],
			},
			'Get Email': {
				ai_tool: [
					[
						{
							node: 'Jackie, AI Assistant 👩🏻‍🏫',
							type: 'ai_tool',
							index: 0,
						},
					],
				],
			},
			'Listen for incoming events': {
				main: [
					[
						{
							node: 'Voice or Text',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			If: {
				main: [
					[
						{
							node: 'Get Voice File',
							type: 'main',
							index: 0,
						},
					],
					[
						{
							node: 'Jackie, AI Assistant 👩🏻‍🏫',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Voice or Text': {
				main: [
					[
						{
							node: 'If',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Get Voice File': {
				main: [
					[
						{
							node: 'Transcribe a recording',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			OpenRouter: {
				ai_languageModel: [
					[
						{
							node: 'Jackie, AI Assistant 👩🏻‍🏫',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
			'Create a task in Google Tasks': {
				ai_tool: [
					[
						{
							node: 'Jackie, AI Assistant 👩🏻‍🏫',
							type: 'ai_tool',
							index: 0,
						},
					],
				],
			},
			'Get many tasks in Google Tasks': {
				ai_tool: [
					[
						{
							node: 'Jackie, AI Assistant 👩🏻‍🏫',
							type: 'ai_tool',
							index: 0,
						},
					],
				],
			},
			'Transcribe a recording': {
				main: [
					[
						{
							node: 'Jackie, AI Assistant 👩🏻‍🏫',
							type: 'main',
							index: 0,
						},
					],
				],
			},
			'Send Email': {
				ai_tool: [
					[
						{
							node: 'Jackie, AI Assistant 👩🏻‍🏫',
							type: 'ai_tool',
							index: 0,
						},
					],
				],
			},
			'Jackie, AI Assistant 👩🏻‍🏫': {
				main: [
					[
						{
							node: 'Telegram',
							type: 'main',
							index: 0,
						},
					],
				],
			},
		},
	},
};
