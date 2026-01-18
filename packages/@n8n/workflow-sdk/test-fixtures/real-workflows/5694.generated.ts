const wf = workflow('TEMPLATE_WORKFLOW_ID', 'Newsletter', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-40, -180], name: "When clicking 'Test workflow'" },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: {},
					filtersUI: {
						values: [{ lookupValue: 'Pending', lookupColumn: 'Status' }],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit#gid=0',
						cachedResultName: 'Topic',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: 'YOUR_GOOGLE_SHEET_ID_HERE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit?usp=drivesdk',
						cachedResultName: 'Newsletter',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [180, -180],
				name: 'Get topic from newsletter sheet',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: '@n8n/n8n-nodes-langchain.openAi',
					version: 1.8,
					config: {
						parameters: {
							modelId: {
								__rl: true,
								mode: 'list',
								value: 'gpt-4o',
								cachedResultName: 'GPT-4O',
							},
							options: {},
							messages: {
								values: [
									{
										content:
											'=Create an HTML newsletter on the topic:{{ $json.Topic }}. \n Include these hook sentences:{{ $json.hooks }} . \n Structure with a header, body paragraphs, and footer\n',
									},
								],
							},
						},
						credentials: {
							openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
						},
						position: [620, -180],
						name: 'Create HTML for Newsletter',
					},
				}),
				null,
			],
			{
				version: 2.2,
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
								id: '2d883784-6213-45b4-944f-55c0ffcc19b6',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.Date }}',
								rightValue: "={{ new Date().toLocaleDateString('en-US') }}",
							},
						],
					},
				},
				name: 'Validate Status as Pending',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// Get HTML content from current input\nconst htmlContent = $input.first().json.message.content;\n\n// Generate filename with current date\nconst currentDate = new Date().toISOString().split('T')[0];\nconst filename = `document_${currentDate}.html`;\n\n// Convert string to binary buffer\nconst buffer = Buffer.from(htmlContent, 'utf8');\n\nreturn [{\n  json: {\n    fileName: filename,\n    mimeType: 'text/html'\n  },\n  binary: {\n    data: buffer\n  }\n}];",
				},
				position: [996, -180],
				name: 'Prepare Data to create word doc',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "=newsletter-{{ $('Get topic from newsletter sheet').item.json.Date }}.html",
					driveId: {
						__rl: true,
						mode: 'list',
						value: 'My Drive',
						cachedResultUrl: 'https://drive.google.com/drive/my-drive',
						cachedResultName: 'My Drive',
					},
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: 'YOUR_GOOGLE_DRIVE_FOLDER_ID',
						cachedResultUrl: 'https://drive.google.com/drive/folders/YOUR_GOOGLE_DRIVE_FOLDER_ID',
						cachedResultName: 'Newsletter',
					},
					inputDataFieldName: '=data',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [1216, -180],
				name: 'Upload doc to google drive',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message: '=Review the attached newsletter  {{ $json.webViewLink }}',
					options: {},
					subject:
						"=Newsletter Preview for {{ $('Get topic from newsletter sheet').item.json.Date }} and HTML body attached",
					emailType: 'text',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1436, -180],
				name: 'Send an email to admin',
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
							Date: "={{ $('Get topic from newsletter sheet').item.json.Date }}",
							Status: 'Generated',
							Timestamp: "={{ $('Upload doc to google drive').item.json.createdTime }}",
							'Document URL': "={{ $('Upload doc to google drive').item.json.webViewLink }}",
						},
						schema: [
							{
								id: 'Date',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Topic',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Topic',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'hooks',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'hooks',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Timestamp',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Timestamp',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Document URL',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Document URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
								display: true,
								removed: true,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Date'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit#gid=0',
						cachedResultName: 'Topic',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: 'YOUR_GOOGLE_SHEET_ID_HERE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit?usp=drivesdk',
						cachedResultName: 'Newsletter',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1656, -180],
				name: 'Update Status as Generated',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{}] } }, position: [-40, 230] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit#gid=0',
						cachedResultName: 'Topic',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: 'YOUR_GOOGLE_SHEET_ID_HERE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit?usp=drivesdk',
						cachedResultName: 'Newsletter',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [180, 230],
				name: 'Pick records to send email to client',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.5,
					config: {
						parameters: {
							options: {},
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'YOUR_EMAIL_SHEET_GID',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit#gid=YOUR_EMAIL_SHEET_GID',
								cachedResultName: 'Email',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: 'YOUR_GOOGLE_SHEET_ID_HERE',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit?usp=drivesdk',
								cachedResultName: 'Newsletter',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [620, 230],
						name: 'Get Client email address',
					},
				}),
				null,
			],
			{
				version: 2.2,
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
								id: 'b3730359-d11f-4a9c-aa5f-f4dcc1f0702e',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.Status }}',
								rightValue: 'Approved',
							},
						],
					},
				},
				name: 'Validate Status as Approved',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [840, 230], name: 'Loop Over Items' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							Date: "={{ $('Pick records to send email to client').item.json.Date }}",
							Status: 'Sent',
						},
						schema: [
							{
								id: 'Date',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Topic',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Topic',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'hooks',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'hooks',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Timestamp',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Timestamp',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Document URL',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Document URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
								display: true,
								removed: true,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Date'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit#gid=0',
						cachedResultName: 'Topic',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: 'YOUR_GOOGLE_SHEET_ID_HERE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/YOUR_GOOGLE_SHEET_ID_HERE/edit?usp=drivesdk',
						cachedResultName: 'Newsletter',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1060, 80],
				name: 'Update status as Sent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: '={{ $json.Email }}',
					message:
						"=Attached is the newsletter  {{ $('Pick records to send email to client').item.json['Document URL'] }}",
					options: {},
					subject: 'Newsletter',
					emailType: 'text',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1060, 280],
				name: 'Send email to client',
			},
		}),
	);
