const wf = workflow('r82OA8ExycLYuK1u', 'My workflow 8', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-420, 780], name: 'Start' },
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
								id: 'e81e4891-4786-4dd9-a338-d1095e27f382',
								name: 'Your target',
								type: 'string',
								value: 'Growth Marketing Agency',
							},
							{
								id: 'ed2b6b08-66aa-4d4b-b68c-698b5e841930',
								name: 'B: 1-10 employees, C: 11-50 employees, D: 51-200 employees, E: 201-500 employees, F: 501-1000 employees, G: 1001-5000 employees, H: 5001-10,000 employees, I: 10,001+ employees',
								type: 'string',
								value: 'C',
							},
							{
								id: 'f1d02f1a-8115-4e0c-a5ec-59bf5b54263b',
								name: 'Location (find it on : https://www.ghostgenius.fr/tools/search-sales-navigator-locations-id)',
								type: 'string',
								value: '103644278',
							},
							{
								id: '21bdb871-9327-4553-bb4a-a138be9f735c',
								name: 'Your product or service',
								type: 'string',
								value: 'our CRM implementation services',
							},
							{
								id: '31f5adfc-8a8f-498c-9e57-24584c42f7de',
								name: 'Positive indicators (3-5 specific factors that indicate a company might need your product)',
								type: 'string',
								value:
									'- Mentions challenges with customer relationships or sales processes \n- Company is in growth phase with expanding client base \n- Mentions need for better data organization or customer insights \n- References marketing automation, sales pipelines, or customer retention ',
							},
							{
								id: '630807cb-9d06-41ee-8534-a652ed76cb4c',
								name: 'Negative indicators (3-5 specific factors that indicate a company might NOT need your product)',
								type: 'string',
								value:
									'- Very small companies (1-5 employees) or extremely large enterprises \n- Already mentions using advanced CRM solutions \n- No indication of sales process or customer relationship management in description \n- Pure manufacturing or product-based business with minimal customer interaction \n- Non-profit or government entity with unique relationship management needs',
							},
						],
					},
				},
				position: [-220, 780],
				name: 'Set Variables',
			},
		}),
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
								maxRequests: 3,
								requestInterval: 2000,
								limitPagesFetched: true,
								completeExpression: '={{ $response.body.data.isEmpty() }}',
								paginationCompleteWhen: 'other',
							},
						},
					},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [
							{ name: 'keywords', value: "={{ $json['Your target'] }}" },
							{
								name: 'locations',
								value:
									"={{ $json['Location (find it on : https://www'].ghostgenius['fr/tools/search-sales-navigator-locations-id)'] }}",
							},
							{
								name: 'company_size',
								value:
									"={{ $json['B: 1-10 employees, C: 11-50 employees, D: 51-200 employees, E: 201-500 employees, F: 501-1000 employees, G: 1001-5000 employees, H: 5001-10,000 employees, I: 10,001+ employees'] }}",
							},
						],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-20, 780],
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
				position: [180, 780],
				name: 'Extract Company Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [520, 780], name: 'Process Each Company' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.ghostgenius.fr/v2/company',
					options: { batching: { batch: { batchSize: 1, batchInterval: 2000 } } },
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: { parameters: [{ name: 'url', value: '={{ $json.url }}' }] },
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [760, 780],
				name: 'Get Company Info',
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
				position: [980, 780],
				name: 'Filter Valid Companies',
			},
		}),
	)
	.output(0)
	.then(
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
							'https://docs.google.com/spreadsheets/d/1LfhqpyjimLjyQcmWY8mUr6YtNBcifiOVLIhAJGV9jiM/edit#gid=0',
						cachedResultName: 'Companies',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1LfhqpyjimLjyQcmWY8mUr6YtNBcifiOVLIhAJGV9jiM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1LfhqpyjimLjyQcmWY8mUr6YtNBcifiOVLIhAJGV9jiM/edit?usp=drivesdk',
						cachedResultName: 'CRM',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1200, 780],
				name: 'Check If Company Exists',
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
								id: '050c33be-c648-44d7-901c-51f6ff024e97',
								operator: { type: 'object', operation: 'empty', singleValue: true },
								leftValue: "={{ $('Check If Company Exists').all().first().json }}",
								rightValue: '',
							},
						],
					},
				},
				position: [1380, 780],
				name: 'Is New Company?',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4.1',
						cachedResultName: 'GPT-4.1',
					},
					options: { temperature: 0.2 },
					messages: {
						values: [
							{
								role: 'system',
								content:
									"=You are an AI assistant that evaluates companies to determine if they might be interested in {{ $('Set Variables').item.json['Your product or service'] }}.\n\nEvaluate the company information provided on a scale of 0 to 10, where:\n- 0 = Not at all likely to be interested\n- 10 = Extremely likely to be interested\n\nBase your evaluation on these criteria:\n1. Industry fit: How well does the company's industry align with {{ $('Set Variables').item.json['Your product or service'] }}?\n2. Company profile: Is the company size, growth stage, and location appropriate for {{ $('Set Variables').item.json['Your product or service'] }}?\n3. Pain points: Based on their description, do they likely have challenges that {{ $('Set Variables').item.json['Your product or service'] }} solves?\n\nFactors that indicate a good fit:\n{{ $('Set Variables').item.json['Positive indicators (3-5 specific factors that indicate a company might need your product)'] }}\n\nFactors that indicate a poor fit:\n{{ $('Set Variables').item.json['Negative indicators (3-5 specific factors that indicate a company might NOT need your product)'] }}\n\nRespond ONLY with this JSON format:\n```json\n{\n  \"score\": [number between 0 and 10],\n}",
							},
							{
								content:
									"=Here is the company to analyze:\nName: {{ $('Filter Valid Companies').item.json.name }}\n{{ $('Filter Valid Companies').item.json.tagline }}\n{{ $('Filter Valid Companies').item.json.description }}\nNumber of employees: {{ $('Filter Valid Companies').item.json.staff_count }}\nIndustry: {{ $('Filter Valid Companies').item.json.industries }}\nSpecialties: {{ $('Filter Valid Companies').item.json.specialities }}\nLocation: {{ $('Filter Valid Companies').item.json.locations?.toJsonString() }}\nFounded in: {{ $('Filter Valid Companies').item.json.founded_on }}\nFunding: {{ $('Filter Valid Companies').item.json.funding?.toJsonString() }}\n",
							},
						],
					},
					jsonOutput: true,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1700, 800],
				name: 'AI Company Scoring',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 2 }, position: [2060, 800], name: 'Wait 2s' },
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
							ID: "={{ $('Get Company Info').item.json.id }}",
							Name: "={{ $('Get Company Info').item.json.name }}",
							Score: '={{ $json.message.content.score }}',
							State: 'Qualified',
							Summary: "={{ $('Get Company Info').item.json.description }}",
							Website: "={{ $('Get Company Info').item.json.website }}",
							LinkedIn: "={{ $('Get Company Info').item.json.url }}",
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
								id: 'State',
								type: 'string',
								display: true,
								removed: false,
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
							'https://docs.google.com/spreadsheets/d/10lxvwdeCf7vrAuWsNRGIsSTICEI3z-SUCDVHr8XzAYQ/edit#gid=0',
						cachedResultName: 'Companies',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1LfhqpyjimLjyQcmWY8mUr6YtNBcifiOVLIhAJGV9jiM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1LfhqpyjimLjyQcmWY8mUr6YtNBcifiOVLIhAJGV9jiM/edit?usp=drivesdk',
						cachedResultName: 'CRM',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2260, 800],
				name: 'Add Company to CRM',
			},
		}),
	)
	.add(
		sticky(
			'## LinkedIn Company Search\nThis section initiates the workflow and searches for your target companies on LinkedIn using the Ghost Genius API.\n\nYou can filter and refine your search using keywords, company size, location, industry, or even whether the company has active job postings. Use the "Set Variables" node for it (this node also allows you to customize the AI Lead Scoring prompt).\n\nNote that you can retrieve a maximum of 1000 companies per search (corresponding to 100 LinkedIn pages), so it\'s important not to exceed this number of results to avoid losing prospects.\n\nExample: Let\'s say I want to target Growth Marketing Agencies with 11-50 employees. I do my search and see that there are 10,000 results. So I refine my search by using location to go country by country and retrieve all 10,000 results in several batches ranging from 500 to 1000 depending on the country.\n\nTips: To test the workflow or to see the number of results of your search, change the pagination parameter (Max Pages) in the "Search Companies" node. It will be displayed at the very top of the response JSON.',
			{ color: 6, position: [-500, 440], width: 860, height: 560 },
		),
	)
	.add(
		sticky(
			"## Company Data Processing \nThis section processes each company individually.\n\nWe retrieve all the company information using Get Company Details by using the LinkedIn link obtained from the previous section.\n\nThen we filter the company based on the number of followers, which gives us a first indication of the company's credibility (200 in this case), and whether their LinkedIn page has a website listed.\n\nThe workflow implements batch processing with a 2-second delay between requests to respect API rate limits. This methodical approach ensures reliable data collection while preventing API timeouts.\n\nYou can adjust these thresholds based on your target market - increasing the follower count for more established businesses or decreasing it for emerging markets.\n\nThe last two modules checks if the company already exists in your database (using LinkedIn ID) to prevent duplicates because when you do close enough searches, some companies may come up several times.",
			{ name: 'Sticky Note1', color: 4, position: [440, 440], width: 1120, height: 560 },
		),
	)
	.add(
		sticky(
			'## AI Scoring and Storage\nThis section scores the company and stores it in a Google Sheet.\n\nIt\'s important to properly fill in the "Set variables" node at the beginning of the workflow to get a result relevant to your use case. You can also manually modify the system prompt.\n\nRegardless of the score obtained, it\'s very important to always store the company. Note that we add a 2-second "wait" module to respect Google Sheet\'s rate limits.\n\nWe add the company to the "Companies" sheet in this [Google Sheet](https://docs.google.com/spreadsheets/d/1LfhqpyjimLjyQcmWY8mUr6YtNBcifiOVLIhAJGV9jiM/edit?usp=sharing) which you can make a copy of and use.\n\nThis AI scoring functionality is extremely impressive once perfectly configured, so I recommend taking some time to test with several companies to ensure the scoring system works well for your needs!\n\n',
			{ name: 'Sticky Note2', color: 5, position: [1640, 440], width: 780, height: 560 },
		),
	)
	.add(
		sticky(
			"## Introduction\nWelcome to my template! Before explaining how to set it up, here's some important information:\n\nThis automation is an alternative version of [this template](https://n8n.io/workflows/3717-search-linkedin-companies-and-add-them-to-airtable-crm/) that differs by using Google Sheets instead of Airtable and adding a Lead Scoring system allowing for more precision in our targeting.\n\nThis automation therefore allows you, starting from a LinkedIn search, to enrich company data and score them to determine if they might be interested in your services/product.\n\nFor any questions, you can send me a DM on my [LinkedIn](https://www.linkedin.com/in/matthieu-belin83/) :)  ",
			{ name: 'Sticky Note4', width: 600, height: 380 },
		),
	)
	.add(
		sticky(
			'## Setup\n- Create an account on [Ghost Genius API](ghostgenius.fr) and get your API key.\n\n- Configure the Search Companies and Get Company Info modules by creating a "Header Auth" credential:\n**Name: "Authorization"**\n**Value: "Bearer YOUR_TOKEN_HERE"**\n\n- Create a copy of this [Google Sheet](https://docs.google.com/spreadsheets/d/1LfhqpyjimLjyQcmWY8mUr6YtNBcifiOVLIhAJGV9jiM/edit?usp=sharing) by clicking on File => Make a copy (in Google Sheet).\n\n- Configure your Google Sheet credential by following the n8n documentation.\n\n- Create an OpenAI key [here](https://platform.openai.com/docs/overview) and add the credential to the "AI Company Scoring" node following the n8n documentation.\n\n- Add your information to the "Set Variables" node.',
			{ name: 'Sticky Note5', position: [680, 0], width: 600, height: 380 },
		),
	)
	.add(
		sticky(
			'## Tools \n**(You can use the API and CRM of your choice; this is only a suggestion)**\n\n- API Linkedin : [Ghost Genius API](https://ghostgenius.fr) \n\n- API Documentation : [Documentation](https://ghostgenius.fr/docs)\n\n- CRM : [Google Sheet](https://workspace.google.com/intl/en/products/sheets/)\n\n- AI : [OpenAI](https://openai.com)\n\n- LinkedIn Location ID Finder : [Ghost Genius Locations ID Finder](https://ghostgenius.fr/tools/search-sales-navigator-locations-id)',
			{ name: 'Sticky Note6', position: [1360, 0], width: 600, height: 380 },
		),
	)
	.add(
		sticky('# [Setup Video](http://youtube.com/watch?v=m904RNxtF0w&t)\n', {
			name: 'Sticky Note3',
			color: 3,
			position: [880, -120],
			height: 80,
		}),
	);
