const wf = workflow('', '')
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
						value: '12aSoGo009rsrhyJ_a4VP84m_NrWCsA3O',
						cachedResultUrl:
							'https://drive.google.com/drive/folders/12aSoGo009rsrhyJ_a4VP84m_NrWCsA3O',
						cachedResultName: 'Invoices',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				name: 'Google Drive Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://www.googleapis.com/drive/v3/files/{{ $json.id }}?alt=media',
					options: { response: { response: { responseFormat: 'file' } } },
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'googleDriveOAuth2Api',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [208, 0],
				name: 'HTTP Request',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.mistralAi',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
				},
				position: [416, 0],
				name: 'Extract text',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '=You are an expert in analyzing invoices.\n\nHere is an invoice that you should analyze: {{ $json.pages[0].markdown }}',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [624, 0],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: {
							To: '={{ $json.output.To }}',
							From: '={{ $json.output.From }}',
							'Due Date': '={{ $json.output.dueDate }}',
							'Invoice Date': '={{ $json.output.invoiceDate }}',
							'Link to File': "={{ $('Google Drive Trigger').item.json.webViewLink }}",
							'Invoice Number': '={{ $json.output.invoiceNumber }}',
							'Short Description': '={{ $json.output.shortDescription }}',
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
								id: 'From',
								type: 'string',
								display: true,
								required: false,
								displayName: 'From',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'To',
								type: 'string',
								display: true,
								required: false,
								displayName: 'To',
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
							{
								id: 'Short Description',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Short Description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Link to File',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Link to File',
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
							'https://docs.google.com/spreadsheets/d/14tyy2at8ZtfoQq4zGYph4DG7omv9uA9aXGH5KnQbPgs/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '14tyy2at8ZtfoQq4zGYph4DG7omv9uA9aXGH5KnQbPgs',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/14tyy2at8ZtfoQq4zGYph4DG7omv9uA9aXGH5KnQbPgs/edit?usp=drivesdk',
						cachedResultName: 'Invoices from Google Drive',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [976, 0],
				name: 'Append row in sheet',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [528, 208],
				name: 'OpenAI Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.3,
			config: {
				parameters: {
					jsonSchemaExample:
						'{\n	"invoiceNumber": "INV123",\n	"From": "John street 23, 12443 Berlin, Germany",\n    "To": "Smith street 33, 23222 Berlin, Germany",\n    "invoiceDate": "20/08/2025",\n    "dueDate": "25/08/2025",\n    "shortDescription": "It is an invoice about web development costs"\n}',
				},
				position: [832, 208],
				name: 'Structured Output Parser',
			},
		}),
	)
	.add(
		sticky(
			'## n8n Starter Session Tutorial\n\n[Watch the Tutorials](https://www.youtube.com/playlist?list=PLWYu7XaUG3XOJwOOGiX89SQ_w67vw3dq7)\n\nTutor: [Aemal Sayer](https://aemalsayer.com)',
			{ position: [-16, -208], width: 352 },
		),
	);
