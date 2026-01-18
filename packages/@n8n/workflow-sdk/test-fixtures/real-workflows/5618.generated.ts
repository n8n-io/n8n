const wf = workflow(
	'BbEROzwxqcxp1yQZ',
	'Scrape LinkedIn Profiles & Save to Google Sheets with Apify',
	{ executionOrder: 'v1' },
)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1874795482,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM/edit#gid=1874795482',
						cachedResultName: 'Final keywords',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM/edit?usp=drivesdk',
						cachedResultName: 'Linkedin Post Keywords',
					},
					authentication: 'serviceAccount',
				},
				credentials: {
					googleApi: { id: 'credential-id', name: 'googleApi Credential' },
				},
				position: [-840, 840],
				name: 'Read LinkedIn URLs1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: {} },
				position: [-660, 840],
				name: 'Schedule Scraper Trigger 1',
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
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 2070978100,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM/edit#gid=2070978100',
						cachedResultName: '24 June 2025',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM/edit?usp=drivesdk',
						cachedResultName: 'Linkedin Post Keywords',
					},
					authentication: 'serviceAccount',
				},
				credentials: {
					googleApi: { id: 'credential-id', name: 'googleApi Credential' },
				},
				position: [-500, 640],
				name: 'Execute Apify LinkedIn Scraper1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: '={{ $credentials.emailNotification.recipientEmail }}',
					message:
						"=Hello Team,<br><br>  \nPlease find the details for the LinkedIn Apify scraped data below.<br><br> \n \n \n<b>Scraping Date:</b>{{ $now.format('DD MMMM YYYY') }}<br> \n<b>Total Scraped Data:</b>{{ $('Execute Apify LinkedIn Scraper1').all().length }} Records<br> \n<br><br> \n\n \n<br>  Thanks,<br> Oneclick",
					options: {},
					subject: "Apify LinkedIn data details - {{ $now.format('DD MMMM YYYY') }}",
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [-280, 640],
				name: 'Send Success Notification1',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"const base = 'https://www.linkedin.com/search/results/content/';\nconst qp = [\n  `datePosted=${encodeURIComponent('\"past-24h\"')}`,\n  `keywords=${encodeURIComponent($input.first().json.Keywords)}`,\n  `origin=${encodeURIComponent('FACETED_SEARCH')}`\n].join('&');\n\nreturn [{ json: { url: `${base}?${qp}` } }];\n",
				},
				position: [-460, 860],
				name: 'Data Formatting1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.apify.com/v2/acts/linkedin-scraper/runs',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "startUrls": [\n    {\n      "url": "{{ $json.url }}"\n    }\n  ],\n  "sessionCookie": "{{ $credentials.linkedinAuth.sessionCookie }}",\n  "proxyConfiguration": {\n    "useApifyProxy": true\n  },\n  "maxConcurrency": 1,\n  "maxRequestRetries": 3,\n  "requestTimeoutSecs": 60\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-280, 860],
				name: 'Fetch Profile Data1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.apify.com/v2/actor-runs/{{ $json.data.id }}',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: { parameters: [{ name: 'waitForFinish', value: '100' }] },
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-100, 860],
				name: 'Run Scraper Actor1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.apify.com/v2/datasets/{{ $json.data.defaultDatasetId }}/items',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [120, 860],
				name: 'Get Scraped Results1',
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
							url: '={{ $json.url }}',
							poll: '=--',
							text: '={{ $json.text }}',
							type: '={{ $json.type == undefined ? "--" : $json.type }} ',
							title: '={{ $json.title }}',
							inputUrl: '={{ $json.inputUrl }}',
							authorName: '={{ $json.authorName }}',
							postedAtISO: '={{ $json.postedAtISO }}',
							authorProfileUrl: '={{ $json.authorProfileUrl }}',
						},
						schema: [
							{
								id: 'text',
								type: 'string',
								display: true,
								required: false,
								displayName: 'text',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'title',
								type: 'string',
								display: true,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'url',
								type: 'string',
								display: true,
								required: false,
								displayName: 'url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'postedAtISO',
								type: 'string',
								display: true,
								required: false,
								displayName: 'postedAtISO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'authorProfileUrl',
								type: 'string',
								display: true,
								required: false,
								displayName: 'authorProfileUrl',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'authorName',
								type: 'string',
								display: true,
								required: false,
								displayName: 'authorName',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'inputUrl',
								type: 'string',
								display: true,
								required: false,
								displayName: 'inputUrl',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'type',
								type: 'string',
								display: true,
								required: false,
								displayName: 'type',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'poll',
								type: 'string',
								display: true,
								required: false,
								displayName: 'poll',
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
						value: 2070978100,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM/edit#gid=2070978100',
						cachedResultName: '24 June 2025',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM/edit?usp=drivesdk',
						cachedResultName: 'Linkedin Post Keywords',
					},
					authentication: 'serviceAccount',
				},
				credentials: {
					googleApi: { id: 'credential-id', name: 'googleApi Credential' },
				},
				position: [340, 860],
				name: 'Save to Google Sheets1',
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
							Keywords: "={{ $('Schedule Scraper Trigger 1').item.json.Keywords }}",
							'Total Count 24-06-2025': "={{ $('Get Scraped Results1').all().length }}",
						},
						schema: [
							{
								id: 'Keywords',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Keywords',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Total Count 24-06-2025',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Total Count 24-06-2025',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Keywords'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1874795482,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM/edit#gid=1874795482',
						cachedResultName: 'Final keywords',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1UjZNjLLpzlGp_noSqp30me6RQw24w1-y-BlX5wg3aOM/edit?usp=drivesdk',
						cachedResultName: 'Linkedin Post Keywords',
					},
					authentication: 'serviceAccount',
				},
				credentials: {
					googleApi: { id: 'credential-id', name: 'googleApi Credential' },
				},
				position: [560, 860],
				name: 'Update Progress Tracker1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 10 }, position: [740, 860], name: 'Process Complete Wait 1' },
		}),
	)
	.add(
		sticky(
			'## Workflow Initialization\n\n### Starts the scraping and checks for required LinkedIn profile URLs or search parameters',
			{ name: 'Sticky Note4', position: [-1160, 600], width: 440, height: 480 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## DATA PROCESSING & EXTRACTION\n\n### Handles the actual scraping and data retrieval from Apify',
			{ name: 'Sticky Note5', color: 3, position: [-520, 840], width: 780, height: 380 },
		),
	)
	.add(
		sticky('## DATA STORAGE\n### Saves results in Google Sheet', {
			name: 'Sticky Note6',
			color: 4,
			position: [300, 740],
			width: 400,
			height: 320,
		}),
	)
	.add(
		sticky('## COMPLETION\n### Completes the workflow and Send notification', {
			name: 'Sticky Note7',
			color: 5,
			position: [-540, 500],
			width: 400,
			height: 320,
		}),
	);
