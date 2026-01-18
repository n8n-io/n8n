const wf = workflow('bKy4ngwZ5svUgPH6', 'hr screening system community1')
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {
						customCss:
							":root {\n	--font-family: 'Open Sans', sans-serif;\n	--font-weight-normal: 400;\n	--font-weight-bold: 600;\n	--font-size-body: 12px;\n	--font-size-label: 14px;\n	--font-size-test-notice: 12px;\n	--font-size-input: 14px;\n	--font-size-header: 20px;\n	--font-size-paragraph: 14px;\n	--font-size-link: 12px;\n	--font-size-error: 12px;\n	--font-size-html-h1: 28px;\n	--font-size-html-h2: 20px;\n	--font-size-html-h3: 16px;\n	--font-size-html-h4: 14px;\n	--font-size-html-h5: 12px;\n	--font-size-html-h6: 10px;\n	--font-size-subheader: 14px;\n\n	/* Colors */\n	--color-background: #fbfcfe;\n	--color-test-notice-text: #e6a23d;\n	--color-test-notice-bg: #fefaf6;\n	--color-test-notice-border: #f6dcb7;\n	--color-card-bg: #ffffff;\n	--color-card-border: #dbdfe7;\n	--color-card-shadow: rgba(99, 77, 255, 0.06);\n	--color-link: #7e8186;\n	--color-header: #525356;\n	--color-label: #555555;\n	--color-input-border: #dbdfe7;\n	--color-input-text: #71747A;\n	--color-focus-border: rgb(90, 76, 194);\n	--color-submit-btn-bg: #0000FF; /* Changed to blue */\n	--color-submit-btn-text: #ffffff;\n	--color-error: #ea1f30;\n	--color-required: #ff6d5a;\n	--color-clear-button-bg: #7e8186;\n	--color-html-text: #555;\n	--color-html-link: #ff6d5a;\n	--color-header-subtext: #7e8186;\n\n	/* Border Radii */\n	--border-radius-card: 8px;\n	--border-radius-input: 6px;\n	--border-radius-clear-btn: 50%;\n	--card-border-radius: 8px;\n\n	/* Spacing */\n	--padding-container-top: 24px;\n	--padding-card: 24px;\n	--padding-test-notice-vertical: 12px;\n	--padding-test-notice-horizontal: 24px;\n	--margin-bottom-card: 16px;\n	--padding-form-input: 12px;\n	--card-padding: 24px;\n	--card-margin-bottom: 16px;\n\n	/* Dimensions */\n	--container-width: 448px;\n	--submit-btn-height: 48px;\n	--checkbox-size: 18px;\n\n	/* Others */\n	--box-shadow-card: 0px 4px 16px 0px var(--color-card-shadow);\n	--opacity-placeholder: 0.5;\n}\n",
						appendAttribution: false,
					},
					formTitle: 'Candidate Form',
					formFields: {
						values: [
							{
								fieldLabel: 'Name',
								placeholder: 'Name',
								requiredField: true,
							},
							{
								fieldType: 'email',
								fieldLabel: 'Email',
								placeholder: 'Email',
								requiredField: true,
							},
							{
								fieldType: 'file',
								fieldLabel: 'CV',
								requiredField: true,
								acceptFileTypes: '.pdf',
							},
							{
								fieldType: 'dropdown',
								fieldLabel: 'Job Role',
								fieldOptions: {
									values: [
										{ option: 'Sales' },
										{ option: 'Security' },
										{ option: 'Operations' },
										{ option: 'Reception' },
									],
								},
							},
						],
					},
					formDescription:
						"Please ,fill the required fields , and we'll get in touch with you soon !",
				},
				position: [-620, 500],
				name: 'On form submission',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					filtersUI: {
						values: [
							{
								lookupValue: "={{ $('On form submission').item.json['Job Role'] }}",
								lookupColumn: 'Role',
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1PjQranztEMv18bh2U8-i82OREoqt1R2nGN92TO8j54o/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1PjQranztEMv18bh2U8-i82OREoqt1R2nGN92TO8j54o',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1PjQranztEMv18bh2U8-i82OREoqt1R2nGN92TO8j54o/edit?usp=drivesdk',
						cachedResultName: 'JobProfiles',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1560, 1020],
				name: 'job roles',
			},
		}),
	)
	.then(
		merge(
			[
				node({
					type: '@n8n/n8n-nodes-langchain.chainSummarization',
					version: 2,
					config: {
						parameters: {
							options: {
								summarizationMethodAndPrompts: {
									values: {
										prompt:
											'=Write a concise summary of the following:\n\nCity: {{ $json.output.city }}\nBirthdate: {{ $json.output.birthdate }}\nEducational qualification: {{ $json.output["Educational qualification"] }}\nJob History: {{ $json.output["Job History"] }}\nSkills: {{ $json.output.Skills }}\n\nUse 100 words or less. Be concise and conversational.',
										combineMapPrompt:
											'=Write a concise summary of the following:\n\nCity: {{ $json.output.city }}\nBirthdate: {{ $json.output.birthdate }}\nEducational qualification: {{ $json.output["Educational qualification"] }}\nJob History: {{ $json.output["Job History"] }}\nSkills: {{ $json.output.Skills }}\n\nUse 100 words or less. Be concise and conversational.',
									},
								},
							},
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
						position: [1460, 460],
						name: 'Summarization Chain',
					},
				}),
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.6,
					config: {
						parameters: {
							options: {},
							filtersUI: {
								values: [
									{
										lookupValue: "={{ $('On form submission').item.json['Job Role'] }}",
										lookupColumn: 'Role',
									},
								],
							},
							sheetName: {
								__rl: true,
								mode: 'list',
								value: 'gid=0',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1PjQranztEMv18bh2U8-i82OREoqt1R2nGN92TO8j54o/edit#gid=0',
								cachedResultName: 'Sheet1',
							},
							documentId: {
								__rl: true,
								mode: 'list',
								value: '1PjQranztEMv18bh2U8-i82OREoqt1R2nGN92TO8j54o',
								cachedResultUrl:
									'https://docs.google.com/spreadsheets/d/1PjQranztEMv18bh2U8-i82OREoqt1R2nGN92TO8j54o/edit?usp=drivesdk',
								cachedResultName: 'JobProfiles',
							},
						},
						credentials: {
							googleSheetsOAuth2Api: {
								id: 'credential-id',
								name: 'googleSheetsOAuth2Api Credential',
							},
						},
						position: [1560, 1020],
						name: 'job roles',
					},
				}),
			],
			{
				version: 3.1,
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
				},
				name: 'Merge2',
			},
		),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.5,
			config: {
				parameters: {
					text: '=Profilo ricercato:\n{{ $node["Merge2"].json["Profile Wanted"] }}\n\nCandidato:\n{{ $node["Summarization Chain"].json["response"]["text"] }}\n\n\nCandidato:\n{{ $node["Summarization Chain"].json["response"]["text"] }}\n',
					messages: {
						messageValues: [
							{
								message:
									'You are an HR expert and need to assess if the candidate aligns with the profile the company is looking for. You must give a score from 1 to 10, where 1 means the candidate is not at all aligned with the requirements, while 10 means they are the ideal candidate because they perfectly match the desired profile. Additionally, in the "consideration" field, explain why you gave that score',
							},
						],
					},
					promptType: 'define',
					hasOutputParser: true,
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
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								schemaType: 'manual',
								inputSchema:
									'{\n	"type": "object",\n	"properties": {\n		"vote": {\n			"type": "string"\n		},\n		"consideration": {\n			"type": "string"\n		}\n	}\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [2120, 460],
				name: 'HR Expert',
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
							CITY: "={{ $('Merge').item.json.output.city }}",
							DATA: "={{ $now.format('dd/LL/yyyy') }}",
							NAME: "={{ $('On form submission').item.json.Name }}",
							VOTE: '={{ $json.output.vote }}',
							EMAIL: "={{ $('On form submission').item.json.Email }}",
							PHONE:
								"={{ String($('Personal Data').item.json.output.telephone).replace(/^\\+/, '') }}",
							SKILLS: "={{ $('Merge').item.json.output.Skills }}",
							SUMMARIZE: "={{ $('Summarization Chain').item.json.response.text }}",
							EDUCATIONAL: '={{ $(\'Merge\').item.json.output["Educational qualification"] }}',
							'JOB HISTORY': '={{ $(\'Merge\').item.json.output["Job History"] }}',
							CONSIDERATION: '={{ $json.output.consideration }}',
						},
						schema: [
							{
								id: 'DATA',
								type: 'string',
								display: true,
								required: false,
								displayName: 'DATA',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'NAME',
								type: 'string',
								display: true,
								required: false,
								displayName: 'NAME',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'PHONE',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'PHONE',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CITY',
								type: 'string',
								display: true,
								required: false,
								displayName: 'CITY',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'EMAIL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'EMAIL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Birthdate',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Birthdate',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'EDUCATIONAL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'EDUCATIONAL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'JOB HISTORY',
								type: 'string',
								display: true,
								required: false,
								displayName: 'JOB HISTORY',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'SKILLS',
								type: 'string',
								display: true,
								required: false,
								displayName: 'SKILLS',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'SUMMARIZE',
								type: 'string',
								display: true,
								required: false,
								displayName: 'SUMMARIZE',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'VOTE',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'VOTE',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CONSIDERATION',
								type: 'string',
								display: true,
								required: false,
								displayName: 'CONSIDERATION',
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
							'https://docs.google.com/spreadsheets/d/1DCROl-KxvbYKgN5porB7gcvvwhTkie7MckVxPMvE7lI/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1DCROl-KxvbYKgN5porB7gcvvwhTkie7MckVxPMvE7lI',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1DCROl-KxvbYKgN5porB7gcvvwhTkie7MckVxPMvE7lI/edit?usp=drivesdk',
						cachedResultName: 'recommended candidates',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2520, 460],
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: '=cv-{{ $json.CV[0].filename }}',
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
						value: '1tf7DWFzqiIi9atCwfUF5w-RLWuQU6YFp',
						cachedResultUrl: 'https://drive.google.YOUR_AWS_SECRET_KEY_HERE-RLWuQU6YFp',
						cachedResultName: 'work cvs',
					},
					inputDataFieldName: 'CV',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [400, 300],
				name: 'Upload CV',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: { options: {}, operation: 'pdf', binaryPropertyName: '=CV' },
				position: [400, 520],
				name: 'Extract from File',
			},
		}),
	)
	.then(
		merge(
			[
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
							schemaType: 'manual',
							inputSchema:
								'{\n	"type": "object",\n	"properties": {\n		"telephone": {\n			"type": "string"\n		},\n      "city": {\n			"type": "string"\n		},\n      "birthdate": {\n			"type": "string"\n		}\n	}\n}',
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
						position: [720, 400],
						name: 'Personal Data',
					},
				}),
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
										name: 'Educational qualification',
										required: true,
										description:
											'Summary of your academic career. Focus on your high school and university studies. Summarize in 100 words maximum and also include your grade if applicable.',
									},
									{
										name: 'Job History',
										required: true,
										description:
											'Work history summary. Focus on your most recent work experiences. Summarize in 100 words maximum',
									},
									{
										name: 'Skills',
										required: true,
										description:
											'Extract the candidate’s technical skills. What software and frameworks they are proficient in. Make a bulleted list.',
									},
								],
							},
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
						position: [720, 580],
						name: 'Qualifications',
					},
				}),
			],
			{ version: 3, parameters: { mode: 'combine', options: {}, combineBy: 'combineAll' } },
		),
	)
	.add(
		sticky(
			'🎯 AI Resume Screener – Form-Based HR Automation\n\nThis workflow automates the entire resume screening process using AI.\nIt extracts key details from uploaded CVs, compares candidates to job-specific profiles stored in Google Sheets, and logs evaluation scores and summaries for easy HR review.\n\n🛠 Setup Required:\n\nGoogle Sheets with Role + Profile Wanted columns\n\nGoogle Drive account (for CV uploads)\n\nOpenAI or Gemini API Key\n\nActivate webhook for the form\n\n✅ What this workflow does:\n\nAccepts CV uploads via form\n\nExtracts candidate qualifications and personal data using AI\n\nSummarizes the candidate’s background\n\nLooks up the job profile from your Google Sheet\n\nScores and evaluates the match using AI\n\nSaves results and uploads CV to Drive\n\n🤝 Need Help Setting This Up?\n\nI’m happy to assist you in customizing or deploying this workflow for your team.\n\n📧 Email: tharwat.elsayed2000@gmail.com\n💬 WhatsApp: +20106 180 3236\n\n🧰 Optional Extensions:\n\nAdd email or Slack notifications\n\nSupport multiple languages with a translation step\n\nReplace the form trigger with Google Drive or Airtable\n\n',
			{ color: 3, position: [-1560, -220], width: 540, height: 920 },
		),
	)
	.add(
		sticky('The CV is uploaded to Google Drive and converted so that it can be processed\n', {
			name: 'Sticky Note1',
			position: [320, 220],
			width: 300,
			height: 420,
		}),
	)
	.add(
		sticky(
			'The essential information for evaluating the candidate is collected in two different chains',
			{ name: 'Sticky Note2', position: [680, 300], width: 360, height: 440 },
		),
	)
	.add(
		sticky('Summary of relevant information useful for classifying the candidate', {
			name: 'Sticky Note3',
			position: [1420, 380],
			width: 320,
			height: 240,
		}),
	)
	.add(
		sticky(
			'Characteristics of the profile sought by the company that intends to hire the candidate',
			{ name: 'Sticky Note4', position: [1800, 380], width: 220, height: 240 },
		),
	)
	.add(
		sticky(
			"Candidate evaluation with vote and considerations of the HR agent relating the profile sought with the candidate's skills",
			{ name: 'Sticky Note5', position: [2060, 380], width: 360, height: 240 },
		),
	);
