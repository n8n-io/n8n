const wf = workflow('0eQvHzKKVrYZMyyZ', 'Invoice Workflow', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.googleDriveTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'fileCreated',
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
					triggerOn: 'specificFolder',
					folderToWatch: {
						__rl: true,
						mode: 'list',
						value: '1PgLKqvN8CFFXWAKhZxzjuk6gMnXJ7-np',
						cachedResultUrl: 'Redacted',
						cachedResultName: 'n8n Invoices Folder',
					},
				},
				name: 'Google Drive Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
					options: {},
					operation: 'download',
				},
				position: [260, 0],
				name: 'Google Drive',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'pdf' },
				position: [480, 0],
				name: 'Extract from File',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.informationExtractor',
			version: 1,
			config: {
				parameters: {
					text: '={{ $json.text }}',
					options: {
						systemPromptTemplate:
							"You are an expert extraction algorithm.\nOnly extract relevant information from the text.\nIf you do not know the value of an attribute asked to extract, you may omit the attribute's value.",
					},
					attributes: {
						attributes: [
							{
								name: 'Invoice Number',
								required: true,
								description: 'The Number of the Invoice',
							},
							{
								name: 'Client Name',
								required: true,
								description: 'Name of the client',
							},
							{
								name: 'Client Email',
								required: true,
								description: 'Email address of the client',
							},
							{
								name: 'Total Amount',
								required: true,
								description: 'Total Amount Due in the Invoice',
							},
							{
								name: 'Invoice Date',
								required: true,
								description: 'Date of the Invoice',
							},
							{
								name: 'Due Date',
								description: 'Date with the invoice is due',
							},
						],
					},
				},
				position: [740, 0],
				name: 'Information Extractor',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							'Due Date': "={{ $json.output['Due Date'] }}",
							'Client Name': "={{ $json.output['Client Name'] }}",
							'Client Email': "={{ $json.output['Client Email'] }}",
							'Invoice Date': "={{ $json.output['Invoice Date'] }}",
							'Total Amount': "={{ $json.output['Total Amount'] }}",
							'Invoice Number': "={{ $json.output['Invoice Number'] }}",
						},
						schema: [
							{
								id: 'Invoice Number',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Invoice Number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Client Name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Client Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Client Email',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Client Email',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Client Address',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Client Address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Client Phone',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Client Phone',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Total Amount',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Total Amount',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Invoice Date',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Invoice Date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Due Date',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Due Date',
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
						cachedResultUrl: 'Redacted',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1lMMuPAU_rRU6VdybxgiPeVd9KRZrKhlzJ3gVc4Wz7iA',
						cachedResultUrl: 'Redacted',
						cachedResultName: 'Invoice DB',
					},
				},
				position: [1100, 0],
				name: 'Google Sheets',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: "=Invoice Number:{{ $json['Invoice Number'] }}\nClient Name:{{ $json['Client Name'] }}\nClient Email:{{ $json['Client Email'] }}\nTotal Amount:{{ $json['Total Amount'] }}\nInvoice Due Date:{{ $json['Invoice Date'] }}",
					batching: {},
					messages: {
						messageValues: [
							{
								message:
									'#Overview You are an telegram notification expert. You will receive invoice information. You will craft a message notifying the billing team of the invoice and the available information of the invoice. ',
							},
						],
					},
					promptType: 'define',
				},
				position: [1300, 0],
				name: 'Anthropic Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '={{  $json [output] }}',
					chatId: 'Redacted',
					additionalFields: {},
				},
				position: [1700, 0],
				name: 'Telegram',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [1880, 0], name: 'No Operation, do nothing' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.1,
			config: { parameters: { options: {} }, position: [840, 220], name: 'OpenAI Chat Model' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
			version: 1.3,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-sonnet-4-20250514',
						cachedResultName: 'Claude 4 Sonnet',
					},
					options: {},
				},
				position: [1380, 200],
				name: 'Anthropic Chat Model',
			},
		}),
	)
	.add(sticky('Upload Invoice Doc Trigger', { position: [-140, -200], width: 320, height: 680 }))
	.add(
		sticky('Extract Invoice Doc', {
			name: 'Sticky Note1',
			color: 6,
			position: [200, -200],
			width: 480,
			height: 680,
		}),
	)
	.add(
		sticky('Extract Information & Log', {
			name: 'Sticky Note2',
			color: 5,
			position: [700, -200],
			width: 540,
			height: 680,
		}),
	)
	.add(
		sticky('Telegram Notification', {
			name: 'Sticky Note3',
			color: 3,
			position: [1260, -200],
			width: 380,
			height: 680,
		}),
	)
	.add(
		sticky('Notification & End', {
			name: 'Sticky Note4',
			color: 4,
			position: [1660, -200],
			width: 440,
			height: 680,
		}),
	)
	.add(
		sticky(
			'📥 Invoice Intake & Notification Workflow\nThis automated n8n workflow monitors a Google Drive folder for newly uploaded invoice PDFs, extracts essential information (like client name, invoice number, amount, due date), logs the data into a Google Sheet for recordkeeping, and sends a formatted Telegram message to notify the billing team.\n\nFor step-by-step video build of workflows like this:\nhttps://www.youtube.com/@automatewithmarc\n\n✅ What This Workflow Does\n🕵️ Watches a Google Drive folder for new invoice files\n📄 Extracts data from PDF invoices using AI (LangChain Information Extractor)\n📊 Appends extracted data into a structured Google Sheet\n💬 Notifies the billing team via Telegram with invoice details\n🤖 Optionally uses Claude Sonnet AI model to format human-friendly summaries\n\n⚙️ How It Works – Step-by-Step\nTrigger: Workflow starts when a new PDF invoice is added to a specific Google Drive folder.\n\nDownload & Parse: The file is downloaded and its content extracted.\n\nData Extraction: AI-powered extractor pulls invoice details (invoice number, client, date, amount, etc.).\n\nLog to Google Sheets: All extracted data is appended to a predefined Google Sheet.\n\nAI Notification Formatting: An Anthropic Claude model formats a clear invoice notification message.\n\nTelegram Alert: The formatted summary is sent to a Telegram channel or group to alert the billing team.\n\n🧠 AI & Tools Used\nGoogle Drive Trigger & File Download\n\nPDF Text Extraction Node\n\nLangChain Information Extractor\n\nGoogle Sheets Node (Append Data)\n\nAnthropic Claude (Telegram Message Formatter)\n\nTelegram Node (Send Notification)\n\n🛠️ Setup Instructions\nGoogle Drive: Set up OAuth2 credentials and specify the folder ID to watch.\n\nGoogle Sheets: Link the workflow to your invoice tracking sheet.\n\nTelegram: Set up your Telegram bot and obtain the chat ID.\n\nAnthropic & OpenAI: Add your Claude/OpenAI credentials if formatting is enabled.\n\n💡 Use Cases\nAutomated bookkeeping and invoice tracking\n\nReal-time billing alerts for accounting teams\n\nAI-powered invoice ingestion and summary\n\n',
			{ name: 'Sticky Note5', color: 7, position: [-860, -200], width: 660, height: 1180 },
		),
	);
