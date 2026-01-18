const wf = workflow('c8SrVtTq7YyxoLlO', 'AI Lead Machine Agent', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: { buttonLabel: 'GO 🚀', appendAttribution: false },
					formTitle: 'Lead Machine',
					formFields: {
						values: [
							{
								fieldLabel: 'Business Type',
								placeholder: 'e.g. Plumber',
								requiredField: true,
							},
							{
								fieldLabel: 'Location',
								placeholder: 'e.g. Rome, Italy',
								requiredField: true,
							},
							{
								fieldType: 'number',
								fieldLabel: 'Lead Number',
								requiredField: true,
							},
							{
								fieldType: 'dropdown',
								fieldLabel: 'Email Style',
								fieldOptions: {
									values: [
										{ option: 'Friendly' },
										{ option: 'Professional' },
										{ option: 'Simple' },
									],
								},
							},
						],
					},
					formDescription: 'Provide the Info Below',
				},
				position: [64, 96],
				name: 'On form submission',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=Apify_Actor_Endpoint_URL',
					options: {},
					jsonBody:
						'={\n    "includeWebResults": false,\n    "language": "en",\n    "locationQuery": "{{ $json.Location }}",\n    "maxCrawledPlacesPerSearch": {{ $json[\'Lead Number\'] }},\n    "maxImages": 0,\n    "maximumLeadsEnrichmentRecords": 0,\n    "scrapeContacts": false,\n    "scrapeDirectories": false,\n    "scrapeImageAuthors": false,\n    "scrapePlaceDetailPage": false,\n    "scrapeReviewsPersonalData": true,\n    "scrapeTableReservationProvider": false,\n    "searchStringsArray": [\n        "{{ $json[\'Business Type\'] }}"\n    ],\n    "skipClosedPlaces": false\n}',
					sendBody: true,
					specifyBody: 'json',
				},
				position: [320, 96],
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
								id: '0906e21a-0958-433e-b400-8694915ef3c9',
								operator: { type: 'string', operation: 'exists', singleValue: true },
								leftValue: '={{ $json.website }}',
								rightValue: '',
							},
						],
					},
				},
				position: [576, 96],
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.informationExtractor',
			version: 1.2,
			config: {
				parameters: {
					text: '=Website: {{ $json.website }}',
					options: {},
					attributes: {
						attributes: [
							{
								name: 'Email Address',
								required: true,
								description:
									'=find out the best only one email address from the website after scraping the website. The mail address have to be in ideal format.',
							},
						],
					},
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: { parameters: { options: {} }, name: 'Google Gemini Chat Model' },
					}),
				},
				position: [-64, 448],
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
						combinator: 'and',
						conditions: [
							{
								id: '0601f2d2-2522-471e-9e11-29498a47e19a',
								operator: { type: 'string', operation: 'contains' },
								leftValue: "={{ $json.output['Email Address'] }}",
								rightValue: '@',
							},
						],
					},
				},
				position: [352, 448],
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							Address: "={{ $('Filter').item.json.address }}",
							Website: "={{ $('Filter').item.json.website }}",
							Category: "={{ $('Filter').item.json.categoryName }}",
							'Company Name': "={{ $('Filter').item.json.title }}",
							'Email Address': "={{ $json.output['Email Address'] }}",
							'Phone Nummber': "={{ $('Filter').item.json.phoneUnformatted }}",
						},
						schema: [
							{
								id: 'Company Name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Company Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Category',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Category',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Website',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Website',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Phone Nummber',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Phone Nummber',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Email Address',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Email Address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Address',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Cold Mail Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Cold Mail Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'SEND Time',
								type: 'string',
								display: true,
								required: false,
								displayName: 'SEND Time',
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
							'https://docs.google.com/spreadsheets/d/1LmOvSzCOAlrgxQg5r77eVkyJWw3V0VDUAWgkoHWql1Y/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1LmOvSzCOAlrgxQg5r77eVkyJWw3V0VDUAWgkoHWql1Y',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1LmOvSzCOAlrgxQg5r77eVkyJWw3V0VDUAWgkoHWql1Y/edit?usp=drivesdk',
						cachedResultName: 'n8n Test',
					},
				},
				position: [640, 432],
				name: 'Append row in sheet',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-400, 848], name: 'Loop Over Items' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 1 }, position: [32, 864] },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.informationExtractor',
			version: 1.2,
			config: {
				parameters: {
					text: "=You are a perfect cold mail generator for a Digital Marketing Agency named Upward Engine.\n\nHere's the Information about the Recipient:\n\nCompany Name: {{ $('Loop Over Items').item.json['Company Name'] }}\nBusiness Type: {{ $('Loop Over Items').item.json.Category }}\n\nEmail Style / Email Tune : {{ $json['Email Style'] }}\n\nThe Email style is given just to understand how the mail will be.\n\nInstructions:\n\n1. Always start with giving a greting to the Company like Hi Company Name,\n2. Always use We not I.\n3. Mail have to be professional, Clean and to the point\n4. At last give a Signeture Like:\n   [Your Name]\n  [Your Company/Agency Name]",
					options: {},
					attributes: {
						attributes: [
							{
								name: 'Mail Subject',
								required: true,
								description: 'Eye catchy mail Subject for the cold mail',
							},
							{
								name: 'Mail Body',
								required: true,
								description: '=body message of the mail, a perfect and clear cold mail.',
							},
						],
					},
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
								options: {},
							},
							name: 'OpenAI Chat Model',
						},
					}),
				},
				position: [352, 864],
				name: 'Information Extractor1',
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
								id: '8ab73a5e-6659-4615-9f03-a1b3dacaa42e',
								name: 'Send Time',
								type: 'string',
								value: '={{$now.toFormat("MM-dd-yyyy (h:mm a)")}}',
							},
							{
								id: 'a102af99-f990-4f54-aa19-96a4c8002a9b',
								name: 'Email Address',
								type: 'string',
								value: "={{ $('Wait').item.json['Email Address'] }}",
							},
						],
					},
				},
				position: [768, 864],
				name: 'Edit Fields1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: "={{ $json['Email Address'] }}",
					message: "={{ $('Information Extractor1').item.json.output['Mail Body'] }}",
					options: { appendAttribution: false },
					subject: "={{ $('Information Extractor1').item.json.output['Mail Subject'] }}",
					emailType: 'text',
				},
				position: [992, 864],
				name: 'Send a message',
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
							'SEND Time': "={{ $('Edit Fields1').item.json['Send Time'] }}",
							'Email Address': "={{ $('Edit Fields1').item.json['Email Address'] }}",
							'Cold Mail Status': '✅',
						},
						schema: [
							{
								id: 'Company Name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Company Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Category',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Category',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Website',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Website',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Phone Nummber',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Phone Nummber',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Email Address',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Email Address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Address',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Cold Mail Status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Cold Mail Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'SEND Time',
								type: 'string',
								display: true,
								required: false,
								displayName: 'SEND Time',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Email Address'],
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
							'https://docs.google.com/spreadsheets/d/1LmOvSzCOAlrgxQg5r77eVkyJWw3V0VDUAWgkoHWql1Y/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1LmOvSzCOAlrgxQg5r77eVkyJWw3V0VDUAWgkoHWql1Y',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1LmOvSzCOAlrgxQg5r77eVkyJWw3V0VDUAWgkoHWql1Y/edit?usp=drivesdk',
						cachedResultName: 'n8n Test',
					},
				},
				position: [1248, 864],
				name: 'Append or update row in sheet',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [640, 608], name: 'No Operation, do nothing' },
		}),
	)
	.add(sticky('# Business Data', { color: 3, width: 752, height: 336 }))
	.add(
		sticky('# Getting the Email Address', {
			name: 'Sticky Note1',
			color: 4,
			position: [-192, 368],
			width: 1136,
			height: 368,
		}),
	)
	.add(
		sticky('# Email Send', {
			name: 'Sticky Note2',
			color: 5,
			position: [-656, 768],
			width: 2096,
			height: 448,
		}),
	)
	.add(
		sticky(
			'## Start here: Step-by Step Youtube Tutorial :star:\n\n[![I Built an Auto Lead Finder AI Agent](https://img.youtube.com/vi/3UwutV1x3mA/sddefault.jpg)](https://youtu.be/3UwutV1x3mA?si=FtH1dNr5dtnOFedD)',
			{ name: 'Sticky Note3', position: [1712, -16], width: 480, height: 464 },
		),
	)
	.add(
		sticky(
			'\n\n---\n\n# 🛠 Setup Guide\n\nFollow these steps to get started:\n\n1. **Set up the Lead Machine Form**\n   Customize the form fields (Business Type, Location, Lead Number, Email Style) in the **Form Trigger** node. This is how you collect the target lead criteria.\n\n2. **Plug in your [Apify](https://apify.com/) API endpoint**\n   Replace `Apify_Actor_Endpoint_URL` in the **HTTP Request** node with your own Apify actor URL to scrape business data.\n\n3. **Add your [Google Gemini](https://aistudio.google.com/apikey) credentials**\n   This is used in the **Information Extractor** node to find the best email address from a business website.\n\n4. **Connect your [Google Sheets](https://docs.google.com/spreadsheets/)**\n   Link the sheet in both **Append row** and **Append/Update row** nodes. Make sure your sheet has columns for Company Name, Website, Phone, Email, Address, Category, Cold Mail Status, and Send Time.\n\n5. **Add your [OpenAI](https://platform.openai.com/) API key**\n   This powers the cold email generation in the **Information Extractor1** node for subject & body creation.\n\n6. **Connect your [Gmail](https://mail.google.com/) account**\n   In the **Send a message** node, link your Gmail account to send the cold emails automatically.\n\nOnce all connections are set, your workflow will **collect leads, store them, and send cold emails automatically** 🚀\n\n---\n',
			{ name: 'Sticky Note4', position: [1696, 544], width: 1200, height: 672 },
		),
	);
