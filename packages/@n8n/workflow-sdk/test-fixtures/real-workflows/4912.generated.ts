const wf = workflow(
	'bCzsdWA9ELzYNPUy',
	'Lead Workflow: Yelp & Trustpilot Scraping + OpenAI Analysis via BrightData',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'YelpDataScraper',
					formFields: {
						values: [
							{ fieldLabel: 'country' },
							{ fieldLabel: 'category ' },
							{ fieldLabel: 'location' },
						],
					},
				},
				position: [-640, -3320],
				name: 'Form Trigger - Get User Input',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "=You are an intelligent assistant helping to guide in location like i will give me some details like country location and business category so what you have to do give me some location names based in location (city).\n\nhere are some details:\n- Country: {{ $json.country }}\n- Location: {{ $json.location }}\n- Category: {{ $json['category '] }}\n\nnow analyse this city and find some sub placeces in this city and give me their name commas seperated for example we have a city Fort Worth so in Fort Worth there are many famous location or areas so you have to give some location and area name in this city.\n\n- ouput should be comma seperated.\n- do not include intro outro supporting text.\n- dont use special characters like $,*,# and more.",
					options: {},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {}, modelName: 'models/gemini-1.5-flash' },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Gemini - Location AI Model',
						},
					}),
				},
				position: [-340, -3460],
				name: 'AI Location Analyzer',
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
						"// Get the input data\nconst category = $('Form Trigger - Get User Input').first().json['category '];\nconst country = $('Form Trigger - Get User Input').first().json.country;\nconst aiOutput = $input.first().json.output;\n\n// Clean and split the AI output to get individual locations\nconst locationsString = aiOutput.replace(/[{}]/g, '').trim(); // Remove curly braces\nconst locations = locationsString\n  .split(',')\n  .map(location => location.trim())\n  .filter(location => location.length > 0); // Remove empty strings\n\n// Create output array with each location as a separate item\nconst output = locations.map((location, index) => {\n  return {\n    id: index + 1,\n    category: category,\n    country: country,\n    location: location\n  };\n});\n\n// Return the transformed data\nreturn output;",
				},
				position: [160, -3520],
				name: 'Split Sub-locations',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [460, -3520], name: 'Loop Yelp Locations' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Set to collect unique non-empty websites\nconst websites = new Set();\n\nfor (const item of items) {\n  const website = item.json["Company Website"];\n  if (website && website.toString().trim() !== "") {\n    websites.add(website.toString().trim());\n  }\n}\n\n// Return one item per website\nreturn Array.from(websites).map(site => {\n  return {\n    json: {\n      website: site\n    }\n  };\n});\n',
				},
				position: [1760, -3540],
				name: 'Clean Unique Websites',
			},
		}),
	)
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
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID_PLACEHOLDER/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1hJD3mDpa93IvPrnvo29FFfqQWEAjGHA_wGG5hfIlqlk',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID_PLACEHOLDER/edit?usp=drivesdk',
						cachedResultName: 'Lead Generator Finder',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2020, -3540],
				name: 'Read Yelp Sheet Websites',
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
						'return items.map(item => {\n  const rawUrl = item.json["Company Website"] || "";\n  const cleanDomain = rawUrl.replace(/^https?:\\/\\//, "").replace(/\\/$/, "");\n  const trustpilotUrl = `https://www.trustpilot.com/review/${cleanDomain}`;\n\n  return {\n    json: {\n      "Trustpilot Website URL": trustpilotUrl\n    }\n  };\n});\n',
				},
				position: [2200, -3540],
				name: 'Make Trustpilot URLs',
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
						'const seen = new Set();\nconst output = [];\n\nfor (const item of items) {\n  const url = item.json["Trustpilot Website URL"];\n  \n  if (!seen.has(url)) {\n    seen.add(url);\n    output.push({ json: { "Trustpilot Website URL": url } });\n  }\n}\n\nreturn output;\n',
				},
				position: [2440, -3180],
				name: 'Remove Duplicate TP URLs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: {} },
				position: [-420, -2740],
				name: 'Loop Trustpilot URLs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.brightdata.com/datasets/v3/trigger',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "input": [\n    {\n      "url": "{{ $json["Trustpilot Website URL"] }}",\n      "date_posted": ""\n    }\n  ],\n  "custom_output_fields": [\n    "company_name",\n    "review_id",\n    "review_date",\n    "review_rating",\n    "review_title",\n    "review_content",\n    "is_verified_review",\n    "review_date_of_experience",\n    "reviewer_location",\n    "reviews_posted_overall",\n    "review_replies",\n    "review_useful_count",\n    "reviewer_name",\n    "company_logo",\n    "url",\n    "company_rating_name",\n    "company_overall_rating",\n    "is_verified_company",\n    "company_total_reviews",\n    "5_star",\n    "4_star",\n    "3_star",\n    "2_star",\n    "1_star",\n    "company_about",\n    "company_email",\n    "company_phone",\n    "company_location",\n    "company_country",\n    "breadcrumbs",\n    "company_category",\n    "company_id",\n    "company_website",\n    "company activity",\n    "company_other_categories",\n    "review_url",\n    "date_posted"\n  ]\n} ',
					sendBody: true,
					sendQuery: true,
					sendHeaders: true,
					specifyBody: 'json',
					queryParameters: {
						parameters: [
							{ name: 'dataset_id', value: 'gd_lm5zmhwd2sni130p' },
							{ name: 'include_errors', value: 'true' },
							{ name: 'limit_multiple_results', value: '2' },
						],
					},
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
				},
				position: [-60, -2940],
				name: 'Trigger Trustpilot Scraper',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.brightdata.com/datasets/v3/progress/{{ $json.snapshot_id }}',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: { parameters: [{ name: 'format', value: 'json' }] },
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
				},
				position: [200, -2940],
				name: 'Check Trustpilot Scrape Progress',
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
						combinator: 'or',
						conditions: [
							{
								id: '35ed620d-b5d5-4e97-bcc5-52b283d85616',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.status }}',
								rightValue: 'ready',
							},
						],
					},
				},
				position: [400, -2940],
				name: 'Verify Trustpilot Scraper Ready',
			},
		}),
	)
	.output(0)
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
								id: 'f01bd215-c406-493c-a6e4-2b8ec5686b44',
								operator: { type: 'number', operation: 'notEquals' },
								leftValue: '={{ $json.records }}',
								rightValue: '={{ 0 }}',
							},
						],
					},
				},
				position: [940, -2820],
				name: 'If Trustpilot Has Records',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.brightdata.com/datasets/v3/snapshot/{{ $json.snapshot_id }}',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: { parameters: [{ name: 'format', value: 'json' }] },
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
				},
				position: [1180, -2840],
				name: 'Download Trustpilot Data',
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
							Email: '={{ $json.company_email }}',
							Rating: '={{ $json.review_rating }}',
							Address: '={{ $json.company_location }}',
							'Company Name': '={{ $json.company_name }}',
							'Phone Number': '={{ $json.company_phone }}',
							'Company About': '={{ $json.company_about }}',
						},
						schema: [
							{
								id: 'Email',
								type: 'string',
								display: true,
								removed: false,
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
								id: 'Address',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Rating',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Rating',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Company Name',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Company Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Company About',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Company About',
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
						value: 972788573,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID_PLACEHOLDER/edit#gid=972788573',
						cachedResultName: 'Mail Scrap',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1xkNBckPDGf4YR74bJQN07tAr3qlEoA-70pQc63nBqZ8',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID_PLACEHOLDER/edit?usp=drivesdk',
						cachedResultName: 'Job Finder sheet',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1460, -2840],
				name: 'Save Trustpilot Data to Sheet',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					filtersUI: {
						values: [{ lookupValue: '=demo@example.com', lookupColumn: 'Email' }],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 972788573,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID_PLACEHOLDER/edit#gid=972788573',
						cachedResultName: 'Mail Scrap',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1xkNBckPDGf4YR74bJQN07tAr3qlEoA-70pQc63nBqZ8',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID_PLACEHOLDER/edit?usp=drivesdk',
						cachedResultName: 'Job Finder sheet',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1680, -2840],
				name: 'Read Emails from Trustpilot Sheet',
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
						'const seen = new Set();\nconst output = [];\n\nfor (const item of items) {\n  const email = item.json.Email;\n  if (!email || seen.has(email)) continue;\n\n  seen.add(email);\n\n  output.push({\n    json: {\n      email: email\n    }\n  });\n}\n\nreturn output;\n',
				},
				position: [1880, -2840],
				name: 'Get Unique Emails',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=`Write a friendly and professional outreach message from a digital marketing agency to the business\n\nThe message should offer services to help them boost their sales and services, such as SEO, ads, and website optimization.\n\nReturn the result in JSON format with:\n{\n  "email": "{{ $json.email }}"\n}`\n',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
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
							credentials: {
								anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
							},
							name: 'Claude - Email AI Model',
						},
					}),
				},
				position: [2080, -2840],
				name: 'AI Generate Email Content',
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
						"// Fix for parsing AI email output\ntry {\n    const output = $input.first().json.output;\n    \n    // Remove the ```json\\n prefix and ```\\n suffix if present\n    let cleanOutput = output;\n    if (output.startsWith('```json\\n')) {\n        cleanOutput = output.replace(/^```json\\n/, '').replace(/\\n```$/, '');\n    }\n    \n    // Parse the JSON\n    const parsed = JSON.parse(cleanOutput);\n    \n    // Return the email details as separate fields\n    return {\n        email: parsed.email || '',\n        subject: parsed.subject || '',\n        content: parsed.message || parsed.content || ''\n    };\n    \n} catch (error) {\n    // If JSON parsing fails, try to extract info using regex from the raw output\n    const output = $input.first().json.output;\n    \n    const emailMatch = output.match(/\"email\":\\s*\"([^\"]*)\"/);\n    const subjectMatch = output.match(/\"subject\":\\s*\"([^\"]*)\"/);\n    const messageMatch = output.match(/\"message\":\\s*\"([^\"]*(?:\\\\.[^\"]*)*)\"/);\n    \n    return {\n        email: emailMatch ? emailMatch[1] : '',\n        subject: subjectMatch ? subjectMatch[1] : '',\n        content: messageMatch ? messageMatch[1].replace(/\\\\n/g, '\\n').replace(/\\\\\"/g, '\"') : ''\n    };\n}",
				},
				position: [2480, -2840],
				name: 'Parse Email JSON',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: '={{ $json.email }}',
					message: '={{ $json.content }}',
					options: {},
					subject: '={{ $json.subject }}',
					emailType: 'text',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [2720, -2720],
				name: 'Send Outreach Email',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { unit: 'minutes', amount: 1 },
				position: [560, -2840],
				name: 'Wait (1 min) Trustpilot Completion',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.brightdata.com/datasets/v3/trigger',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "input": [\n    {\n      "country": "{{ $json.country }}",\n      "location": "{{ $json.location }}",\n      "category": "{{ $json.category }}"\n    }\n  ],\n  "custom_output_fields": [\n    "name",\n    "overall_rating",\n    "reviews_count",\n    "categories",\n    "website",\n    "phone_number",\n    "address",\n    "url"\n  ]\n}\n',
					sendBody: true,
					sendQuery: true,
					sendHeaders: true,
					specifyBody: 'json',
					queryParameters: {
						parameters: [
							{ name: 'dataset_id', value: 'gd_lgugwl0519h1p14rwk' },
							{ name: 'include_errors', value: 'true' },
							{ name: 'type', value: 'discover_new' },
							{ name: 'discover_by', value: 'search_filters' },
							{ name: 'limit_per_input', value: '10' },
						],
					},
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
				},
				position: [560, -3360],
				name: 'Yelp Scraper',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.brightdata.com/datasets/v3/progress/{{ $json.snapshot_id }}',
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
				},
				position: [760, -3360],
				name: 'Check Yelp Scrape Progress',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { unit: 'minutes', amount: 1 },
				position: [960, -3360],
				name: 'Wait (1 min) Yelp Completion',
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
						combinator: 'or',
						conditions: [
							{
								id: '35ed620d-b5d5-4e97-bcc5-52b283d85616',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.status }}',
								rightValue: 'ready',
							},
						],
					},
				},
				position: [1200, -3360],
				name: 'Verify Yelp Ready',
			},
		}),
	)
	.output(0)
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
								id: '80b55138-4007-47ce-9e4a-bf001c875047',
								operator: { type: 'number', operation: 'notEquals' },
								leftValue: '={{ $json.records }}',
								rightValue: 0,
							},
						],
					},
				},
				position: [1420, -3380],
				name: 'If Yelp Has Records',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.brightdata.com/datasets/v3/snapshot/{{ $json.snapshot_id }}',
					options: {},
					sendQuery: true,
					sendHeaders: true,
					queryParameters: { parameters: [{ name: 'format', value: 'json' }] },
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
				},
				position: [1660, -3400],
				name: 'Fetch Yelp Results',
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
							URL: '={{ $json.url }}',
							name: '={{ $json.name }}',
							address: '={{ $json.address }}',
							'Phone No': '={{ $json.phone_number }}',
							categories: '={{ $json.categories }}',
							overall_rating: '={{ $json.name }}',
							'Company Website': '={{ $json.website }}',
						},
						schema: [
							{
								id: 'overall_rating',
								type: 'string',
								display: true,
								required: false,
								displayName: 'overall_rating',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'categories',
								type: 'string',
								display: true,
								required: false,
								displayName: 'categories',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Phone No',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Phone No',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'address',
								type: 'string',
								display: true,
								required: false,
								displayName: 'address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Company Website',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Company Website',
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
							'https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID_PLACEHOLDER/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1hJD3mDpa93IvPrnvo29FFfqQWEAjGHA_wGG5hfIlqlk',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/GOOGLE_SHEET_ID_PLACEHOLDER/edit?usp=drivesdk',
						cachedResultName: 'Lead Generator Finder',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1820, -3260],
				name: 'Save Yelp Data to Sheet',
			},
		}),
	)
	.add(
		sticky(
			'Make a Copy of This Google Sheet.\n\n(https://docs.google.com/spreadsheets/d/1hX0MD_BLVWuEaXwOjKtwrWsjsBzc32ZtFVjP7wVGQYI/edit?usp=drive_link)',
			{ color: 4, position: [200, -3920], width: 340 },
		),
	)
	.add(
		sticky(
			'Optimized Workflow Summary:\nThis automation identifies high-quality leads from Yelp and Trustpilot based on a user-submitted location and business category. It uses AI to break down the area into sub-locations, scrapes business details via BrightData, checks credibility through Trustpilot reviews, and stores the best matches in Google Sheets. Finally, AI generates personalized outreach emails, which are automatically sent via Gmail — enabling fully automated lead generation and email marketing with zero manual effort.',
			{ name: 'Sticky Note1', color: 7, position: [0, -4200], width: 880, height: 520 },
		),
	);
