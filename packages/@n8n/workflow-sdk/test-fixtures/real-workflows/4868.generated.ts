const wf = workflow('x4DcB7sVAeVmIrMD', 'Invoice-Parser-Lite', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [320, -80], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					filter: {
						folderId: {
							__rl: true,
							mode: 'list',
							value: '15Xpvr0Q4cBwYv1e_jNI8JO4LKAQmgYC2',
							cachedResultUrl:
								'https://drive.google.com/drive/folders/15Xpvr0Q4cBwYv1e_jNI8JO4LKAQmgYC2',
							cachedResultName: 'Invoices_Inbox',
						},
					},
					options: {},
					resource: 'fileFolder',
					returnAll: true,
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [880, 260],
				name: 'Load files from Google Drive folder',
			},
		}),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.3,
					config: {
						parameters: {
							options: {},
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1WNXkB6SpJyGtPVcHmj1oaaDFikyACCuq6RY5rEPH4OQ/edit#gid=0',
								cachedResultName: 'Sheet1',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1WNXkB6SpJyGtPVcHmj1oaaDFikyACCuq6RY5rEPH4OQ',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1WNXkB6SpJyGtPVcHmj1oaaDFikyACCuq6RY5rEPH4OQ/edit?usp=drivesdk',
								cachedResultName: 'n8n_ocr_invoices',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [1160, -80],
						name: 'Get already processed rows from Sheets',
					},
				}),
				node({
					type: 'n8n-nodes-base.googleDrive',
					version: 3,
					config: {
						parameters: {
							filter: {
								folderId: {
									__rl: true,
									mode: 'list',
									value: '15Xpvr0Q4cBwYv1e_jNI8JO4LKAQmgYC2',
									cachedResultUrl:
										'https://drive.google.com/drive/folders/15Xpvr0Q4cBwYv1e_jNI8JO4LKAQmgYC2',
									cachedResultName: 'Invoices_Inbox',
								},
							},
							options: {},
							resource: 'fileFolder',
							returnAll: true,
						},
						credentials: {
							googleDriveOAuth2Api: {
								id: 'credential-id',
								name: 'googleDriveOAuth2Api Credential',
							},
						},
						position: [880, 260],
						name: 'Load files from Google Drive folder',
					},
				}),
			],
			{
				version: 3,
				parameters: {
					mode: 'combine',
					options: {},
					joinMode: 'keepNonMatches',
					outputDataFrom: 'input2',
					fieldsToMatchString: 'id',
				},
				name: 'Filter processed files',
			},
		),
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
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [1560, 140],
				name: 'Download file for OCR',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: 'https://api.mistral.ai/v1/files',
							method: 'POST',
							options: {},
							sendBody: true,
							contentType: 'multipart-form-data',
							authentication: 'predefinedCredentialType',
							bodyParameters: {
								parameters: [
									{ name: 'purpose', value: 'ocr' },
									{
										name: 'file',
										parameterType: 'formBinaryData',
										inputDataFieldName: 'data',
									},
								],
							},
							nodeCredentialType: 'mistralCloudApi',
						},
						credentials: {
							mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
						},
						position: [2080, 340],
						name: 'Mistral Upload1',
					},
				}),
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: 'https://api.mistral.ai/v1/files',
							method: 'POST',
							options: {},
							sendBody: true,
							contentType: 'multipart-form-data',
							authentication: 'predefinedCredentialType',
							bodyParameters: {
								parameters: [
									{ name: 'purpose', value: 'ocr' },
									{
										name: 'file',
										parameterType: 'formBinaryData',
										inputDataFieldName: 'data',
									},
								],
							},
							nodeCredentialType: 'mistralCloudApi',
						},
						credentials: {
							mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
						},
						position: [2060, 120],
						name: 'Mistral Upload',
					},
				}),
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
								id: '54e4c552-cdf0-4707-8723-65bcf41d8a96',
								operator: { type: 'string', operation: 'startsWith' },
								leftValue: '={{$binary.data.mimeType}}',
								rightValue: 'image/',
							},
						],
					},
				},
				name: 'If',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.mistral.ai/v1/files/{{ $json.id }}/url',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					queryParameters: { parameters: [{ name: 'expiry', value: '24' }] },
					headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
					nodeCredentialType: 'mistralCloudApi',
				},
				credentials: {
					mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
				},
				position: [2260, 340],
				name: 'Mistral Signed URL1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.mistral.ai/v1/ocr',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "model": "mistral-ocr-latest",\n  "document": {\n    "type": "image_url",\n    "image_url": "{{ $json.url }}"\n  }\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'mistralCloudApi',
				},
				credentials: {
					mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
				},
				position: [2460, 320],
				name: 'Mistral IMAGE OCR',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// Node name: Join Pages\n// 1. Grab all incoming documents\nconst docs = $input.all();\n\n// 2. Pull in your schema once and filter it\nlet schema = $('extract schema').first().json.schema;\nconst toRemove = ['Id', 'row_number'];\nschema = schema.filter(f => !toRemove.includes(f));\n\n// 3. Build one output per document\nconst results = docs.map(doc => {\n  // join only that doc’s pages\n  const fullText = doc.json.pages\n    .map(p => p.markdown)\n    .join('\\n\\n');\n\n  return {\n    json: {\n      ocr_text: fullText,\n      schema,\n    },\n  };\n});\n\nreturn results;",
				},
				position: [2840, 100],
				name: 'Join OCR Pages and remove id field',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: '=Extract the following fields from the invoice text:\n\n{{ JSON.stringify($json.schema) }}\n\nImportant: Double-check that all line items are extracted without omission.\n\n- You must respond ONLY with valid raw rendered JSON.\n- Do NOT include the word "json".\n- Do NOT include the word "```json".\n- Do NOT use triple backticks or markdown formatting.\n- Do NOT wrap the response in any key like "output".\n- Do NOT write anything starting at output directly start with valid root-level JSON.\n- Only respond with a valid, root-level JSON object.\n\nText to extract data from: {{ $json.ocr_text }}',
					options: {
						systemMessage:
							'=You are a document parsing assistant designed to extract structured data from invoice PDFs for automated uploading and validation in a financial system.',
					},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: {
								options: {},
								modelName: 'models/gemini-2.5-flash-preview-05-20',
							},
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model',
						},
					}),
				},
				position: [3020, 60],
				name: 'Field Extractor',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// 1. Get the array of processed files (with id & name)\nconst processed = $('Filter processed files').all();\n\n// 2. Take each LLM output in turn, parse it, inject the matching ID, and return\nreturn $input.all().map((item, index) => {\n  // parse the JSON string your chat node returned\n  const data = JSON.parse(item.json.output);\n\n  // look up the corresponding Drive file ID by array index\n  data.Id   = processed[index]?.json.id ?? null;\n\n\n  // emit for your Sheets node\n  return { json: data };\n});",
				},
				position: [3380, 60],
				name: 'Add google drive Id back',
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
						value: {},
						schema: [
							{
								id: 'Id',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Invoice No',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Invoice No',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Invoice date',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Invoice date',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Invoice Period',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Invoice Period',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Gross Amount incl. VAT ',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Gross Amount incl. VAT ',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IBAN',
								type: 'string',
								display: true,
								required: false,
								displayName: 'IBAN',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'autoMapInputData',
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
							'https://docs.google.com/spreadsheets/d/1WNXkB6SpJyGtPVcHmj1oaaDFikyACCuq6RY5rEPH4OQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1WNXkB6SpJyGtPVcHmj1oaaDFikyACCuq6RY5rEPH4OQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1WNXkB6SpJyGtPVcHmj1oaaDFikyACCuq6RY5rEPH4OQ/edit?usp=drivesdk',
						cachedResultName: 'n8n_ocr_invoices',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [3640, 60],
				name: 'Save data to Google Sheets',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.mistral.ai/v1/files/{{ $json.id }}/url',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					queryParameters: { parameters: [{ name: 'expiry', value: '24' }] },
					headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
					nodeCredentialType: 'mistralCloudApi',
				},
				credentials: {
					mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
				},
				position: [2260, 120],
				name: 'Mistral Signed URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.mistral.ai/v1/ocr',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "model": "mistral-ocr-latest",\n  "document": {\n    "type": "document_url",\n    "document_url": "{{ $json.url }}"\n  },\n  "include_image_base64": true\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'mistralCloudApi',
				},
				credentials: {
					mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
				},
				position: [2460, 100],
				name: 'Mistral DOC OCR',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {
						returnFirstMatch: false,
						dataLocationOnSheet: {
							values: { firstDataRow: 1, rangeDefinition: 'specifyRange' },
						},
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1WNXkB6SpJyGtPVcHmj1oaaDFikyACCuq6RY5rEPH4OQ/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1WNXkB6SpJyGtPVcHmj1oaaDFikyACCuq6RY5rEPH4OQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1WNXkB6SpJyGtPVcHmj1oaaDFikyACCuq6RY5rEPH4OQ/edit?usp=drivesdk',
						cachedResultName: 'n8n_ocr_invoices',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [680, -80],
				name: 'Get Fields Schema',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Grab the keys from the first row\nconst schema = Object.keys($input.all()[0].json);\n\n// Return a single item whose JSON is just that schema array\nreturn [\n  { json: { schema } }\n];',
				},
				position: [920, -80],
				name: 'extract schema',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleDriveTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'fileCreated',
					options: { fileType: 'all' },
					pollTimes: { item: [{}] },
					triggerOn: 'specificFolder',
					folderToWatch: {
						__rl: true,
						mode: 'list',
						value: '15Xpvr0Q4cBwYv1e_jNI8JO4LKAQmgYC2',
						cachedResultUrl:
							'https://drive.google.com/drive/folders/15Xpvr0Q4cBwYv1e_jNI8JO4LKAQmgYC2',
						cachedResultName: 'Invoices_Inbox',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [320, 260],
				name: 'On new file in Google Drive',
			},
		}),
	)
	.add(
		sticky('### Modify Folder source', { color: 4, position: [820, 460], width: 220, height: 80 }),
	)
	.add(
		sticky(
			'### File Ids\nYou can view the files using Id from the first column. replace the <Id> below\nhttps://drive.google.com/file/d/<Id>/view',
			{ name: 'Sticky Note1', position: [3560, 260], width: 320, height: 100 },
		),
	)
	.add(
		sticky('### Set interval for checking drive folder and pull new files', {
			name: 'Sticky Note2',
			color: 4,
			position: [260, 480],
			width: 220,
			height: 80,
		}),
	)
	.add(
		sticky(
			'### Select Sheet\n  \nAdd column headers in the sheet to which you save data on row one to specify which fields you are interested in extracting. ',
			{ name: 'Sticky Note3', color: 4, position: [580, -380], width: 300, height: 140 },
		),
	)
	.add(
		sticky('### Select sheet', {
			name: 'Sticky Note4',
			color: 4,
			position: [1120, -180],
			width: 200,
			height: 80,
		}),
	)
	.add(
		sticky('### Select sheet to save data (same as at the start)', {
			name: 'Sticky Note5',
			color: 4,
			position: [3600, -40],
			width: 200,
			height: 80,
		}),
	)
	.add(
		sticky(
			'>> ### First column header in cell A1 MUST BE "Id". Id tracks the google drive Id and ensures the workflow is not processing previously processed files',
			{ name: 'Sticky Note6', color: 3, position: [580, -220], width: 300, height: 120 },
		),
	)
	.add(
		sticky('Uses drive ID - no need to modify', {
			name: 'Sticky Note7',
			color: 2,
			position: [1540, 40],
			width: 160,
			height: 80,
		}),
	)
	.add(
		sticky('Requires Mistral API Key for La Platforme\nhttps://mistral.ai/products/la-plateforme', {
			name: 'Sticky Note8',
			color: 2,
			position: [2040, -20],
			width: 520,
			height: 80,
		}),
	);
