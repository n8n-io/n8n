const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{}] } }, position: [-2220, 2160] },
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
						value: 1782913168,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit#gid=1782913168',
						cachedResultName: 'Settings',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit?usp=drivesdk',
						cachedResultName: 'Copy of Lead Machine - Ghost Genius',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-2020, 2160],
				name: 'Get Settings1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					options: {},
					aggregate: 'aggregateAllItemData',
					destinationFieldName: 'settings',
				},
				position: [-1800, 2160],
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
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit#gid=0',
								cachedResultName: 'Companies',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit?usp=drivesdk',
								cachedResultName: 'Copy of Lead Machine - Ghost Genius',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [-1360, 2160],
						name: 'Companies Recovery',
					},
				}),
				node({
					type: 'n8n-nodes-base.stopAndError',
					version: 1,
					config: {
						parameters: {
							errorMessage: 'Missing API Key or Account ID in the Google Sheet',
						},
						position: [-1340, 2420],
						name: 'Missing API Key or Account ID1',
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
								id: '1fb2a486-8581-4d1e-9a83-26992e4ff505',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: "={{ $json.settings[6]['Value (edit with your use case)'] }}",
								rightValue: '',
							},
							{
								id: '35ea5c51-10f6-4fe1-b802-9cbd202d8381',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: "={{ $json.settings[2]['Value (edit with your use case)'] }}",
								rightValue: '',
							},
						],
					},
				},
				name: 'If1',
			},
		),
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
								id: '146a686b-6a22-4a33-8e04-a4e7d0fc3eb9',
								operator: { type: 'number', operation: 'gte' },
								leftValue: '={{ $json.Score }}',
								rightValue: 7,
							},
							{
								id: '31a8bdd6-1f27-4dec-9fbf-f5895087d54b',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.State }}',
								rightValue: 'Qualified',
							},
						],
					},
				},
				position: [-1160, 2160],
				name: 'Filter Score and State',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.limit',
			version: 1,
			config: { parameters: { maxItems: 100 }, position: [-960, 2160] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-640, 2160], name: 'Loop Over Items' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.ghostgenius.fr/v2/private/sales-navigator',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: {
						parameters: [
							{
								name: 'current_company',
								value: "={{ $('Loop Over Items').item.json.ID }}",
							},
							{
								name: 'account_id',
								value:
									"={{ $('Aggregate').item.json.settings[2]['Value (edit with your use case)'] }}",
							},
							{
								name: 'current_title',
								value:
									"={{ $('Aggregate').item.json.settings[3]['Value (edit with your use case)'] }}",
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value:
									"=Bearer {{ $('Aggregate').item.json.settings[6]['Value (edit with your use case)'] }}",
							},
						],
					},
				},
				position: [-420, 2160],
				name: 'Find Employees',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.splitOut',
					version: 1,
					config: {
						parameters: { options: {}, fieldToSplitOut: 'data' },
						position: [40, 2160],
						name: 'Split Profiles',
					},
				}),
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.5,
					config: {
						parameters: {
							columns: {
								value: {
									State: 'No decision maker found',
									LinkedIn: "={{ $('Loop Over Items').item.json.LinkedIn }}",
								},
								schema: [
									{
										id: 'Name',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Name',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Website',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Website',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'LinkedIn',
										type: 'string',
										display: true,
										removed: false,
										required: false,
										displayName: 'LinkedIn',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'ID',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'ID',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Summary',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Summary',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Score',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Score',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'Explanation',
										type: 'string',
										display: true,
										removed: true,
										required: false,
										displayName: 'Explanation',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
									{
										id: 'State',
										type: 'string',
										display: true,
										required: false,
										displayName: 'State',
										defaultMatch: false,
										canBeUsedToMatch: true,
									},
								],
								mappingMode: 'defineBelow',
								matchingColumns: ['LinkedIn'],
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
									'https://docs.google.com/spreadsheets/d/1j8AHiPiHEXVOkUhO2ms-lw1Ygu1eWIWW-8Qe1OoHpCo/edit#gid=0',
								cachedResultName: 'Companies',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit?usp=drivesdk',
								cachedResultName: 'Copy of Lead Machine - Ghost Genius',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [40, 2420],
						name: 'No decision maker found',
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
								id: '62313990-929a-4859-aab7-0efe2f434dc9',
								operator: { type: 'number', operation: 'gte' },
								leftValue: '={{ $json.total }}',
								rightValue: 1,
							},
						],
					},
				},
				name: 'Check profiles Found',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.ghostgenius.fr/v2/profile',
					options: { batching: { batch: { batchSize: 1, batchInterval: 1500 } } },
					sendQuery: true,
					sendHeaders: true,
					queryParameters: { parameters: [{ name: 'url', value: '={{ $json.url }}' }] },
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value:
									"=Bearer {{ $('Aggregate').item.json.settings[6]['Value (edit with your use case)'] }}",
							},
						],
					},
				},
				position: [260, 2160],
				name: 'Get Profile details',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.ghostgenius.fr/v2/contact/email',
					options: { batching: { batch: { batchSize: 1, batchInterval: 1500 } } },
					sendQuery: true,
					sendHeaders: true,
					queryParameters: {
						parameters: [
							{
								name: 'company_url',
								value: "={{ $('Loop Over Items').item.json.Website }}",
							},
							{ name: 'first_name', value: '={{ $json.first_name }}' },
							{ name: 'last_name', value: '={{ $json.last_name }}' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value:
									"=Bearer {{ $('Aggregate').item.json.settings[6]['Value (edit with your use case)'] }}",
							},
						],
					},
				},
				position: [480, 2160],
				name: 'Get Email',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					mode: 'runOnceForEachItem',
					jsCode:
						"const simplifiedItem = {\n  first_name: $('Get Profile details').item.json.first_name || null,\n  last_name: $('Get Profile details').item.json.last_name || null,\n  headline: $('Get Profile details').item.json.headline || null,\n  position: $('Get Profile details').item.json.experiences[0].position || null,\n  position_description: $('Get Profile details').item.json.experiences[0].description || null,\n  summary: $('Get Profile details').item.json.summary || null, \n  company_name: $('Loop Over Items').item.json.Name || null\n};\nreturn simplifiedItem;",
				},
				position: [700, 2160],
				name: 'Keep relevant information',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4.1-mini',
						cachedResultName: 'GPT-4.1-MINI',
					},
					options: { temperature: 0.2 },
					messages: {
						values: [
							{
								role: 'system',
								content:
									"=You are a cold email customization specialist. Your role is to CREATE A SETUP for ANOTHER AI that will later write personalized cold emails to prospects.\n\nPRODUCT: {{ $('Aggregate').item.json.settings[0]['Value (edit with your use case)'] }}\nTARGET AUDIENCE: {{ $('Aggregate').item.json.settings[1]['Value (edit with your use case)'] }}\n\nYOUR TASK:\n1. Analyze the prospect information provided\n2. Identify ONE specific personalization angle that connects the prospect's needs/challenges to our {{ $('Aggregate').item.json.settings[0]['Value (edit with your use case)'] }}\n3. Create a structured setup with personalization recommendations (NOT a complete email)\n\nPERSONALIZATION GUIDELINES:\n- Focus on how the {{ $('Aggregate').item.json.settings[0]['Value (edit with your use case)'] }} could benefit their operations\n- Identify relevant pain points from their profile that our {{ $('Aggregate').item.json.settings[0]['Value (edit with your use case)'] }} could solve\n\nOUTPUT FORMAT:\nReturn your analysis in this structured format:\n---SETUP FOR EMAIL AI---\nPROSPECT: [Name and position]\nCOMPANY: [Company name]\nKEY INSIGHT: [One specific insight about the prospect/company]\nPERSONALIZATION ANGLE: [The specific personalization angle to use]\nVALUE PROPOSITION: [How our product addresses their specific needs]\n\nRemember: You are NOT writing the email. You are creating a setup for ANOTHER AI that will craft the final email.",
							},
							{
								content:
									"=Prospect information :\n\nFirst name: {{ $json.first_name }},\nHeadline: {{ $json.headline }},\nSummary: {{ $json.summary }},\nCurrent position: {{ $json.position }},\nPosition description: {{ $json.position_description }},\nCompany: {{ $('Loop Over Items').item.json.Name }},\nCompany description: {{ $('Loop Over Items').item.json.Summary }}",
							},
						],
					},
					jsonOutput: true,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1020, 2160],
				name: 'Create Personalization',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4.1-mini',
						cachedResultName: 'GPT-4.1-MINI',
					},
					options: { temperature: 0.2 },
					messages: {
						values: [
							{
								role: 'system',
								content:
									"=You are a specialist in writing cold emails with high response rates.\n\nIMPORTANT: You are creating email templates that will be used by someone else, not communicating directly with prospects.\n\nYour mission is to write 3 emails. \nIt's important that each email is not written to sell but only to attract attention and get a response.\n\nHere are the rules to follow for writing each email:\n- The email must be very short 100 words maximum)\n- Use simple words\n- Don't speak with professional language, be direct and go straight to the point. The tone is informal and direct. Be upbeat.\n- Talk in the first person\n\nHere is the structure of the email (in order):\n- You greet the prospect with their first name\n- A personalized sentence using the prospect's information that shows you've done research on them\n- A sentence explaining our product ({{ $('Aggregate').item.json.settings[0]['Value (edit with your use case)'] }}) and briefly why it might be interesting for their company.\n- A CTA in the form of a question oriented positively that must be very easy for the prospect to answer. It should not appear salesy and must provoke their curiosity.\n- No greeting\n\nThe goal of this first email is not to sell the product but just to get their attention to obtain a response.",
							},
							{
								content:
									"=Here is the information about the prospect and his company:\n\nContact's first name: {{ $('Keep relevant information').item.json.first_name }}\n\nContact's company: {{ $('Loop Over Items').item.json.Name }}\n\nRelevant information for personalization:{{ $json.message.content.toJsonString() }}\n\nReturn only a JSON (no Markdown) with the three emails:\n1. initial_email\n2. first_follow_up (3 days after)\n3. second_follow_up (5 days after the first)\n\nFormat the emails with appropriate line breaks for readability. Do not include subject lines.",
							},
						],
					},
					jsonOutput: true,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1380, 2160],
				name: 'Generate Emails Messages',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4.1-mini',
						cachedResultName: 'GPT-4.1-MINI',
					},
					options: { temperature: 0.2 },
					messages: {
						values: [
							{
								role: 'system',
								content:
									"=You are a specialist in cold email and particularly in writing email subject lines with high open rates.\n\nIMPORTANT: You are creating subject lines that will be used by someone else, not communicating directly with prospects.\n\nYou're known for your original and unconventional writing style. Your subject lines pique prospects' curiosity and don't appear commercial.\n\nHere is your mission:\nYou will receive an email sequence addressed to a prospect. The sequence consists of one opening email followed by two follow-ups in case of no response. Your mission is to write the subject line for each email.\n\nHere are the rules to follow:\n- Write in lower case and be personal\n- The subject line must be very short (5-7 words)\n- The tone must be informal and absolutely catch the prospect's attention and pique their curiosity.\n- Never use smileys or emojis.\n- Use the prospect's first name.\n\nYou must return a JSON with this structure:\nsubject_1:\nsubject_2:\nsubject_3:",
							},
							{
								content:
									'=Here is the email sequence:\n\nOpening email:  {{ $json.message.content.initial_email }}\n\nFollow-up email 1: {{ $json.message.content.first_follow_up }}\n\nFollow-up email 2: {{ $json.message.content.second_follow_up }}',
							},
						],
					},
					jsonOutput: true,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1740, 2160],
				name: 'Generate Emails Subjects',
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
							Email: "={{ $('Get Email').item.json.email }}",
							'Mail 1':
								"={{ $('Generate Emails Messages').item.json.message.content.initial_email }}",
							'Mail 2':
								"={{ $('Generate Emails Messages').item.json.message.content.first_follow_up }}",
							'Mail 3':
								"={{ $('Generate Emails Messages').item.json.message.content.second_follow_up }}",
							Lastname: "={{ $('Get Profile details').item.json.last_name }}",
							LinkedIn: "={{ $('Get Profile details').item.json.url }}",
							Firstname: "={{ $('Get Profile details').item.json.first_name }}",
							'Subject 1': '={{ $json.message.content.subject_1 }}',
							'Subject 2': '={{ $json.message.content.subject_2 }}',
							'Subject 3': '={{ $json.message.content.subject_3 }}',
							'Company name': "={{ $('Loop Over Items').item.json.Name }}",
							'Current Position':
								"={{ $('Get Profile details').item.json.experiences[0].position }}",
						},
						schema: [
							{
								id: 'Firstname',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Firstname',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Lastname',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Lastname',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'LinkedIn',
								type: 'string',
								display: true,
								required: false,
								displayName: 'LinkedIn',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Company name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Company name',
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
								id: 'Current Position',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Current Position',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Mail 1',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Mail 1',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Mail 2',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Mail 2',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Mail 3',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Mail 3',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Subject 1',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Subject 1',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Subject 2',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Subject 2',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Subject 3',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Subject 3',
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
						value: 664133164,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1j8AHiPiHEXVOkUhO2ms-lw1Ygu1eWIWW-8Qe1OoHpCo/edit#gid=664133164',
						cachedResultName: 'Leads',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit?usp=drivesdk',
						cachedResultName: 'Copy of Lead Machine - Ghost Genius',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2100, 2160],
				name: 'Add lead(s)',
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
							State: 'Enriched',
							LinkedIn: "={{ $('Loop Over Items').item.json.LinkedIn }}",
						},
						schema: [
							{
								id: 'Name',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Website',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Website',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'LinkedIn',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'LinkedIn',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ID',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'ID',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Summary',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Score',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Score',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Explanation',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Explanation',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'State',
								type: 'string',
								display: true,
								required: false,
								displayName: 'State',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['LinkedIn'],
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
							'https://docs.google.com/spreadsheets/d/1j8AHiPiHEXVOkUhO2ms-lw1Ygu1eWIWW-8Qe1OoHpCo/edit#gid=0',
						cachedResultName: 'Companies',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit?usp=drivesdk',
						cachedResultName: 'Copy of Lead Machine - Ghost Genius',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2300, 2160],
				name: 'Lead(s) found',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-1620, 1100], name: 'Start' },
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
						value: 1782913168,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit#gid=1782913168',
						cachedResultName: 'Settings',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit?usp=drivesdk',
						cachedResultName: 'Copy of Lead Machine - Ghost Genius',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-1420, 1100],
				name: 'Get Settings',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					options: {},
					aggregate: 'aggregateAllItemData',
					destinationFieldName: 'settings',
				},
				position: [-1220, 1100],
				name: 'Aggregate1',
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
								value: 'o3-mini',
								cachedResultName: 'O3-MINI',
							},
							options: {},
							messages: {
								values: [
									{
										role: 'system',
										content:
											'You are an AI assistant that extracts clean, relevant keywords to search for companies on LinkedIn.\n\nThe user input is often noisy, vague, or includes unnecessary details. Your job is to return only **clear, concise keywords** that describe the **type of company** the user is looking for.\n\nOnly keep terms related to:\n- Industry or sector (e.g. fintech, legal tech, SaaS)\n- Company activity or profession (e.g. digital agency, HR software, logistics)\n\nIgnore anything related to:\n- Location (e.g. in Paris, Europe)\n- Company size (e.g. startups, large enterprise)\n- Intent or service needs (e.g. looking for CRM, needs automation)\n- Personal perspective (e.g. I’m looking for, I want to target)\n\nYour answer must contain:\n- A space-separated list of keywords (no punctuation, no full sentences, no extra text)\n- If there are no relevant keywords, respond with: `no keywords`',
									},
									{
										content:
											"=Extract the relevant company keywords from this input:\n\n{{ $json.settings[1]['Value (edit with your use case)'] }}",
									},
								],
							},
							jsonOutput: true,
						},
						credentials: {
							openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
						},
						position: [-860, 1100],
						name: 'Make the perfect request',
					},
				}),
				node({
					type: 'n8n-nodes-base.stopAndError',
					version: 1,
					config: {
						parameters: {
							errorMessage: 'Missing API Key or Account ID in the Google Sheet',
						},
						position: [-760, 1360],
						name: 'Missing API Key or Account ID',
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
								id: '1fb2a486-8581-4d1e-9a83-26992e4ff505',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: "={{ $json.settings[6]['Value (edit with your use case)'] }}",
								rightValue: '',
							},
							{
								id: '35ea5c51-10f6-4fe1-b802-9cbd202d8381',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: "={{ $json.settings[2]['Value (edit with your use case)'] }}",
								rightValue: '',
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
					url: 'https://api.ghostgenius.fr/v2/search/companies',
					options: {
						pagination: {
							pagination: {
								parameters: {
									parameters: [{ name: 'page', value: '={{ $pageCount + 1 }}' }],
								},
								maxRequests: 1,
								requestInterval: 2000,
								limitPagesFetched: true,
								completeExpression: '={{ $response.body.data.isEmpty() }}',
								paginationCompleteWhen: 'other',
							},
						},
					},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: {
						parameters: [
							{
								name: 'keywords',
								value: '={{ $json.message.content.keywords }}',
							},
							{
								name: 'locations',
								value:
									"={{ $('Aggregate1').item.json.settings[4]['Value (edit with your use case)'] }}",
							},
							{
								name: 'company_size',
								value:
									"={{ $('Aggregate1').item.json.settings[5]['Value (edit with your use case)'] }}",
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value:
									"=Bearer {{ $('Aggregate1').item.json.settings[6]['Value (edit with your use case)'] }}",
							},
						],
					},
				},
				position: [-500, 1100],
				name: 'Search Companies',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'data' },
				position: [-300, 1100],
				name: 'Extract Company Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [20, 1100], name: 'Process Each Company' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.ghostgenius.fr/v2/company',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: { parameters: [{ name: 'url', value: '={{ $json.url }}' }] },
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value:
									"=Bearer {{ $('Aggregate1').item.json.settings[6]['Value (edit with your use case)'] }}",
							},
						],
					},
				},
				position: [240, 1100],
				name: 'Get Company Info',
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
							filtersUI: {
								values: [{ lookupValue: '={{ $json.id }}', lookupColumn: 'ID' }],
							},
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1j8AHiPiHEXVOkUhO2ms-lw1Ygu1eWIWW-8Qe1OoHpCo/edit#gid=0',
								cachedResultName: 'Companies',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit?usp=drivesdk',
								cachedResultName: 'Copy of Lead Machine - Ghost Genius',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [660, 1100],
						name: 'Check If Company Exists',
					},
				}),
				node({
					type: 'n8n-nodes-base.splitInBatches',
					version: 3,
					config: {
						parameters: { options: {} },
						position: [20, 1100],
						name: 'Process Each Company',
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
								id: '5ea943a6-8f6c-4cb0-b194-8c92d4b2aacc',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: '={{ $json.website }}',
								rightValue: '[null]',
							},
							{
								id: '8235b9bb-3cd4-4ed4-a5dc-921127ff47c7',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ $json.followers_count }}',
								rightValue: 200,
							},
						],
					},
				},
				name: 'Filter Valid Companies',
				onError: 'continueRegularOutput',
			},
		),
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
								value: 'gpt-4.1-mini',
								cachedResultName: 'GPT-4.1-MINI',
							},
							options: { temperature: 0.2 },
							messages: {
								values: [
									{
										role: 'system',
										content:
											"=You are an AI assistant that evaluates companies to determine if they might be interested in {{ $('Aggregate1').item.json.settings[0]['Value (edit with your use case)'] }}.\n\nEvaluate the company information provided on a scale of 0 to 10, where:\n- 0 = Not at all likely to be interested\n- 10 = Extremely likely to be interested\n\nBase your evaluation on these criteria:\n1. Industry fit: How well does the company's industry align with {{ $('Aggregate1').item.json.settings[0]['Value (edit with your use case)'] }}?\n2. Company profile: Is the company size, growth stage, and location appropriate for {{ $('Aggregate1').item.json.settings[0]['Value (edit with your use case)'] }}?\n3. Pain points: Based on their description, do they likely have challenges that {{ $('Aggregate1').item.json.settings[0]['Value (edit with your use case)'] }} solves?\n\nRespond ONLY with this JSON format:\n```json\n{\n  \"score\": [number between 0 and 10],\n  \"explanation\":\n}",
									},
									{
										content:
											"=Here is the company to analyze:\nName: {{ $('Filter Valid Companies').item.json.name }}\n{{ $('Filter Valid Companies').item.json.tagline }}\n{{ $('Filter Valid Companies').item.json.description }}\nNumber of employees: {{ $('Filter Valid Companies').item.json.staff_count }}\nIndustry: {{ $('Filter Valid Companies').item.json.industries }}\nSpecialties: {{ $('Filter Valid Companies').item.json.specialities }}\nLocation: {{ $('Filter Valid Companies').item.json.locations?.toJsonString() }}\nFounded in: {{ $('Filter Valid Companies').item.json.founded_on }}",
									},
								],
							},
							jsonOutput: true,
						},
						credentials: {
							openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
						},
						position: [1220, 1100],
						name: 'AI Company Scoring',
					},
				}),
				node({
					type: 'n8n-nodes-base.splitInBatches',
					version: 3,
					config: {
						parameters: { options: {} },
						position: [20, 1100],
						name: 'Process Each Company',
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
								id: '050c33be-c648-44d7-901c-51f6ff024e97',
								operator: { type: 'object', operation: 'empty', singleValue: true },
								leftValue: "={{ $('Check If Company Exists').all().first().json }}",
								rightValue: '',
							},
						],
					},
				},
				name: 'Is New Company?',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							ID: "={{ $('Get Company Info').item.json.id }}",
							Name: "={{ $('Get Company Info').item.json.name }}",
							Score: "={{ $('AI Company Scoring').item.json.message.content.score }}",
							State: 'Qualified',
							Summary: "={{ $('Get Company Info').item.json.description }}",
							Website: "={{ $('Get Company Info').item.json.website }}",
							LinkedIn: "={{ $('Get Company Info').item.json.url }}",
							Explanation: "={{ $('AI Company Scoring').item.json.message.content.explanation }}",
						},
						schema: [
							{
								id: 'Name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Name',
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
								id: 'LinkedIn',
								type: 'string',
								display: true,
								required: false,
								displayName: 'LinkedIn',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ID',
								type: 'string',
								display: true,
								required: false,
								displayName: 'ID',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Summary',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Summary',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Score',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Score',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Explanation',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Explanation',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'State',
								type: 'string',
								display: true,
								required: false,
								displayName: 'State',
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
							'https://docs.google.com/spreadsheets/d/1j8AHiPiHEXVOkUhO2ms-lw1Ygu1eWIWW-8Qe1OoHpCo/edit#gid=0',
						cachedResultName: 'Companies',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1tRjZTbM10koP6kpXzfIf9LzuuvnDcPAtv7fTTC36SnE/edit?usp=drivesdk',
						cachedResultName: 'Copy of Lead Machine - Ghost Genius',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1580, 1100],
				name: 'Add Company to CRM',
			},
		}),
	)
	.add(
		sticky(
			'## Data recovery\nHere, we retrieve the companies from the first automation, filtering them by their score (min. 7). Feel free to remove this filter or modify it. However, it is mandatory to keep the status filter.\n\nThe "Limit" node is used to avoid reaching the rate limit imposed by LinkedIn for Sales Navigator. Indeed, Sales Navigator has a daily limit of 2,500 search results. In this automation, one company search equals one request, which can yield up to 25 results. Therefore, to stay within the limits, you should not process more than 100 companies per day.\n\nIt\'s worth knowing that scraping Sales Navigator is much less risky than scraping regular LinkedIn for things like reactions, profiles, etc. Even if you accidentally reach the limit (the Ghost Genius API will block you automatically), you just won\'t be able to use your Sales Navigator for 24 hours, but nothing more. In any case, I recommend using [Ghost Genius](https://ghostgenius.fr) to take advantage of the cookieless feature (no need to use your own account) for all public endpoints (Get Profile, Get Company, Get Post reactions, etc.), and for private endpoints, the API automatically manages the limits.',
			{ color: 6, position: [-2300, 1880], width: 1520, height: 460 },
		),
	)
	.add(
		sticky(
			"## Find the decision makers\nHere, for each company, we find the decision-makers (you can customize the job titles in the Google Sheet), then we enrich each profile, and finally, we find their email.\n\nTo find a prospect's email, we use their first name, last name, and the company's domain (which is why it's important in the first automation to filter out companies without a website). We use the Ghost Genius endpoint, which utilizes a waterfall enrichment system, allowing for a high success rate.\n\nNote that you can also add a node using the [Mobile Finder](https://www.ghostgenius.fr/docs#tag/contact/get/contact/phone) to get each prospect's phone number.\n\nIf no decision-makers are found in the company, the workflow stops here for that company, and we update its status in the Google Sheet.",
			{ name: 'Sticky Note2', color: 4, position: [-720, 1880], width: 1600, height: 460 },
		),
	)
	.add(
		sticky(
			"## Email generation and storage\nIn this section, we generate the cold email sequence, then store all the information in our Google Sheet, and finally, update the company's status.\n\nFor more context and relevance, you can modify the various system prompts inside the OpenAI nodes so that the generated emails are as personalized as possible to your product/service.\n\nA first node analyzes the profile and the company to suggest personalization angles and prepares a summary to improve the effectiveness of the next node.\n\nThe second node writes the 3 cold outreach emails, and the third node writes the 3 subject lines. As always, you can modify the system prompts if the writing style or anything else doesn't suit you.\n",
			{ name: 'Sticky Note6', color: 5, position: [940, 1880], width: 1560, height: 460 },
		),
	)
	.add(
		sticky('## Exit', {
			name: 'Sticky Note3',
			color: 3,
			position: [-120, 2340],
			width: 400,
			height: 260,
		}),
	)
	.add(
		sticky(
			'## LinkedIn company search\nThis section initiates the workflow and searches for your target companies on LinkedIn using the Ghost Genius API.\n\nYou can filter and refine your search by customizing the fields in the "Settings" sheet in the Google Sheet.\n\nNote that you can retrieve a maximum of 1000 companies per search (corresponding to 100 LinkedIn pages), so it\'s important not to exceed this number of results to avoid losing prospects.\n\nExample: Let\'s say I want to target Growth Marketing Agencies with 11-50 employees. I do my search and see that there are 10,000 results. So I refine my search by using location to go country by country and retrieve all 10,000 results in several batches ranging from 500 to 1000 depending on the country.\n\nTips: To test the workflow or to see the number of results of your search, change the pagination parameter (Max Pages) in the "Search Companies" node. It will be displayed at the very top of the response JSON.',
			{ name: 'Sticky Note4', color: 6, position: [-1700, 820], width: 1580, height: 460 },
		),
	)
	.add(
		sticky(
			'## AI scoring and storage\nThis section scores the company and stores it in a Google Sheet.\n\nIt\'s important to properly fill in the "Settings" sheet at the beginning of the workflow to get a result relevant to your use case. You can also manually modify the system prompt.\n\nWe add the company to the "Companies" sheet in this [Google Sheet](https://docs.google.com/spreadsheets/d/1j8AHiPiHEXVOkUhO2ms-lw1Ygu1eWIWW-8Qe1OoHpCo/edit?usp=sharing) which you can make a copy of and use.\n\nThis AI scoring functionality is extremely impressive once perfectly configured, so I recommend taking some time to test with several companies to ensure the scoring system works well for your needs!',
			{ name: 'Sticky Note5', color: 5, position: [1120, 820], width: 680, height: 460 },
		),
	)
	.add(
		sticky(
			"## Company data processing \nThis section processes each company individually.\n\nWe retrieve all the company information using Get Company Details by using the LinkedIn link obtained from the previous section.\n\nThen we filter the company based on the number of followers, which gives us a first indication of the company's credibility (200 in this case), and whether their LinkedIn page has a website listed.\n\nYou can adjust these thresholds based on your target market - increasing the follower count for more established businesses or decreasing it for emerging markets.\n\nThe last two modules checks if the company already exists in your database (using LinkedIn ID) to prevent duplicates because when you do close enough searches, some companies may come up several times.",
			{ name: 'Sticky Note1', color: 4, position: [-60, 820], width: 1120, height: 460 },
		),
	)
	.add(
		sticky('# Search LinkedIn companies, score them with AI, and send to your CRM', {
			name: 'Sticky Note7',
			position: [-1820, 680],
			width: 3820,
			height: 920,
		}),
	)
	.add(
		sticky('# Find decision-makers, get verified emails, and generate 3 cold emails with AI\n', {
			name: 'Sticky Note8',
			position: [-2380, 1740],
			width: 5000,
			height: 920,
		}),
	)
	.add(
		sticky(
			"## Introduction\nWelcome to my template! Before explaining how to set it up, here's some **important information:**\n\nThis template is divided into two automations that complement each other.\n\nThe first part will allow you to search for companies based on your search criteria, enrich them, and then evaluate them using an AI scoring system.\n\nThe second part will find the decision-makers and their emails within the companies (with a minimum score of 7) and will generate a personalized cold email sequence, ready to be sent, tailored to each company and profile.\n\nKeep in mind that this automation is quite basic. If you need to adapt it to your CRM or connect it with an email-sending software like Instantly, you will need a minimum level of technical skill to do so.\n\nThe first workflow is launched manually, unlike the second workflow which is launched daily.\n\n**If you are not comfortable with n8n or if you have any questions, feel free to book a call right [here](https://cal.com/soufiane-ghostgenius/workflows-setup-x-ghost-genius-copy) or contact me on [LinkedIn](www.linkedin.com/in/matthieu-belin83) :)**",
			{ name: 'Sticky Note9', color: 2, position: [-1000, 140], width: 720, height: 420 },
		),
	)
	.add(
		sticky(
			'## Setup\n- **[Watch this video](https://www.youtube.com/watch?v=0EsdmETsZGE)**\n\n- Create a copy of this [Google Sheet](https://docs.google.com/spreadsheets/d/1j8AHiPiHEXVOkUhO2ms-lw1Ygu1eWIWW-8Qe1OoHpCo/edit?usp=sharing) by clicking on File => Make a copy (in Google Sheet).\n\n- Create an account on [Ghost Genius API](ghostgenius.fr) and get your API key.\n\n- Plug your LinkedIn [Sales Navigator](https://www.linkedin.com/sales/home) account in Ghost Genius API with [this video](https://www.youtube.com/watch?v=SH_4qN6sW7Q) and get your account ID.\n\n- Configure your Google Sheet credential by following the [n8n documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/) or [this video](https://www.youtube.com/watch?v=pWGXlZBGu4k).\n\n- Create an OpenAI key [here](https://platform.openai.com/docs/overview) and add the credential to the OpenAI nodes following the [n8n documentation](https://docs.n8n.io/integrations/builtin/credentials/openai/).\n\n- Add your information to the "Settings" sheet (in Google Sheet).',
			{ name: 'Sticky Note10', color: 2, position: [-220, 140], width: 600, height: 420 },
		),
	)
	.add(
		sticky(
			'## Tools \n**(You can use the API and CRM of your choice; this is only a suggestion)**\n\n- API Linkedin: [Ghost Genius API](https://ghostgenius.fr) \n\n- API Documentation: [Documentation](https://ghostgenius.fr/docs)\n\n- CRM: [Google Sheet](https://workspace.google.com/intl/en/products/sheets/)\n\n- AI: [OpenAI](https://openai.com)\n\n- LinkedIn Location ID Finder: [Ghost Genius Locations ID Finder](https://ghostgenius.fr/tools/search-sales-navigator-locations-id)\n\n- LinkedIn Job title Finder: [Ghost Genius Job title Finder](https://www.ghostgenius.fr/tools/search-sales-navigator-current-titles-id)',
			{ name: 'Sticky Note11', color: 2, position: [440, 140], width: 600, height: 420 },
		),
	)
	.add(
		sticky('## Exit', {
			name: 'Sticky Note12',
			color: 3,
			position: [-920, 1280],
			width: 400,
			height: 260,
		}),
	)
	.add(
		sticky('## Exit', {
			name: 'Sticky Note13',
			color: 3,
			position: [-1500, 2340],
			width: 400,
			height: 260,
		}),
	)
	.add(
		sticky(
			'# [Free Assistance](https://cal.com/soufiane-ghostgenius/workflows-setup-x-ghost-genius-copy)',
			{ name: 'Sticky Note14', color: 7, position: [80, 0], width: 300, height: 80 },
		),
	)
	.add(
		sticky('# [Setup Video](https://www.youtube.com/watch?v=0EsdmETsZGE)', {
			name: 'Sticky Note15',
			color: 7,
			position: [-220, 0],
			height: 80,
		}),
	);
