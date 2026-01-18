const wf = workflow('[WORKFLOW_ID_REMOVED]', 'HR CVs Filter', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [-1232, 352],
				name: 'Message Trigger',
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
							url: '=https://api.telegram.org/bot[YOUR_BOT_TOKEN]/getFile?file_id={{ $json.message.document.file_id }}',
							options: {},
						},
						position: [-624, 256],
						name: 'Download CV File',
					},
				}),
				node({
					type: 'n8n-nodes-base.telegram',
					version: 1.2,
					config: {
						parameters: {
							text: 'Please send your CV in PDF format only',
							chatId: '={{ $json.message.chat.id }}',
							additionalFields: {},
						},
						credentials: {
							telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
						},
						position: [-928, 688],
						name: 'PDF Request',
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
								id: 'ff01b24f-92a6-4e95-9349-5f78a7ff1e74',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: "={{ $json.message.document.mime_type === 'application/pdf' }}",
								rightValue: '',
							},
						],
					},
				},
				name: 'File Validation',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.telegram.org/file/bot[YOUR_BOT_TOKEN]/{{ $json.result.file_path }}',
					options: {},
				},
				position: [-384, 256],
				name: 'Download Actual File',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $('Message Trigger').item.json.message.document.file_name }}",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: '[YOUR_FOLDER_ID]',
						cachedResultUrl: 'https://drive.google.com/drive/folders/[YOUR_FOLDER_ID]',
						cachedResultName: 'HR-CVs',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				name: 'Store CV',
			},
		}),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.googleDrive',
					version: 3,
					config: {
						parameters: {
							name: "={{ $('Message Trigger').item.json.message.document.file_name }}",
							driveId: { __rl: true, mode: 'list', value: 'My Drive' },
							options: {},
							folderId: {
								__rl: true,
								mode: 'list',
								value: '[YOUR_FOLDER_ID]',
								cachedResultUrl: 'https://drive.google.com/drive/folders/[YOUR_FOLDER_ID]',
								cachedResultName: 'HR-CVs',
							},
						},
						credentials: {
							googleDriveOAuth2Api: {
								id: 'credential-id',
								name: 'googleDriveOAuth2Api Credential',
							},
						},
						name: 'Store CV',
					},
				}),
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: '=https://api.telegram.org/file/bot[YOUR_BOT_TOKEN]/{{ $json.result.file_path }}',
							options: {},
						},
						position: [-384, 256],
						name: 'Download Actual File',
					},
				}),
			],
			{ version: 3.2, parameters: { mode: 'chooseBranch', useDataOfInput: 2 } },
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'pdf' },
				position: [0, 256],
				name: 'Extract cv content',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: '=You are an expert HR assistant specializing in CV analysis and candidate qualification.From {{ $json.text }} Your task is to extract key information from CV content and categorize candidates based on their experience level.\nInstructions:\nAnalyze the provided CV text and extract the following information with high accuracy:\n\nFull Name: Extract the candidate\'s complete name (first and last name)\nPhone Number: Find and format phone numbers (include country code if available without + )\nEmail Address: Extract the primary email address\nJob Title: Identify the current or most recent job title/position\nExperience Analysis: Calculate total years of professional experience and categorize\n\nExperience Categorization Rules:\n\nJunior: 0-3 years of professional experience\nSenior: 3-6 years of professional experience\nExpert: 6+ years of professional experience\n\nExperience Calculation Guidelines:\n\nCount only professional work experience (internships count as 0.5x)\nCalculate total duration from all positions\nIf less than 12 months, express in months\nIf 12+ months, express in years (round to 1 decimal place)\nOverlapping positions should not be double-counted\nConsider career gaps but focus on actual work experience\n\n\nOutput Format:\nReturn ONLY a valid JSON object in this exact format:\n\n{\n  "name": "Full Name Here",\n  "phone_number": "+1234567890 or Not Found",\n  "email": "email@example.com or Not Found",\n  "job_title": "Current/Recent Job Title or Not Found",\n  "experience": ["Category: X.X years"]\n}',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {} },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model',
						},
					}),
				},
				position: [192, 256],
				name: 'Qualify CV Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '91323867-f4bf-4bcc-a696-6524795e082f',
								name: 'full name',
								type: 'string',
								value:
									'={{ JSON.parse($json["output"].replace(/```json|```/g, "").trim()).name }}\n',
							},
							{
								id: '33d44685-8463-4730-8bb4-c1f006f6a466',
								name: 'phone number',
								type: 'string',
								value:
									'={{ JSON.parse($json["output"].replace(/```json|```/g, "").trim()).phone_number }}\n',
							},
							{
								id: '915dec92-ad74-423a-a81e-30b027100eb1',
								name: 'experiene',
								type: 'string',
								value:
									'={{ JSON.parse($json["output"].replace(/```json|```/g, "").trim()).experience }}',
							},
							{
								id: '5c7cbab9-8090-436e-962f-6626f6855393',
								name: 'job title',
								type: 'string',
								value:
									'={{ JSON.parse($json["output"].replace(/```json|```/g, "").trim()).job_title }}\n',
							},
							{
								id: '27984293-5bcd-4b43-9316-95ae05200018',
								name: 'email',
								type: 'string',
								value:
									'={{ JSON.parse($json["output"].replace(/```json|```/g, "").trim()).email }}',
							},
						],
					},
				},
				position: [608, 256],
				name: 'Clean & Map Extracted Data',
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
							CV: '="CV": "=https://drive.google.com/file/d/{{ $node[\'Store CV\'].json.id }}/view"',
							Name: '={{ $json["full name"] }}',
							Email: '={{ $json.email }}',
							'Job Title': "={{ $json['job title'] }}",
							Experience: '={{ $json.experiene }}',
							'Phone Number': '={{ $json["phone number"] }}',
						},
						schema: [
							{
								id: 'Name',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Experience',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Experience',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Email',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Email',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Phone Number',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Phone Number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CV',
								type: 'string',
								display: true,
								required: false,
								displayName: 'CV',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Job Title',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Job Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Name'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/[YOUR_SPREADSHEET_ID]/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '[YOUR_SPREADSHEET_ID]',
						cachedResultUrl: 'https://docs.google.com/spreadsheets/d/[YOUR_SPREADSHEET_ID]/edit',
						cachedResultName: 'HR CV Filter',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [800, 256],
				name: 'Save Candidate Info to Sheet',
			},
		}),
	)
	.add(
		sticky('Captures incoming CV PDFs from candidates', {
			color: 3,
			position: [-1280, 272],
			width: 192,
			height: 224,
		}),
	)
	.add(
		sticky('Filters out non-PDF submissions', {
			name: 'Sticky Note1',
			color: 4,
			position: [-992, 272],
			width: 192,
			height: 224,
		}),
	)
	.add(
		sticky(' Gets the file download link from Telegram', {
			name: 'Sticky Note2',
			color: 5,
			position: [-672, 176],
			width: 192,
			height: 208,
		}),
	)
	.add(
		sticky('Downloads the actual PDF file', {
			name: 'Sticky Note3',
			color: 4,
			position: [-432, 176],
			width: 192,
			height: 208,
		}),
	)
	.add(
		sticky(' Sends a message asking the user to resend the CV in PDF format if validation fails.', {
			name: 'Sticky Note4',
			color: 5,
			position: [-960, 576],
			width: 176,
			height: 256,
		}),
	)
	.add(
		sticky('Uploads the downloaded PDF file to Google Drive.', {
			name: 'Sticky Note5',
			color: 5,
			position: [-48, -64],
			width: 192,
			height: 208,
		}),
	)
	.add(
		sticky('Combines the file storage and download paths to pass data forward to extraction.', {
			name: 'Sticky Note6',
			color: 5,
			position: [-48, 448],
			width: 192,
			height: 240,
		}),
	)
	.add(
		sticky('Extracts text content from the uploaded PDF file for analysis.', {
			name: 'Sticky Note7',
			color: 4,
			position: [-48, 192],
			width: 176,
			height: 224,
		}),
	)
	.add(
		sticky(
			'Analyzes CV text and extracts structured data like name, phone number, email, experience, and job title.',
			{ name: 'Sticky Note8', color: 6, position: [208, 160], height: 240 },
		),
	)
	.add(
		sticky(
			' Cleans and maps the structured JSON AI output into individual fields for use in Google Sheets',
			{ name: 'Sticky Note9', color: 5, position: [544, 160], width: 192, height: 256 },
		),
	)
	.add(
		sticky(
			'Saves the extracted candidate information and CV link into a Google Sheet, updating existing entries if needed.',
			{ name: 'Sticky Note10', color: 4, position: [768, 144], width: 224, height: 272 },
		),
	);
