const wf = workflow('EmfC3k9BlwxWhpVL', 'Own Data Store in Google Sheet', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [-576, -480],
				name: 'Telegram Trigger',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: '=User Request: {{ $json.message.text }}',
					options: {
						systemMessage:
							"when user asks something give the answer from the given google sheet and after searching the google sheet if you don't found then politely apologies to the user.",
					},
					promptType: 'define',
				},
				position: [-368, -480],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '={{ $json.output }}',
					chatId: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
					additionalFields: { appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [-16, -480],
				name: 'Send a text message',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'rowAdded',
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 800289465,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit#gid=800289465',
						cachedResultName: 'Sheet2',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit?usp=drivesdk',
						cachedResultName: 'YouTube Video and Article Data',
					},
				},
				credentials: {
					googleSheetsTriggerOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsTriggerOAuth2Api Credential',
					},
				},
				position: [-496, 192],
				name: 'Google Sheets Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.filter',
			version: 2.2,
			config: {
				parameters: {
					options: {},
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
								id: 'a8608350-5169-4bb1-b918-0a1f5cc13b49',
								operator: { type: 'string', operation: 'exists', singleValue: true },
								leftValue: "={{ $json['URL '] }}",
								rightValue: '',
							},
							{
								id: 'f2ebc482-feb4-49fa-975b-c68db3cb7a37',
								operator: { type: 'string', operation: 'empty', singleValue: true },
								leftValue: '={{ $json.Stored }}',
								rightValue: '',
							},
						],
					},
				},
				position: [-288, 192],
				name: 'Filter',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'or',
						conditions: [
							{
								id: '46ee98fc-c32a-4a49-bba8-c8d331f64071',
								operator: { type: 'string', operation: 'contains' },
								leftValue: "={{ $json['URL '] }}",
								rightValue: 'youtu.be',
							},
							{
								id: '8711d4b1-3512-445e-8415-aa1bf2394a62',
								operator: { type: 'string', operation: 'contains' },
								leftValue: "={{ $json['URL '] }}",
								rightValue: 'youtube.com',
							},
						],
					},
				},
				position: [-64, 192],
				name: 'If',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=Apify Actor - YouTube Transcript Ninja EndPoint URL',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n    "includeTimestamps": "No",\n    "language": "English",\n    "startUrls": [\n        "{{ $json[\'URL \'] }}"\n    ]\n}',
					sendBody: true,
					specifyBody: 'json',
				},
				position: [144, 48],
				name: 'HTTP Request',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.informationExtractor',
			version: 1.2,
			config: {
				parameters: {
					text: '=YouTube Video Transcript: {{ $json.transcript }}',
					options: {},
					attributes: {
						attributes: [
							{
								name: 'Title',
								required: true,
								description: 'a title for this video',
							},
							{
								name: 'Article Refined Data',
								required: true,
								description:
									"a detailed summary from the transcript to add that in my Supabase. Don't start with this video or like this thing.",
							},
						],
					},
				},
				position: [352, 48],
				name: 'Information Extractor1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							Data: "={{ $json.output['Article Refined Data'] }}",
							Title: '={{ $json.output.Title }}',
						},
						schema: [
							{
								id: 'Title',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Data',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Data',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit?usp=drivesdk',
						cachedResultName: 'YouTube Video and Article Data',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [736, 48],
				name: 'Append row in sheet',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							'URL ': "={{ $('Google Sheets Trigger').item.json['URL '] }}",
							Stored: '✅',
						},
						schema: [
							{
								id: 'URL ',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'URL ',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Stored',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Stored',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['URL '],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 800289465,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit#gid=800289465',
						cachedResultName: 'Sheet2',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit?usp=drivesdk',
						cachedResultName: 'YouTube Video and Article Data',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [944, 48],
				name: 'Append or update row in sheet2',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: "={{ $json['URL '] }}", options: {} },
				position: [144, 288],
				name: 'HTTP Request1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.markdown',
			version: 1,
			config: {
				parameters: { html: '={{ $json.data }}', options: {} },
				position: [352, 288],
				name: 'Markdown',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.informationExtractor',
			version: 1.2,
			config: {
				parameters: {
					text: '=Article:  {{ $json.data }}',
					options: {},
					attributes: {
						attributes: [
							{
								name: 'Title',
								required: true,
								description: 'a title for this article',
							},
							{
								name: 'Article Refined Data',
								required: true,
								description:
									"a detailed summary from the article to add that in my Supabase. Don't start with this article or this thing.",
							},
						],
					},
				},
				position: [560, 288],
				name: 'Information Extractor',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							Data: "={{ $json.output['Article Refined Data'] }}",
							Title: '={{ $json.output.Title }}',
						},
						schema: [
							{
								id: 'Title',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Data',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Data',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit?usp=drivesdk',
						cachedResultName: 'YouTube Video and Article Data',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [928, 288],
				name: 'Append row in sheet1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							'URL ': "={{ $('Google Sheets Trigger').item.json['URL '] }}",
							Stored: '✅',
						},
						schema: [
							{
								id: 'URL ',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'URL ',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Stored',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Stored',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['URL '],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 800289465,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit#gid=800289465',
						cachedResultName: 'Sheet2',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit?usp=drivesdk',
						cachedResultName: 'YouTube Video and Article Data',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1136, 288],
				name: 'Append or update row in sheet',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [672, 400],
				name: 'Google Gemini Chat Model1',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [464, 160],
				name: 'Google Gemini Chat Model2',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-368, -320],
				name: 'Google Gemini Chat Model',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheetsTool',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1GR4d8QZzg0DBewuo_jHHU9WaD_cxscxhebdb6mEAsoA/edit?usp=drivesdk',
						cachedResultName: 'YouTube Video and Article Data',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-176, -320],
				name: 'Get row(s) in sheet in Google Sheets',
			},
		}),
	)
	.add(sticky('# Requesting Data', { color: 6, position: [-656, -576], width: 896, height: 432 }))
	.add(
		sticky('# Storing Data through YouTube Video URL / Article Link', {
			name: 'Sticky Note1',
			color: 6,
			position: [-656, -32],
			width: 2080,
			height: 592,
		}),
	)
	.add(
		sticky(
			'---\n\n# 🛠 Setup Guide\n\n**Author:** [Rakin Jakaria](https://www.youtube.com/@rakinjakaria)\n\nFollow these steps to get started:\n\n1. **Connect your [Telegram Bot](https://core.telegram.org/bots#botfather)**\n   Make sure your Telegram bot token is added to both the **Telegram Trigger** and **Send a text message** nodes in your N8N instance.\n\n2. **Plug in your [Apify](https://console.apify.com/actors/dB9f4B02ocpTICIEY/input) API token**\n   You’ll need this to fetch YouTube video transcripts. Replace the token inside the **HTTP Request** node URL with your own.\n\n3. **Plug in your [Gemini](https://aistudio.google.com/apikey) credentials**\n   This allows the AI nodes to summarize video/article data using Google Gemini. Add your Gemini API key to the **Google Gemini (PaLM) API** credentials in N8N.\n\n4. **Connect your [Google Sheets](https://docs.google.com/spreadsheets/) account**\n   This is where all your processed data will be stored. Make sure your Google Sheets OAuth credentials are set up and the sheet is shared with the connected account.\n\nOnce all four are connected, your workflow will be ready to run! ✅\n\n---\n',
			{ name: 'Sticky Note2', color: 6, position: [1536, 80], width: 1184, height: 480 },
		),
	)
	.add(
		sticky(
			'\n# 1️⃣ Purpose of This Agent\n\nThis workflow lets you:\n\n* **Extract summaries** from YouTube videos or articles.\n* **Store them** in a Google Sheet for later use.\n* **Query stored data** via Telegram.\n\n',
			{ name: 'Sticky Note3', color: 6, position: [1536, -672], width: 464, height: 208 },
		),
	)
	.add(
		sticky(
			'# 2️⃣ How to Use\n\n* Add a **YouTube link** or **article link** to the Google Sheet (**Sheet2**).\n* The workflow will automatically:\n\n  * **Detect** the link type.\n  * Use **Apify** (for YouTube transcripts) or **HTTP Request** (for articles).\n  * **Summarize** using Google Gemini.\n  * **Append** data to **Sheet1**.\n* In **Telegram**, send a message to the bot to **search stored summaries**.',
			{ name: 'Sticky Note4', color: 6, position: [1536, -352], width: 544, height: 320 },
		),
	);
