const wf = workflow(
	'',
	'Track & Query expenses via Telegram (voice,text) to Google Sheets using AI',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: { position: [1136, 624], name: 'Telegram Input' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.3,
			config: { position: [1120, 992], name: 'Route by Message Type' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.3,
			config: { position: [1392, 720], name: 'Check Voice Quality' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [1600, 592], name: 'Send Processing Notification (Voice)' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [1600, 848], name: '🎙️ Download Voice File' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: { position: [1792, 848], name: 'Upload to AssemblyAI' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: { position: [1952, 784], name: 'Start Transcription' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [2128, 848], name: 'Wait for Transcription' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: { position: [2304, 784], name: 'Get Transcription Result' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: { position: [2480, 848], name: 'Check Transcription Status' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: { position: [2784, 1248], name: 'Read Transaction History' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [2992, 880], name: 'Calculate Starting Balance' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: { position: [3248, 880], name: 'AI Expense Analyzer' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: { position: [3920, 1152], name: 'Generate Voice Response' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [4256, 1008], name: 'Send Voice to Telegram' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [4272, 1280], name: 'Send Text to Telegram' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: { position: [3920, 704], name: 'Track API Costs' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: { position: [4208, 704], name: 'Log Cost to Sheet' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: { position: [1424, 1248], name: 'Send Processing Notification (Text)' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheetsTool',
			version: 4.7,
			config: { position: [3296, 1376], name: 'Append Transaction to Sheet' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheetsTool',
			version: 4.7,
			config: { position: [3504, 1440], name: 'Read Sheet for Queries' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: { position: [3664, 1408], name: 'Send Low Balance Alert' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: { position: [2944, 1392], name: 'GPT-4.1 Mini Model' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: { position: [3104, 1424], name: 'Conversation Memory' },
		}),
	)
	.add(sticky('', { position: [1040, 400] }))
	.add(sticky('', { name: 'Sticky Note1', position: [1344, 400] }))
	.add(sticky('', { name: 'Sticky Note2', position: [1344, 1104] }))
	.add(sticky('', { name: 'Sticky Note3', position: [2656, 400] }))
	.add(sticky('', { name: 'Sticky Note4', position: [3792, 400] }))
	.add(sticky('', { name: 'Sticky Note5', position: [3824, 944] }))
	.add(sticky('', { name: 'Sticky Note6', position: [3824, 608] }))
	.add(sticky('', { name: 'Sticky Note7' }));
