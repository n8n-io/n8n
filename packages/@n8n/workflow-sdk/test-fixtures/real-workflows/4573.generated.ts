const wf = workflow(
	'95RHN758KyIlB84T',
	'Google Maps business scraper with contact extraction via Apify and Firecrawl',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.1,
			config: {
				parameters: {
					rule: { interval: [{ field: 'minutes', minutesInterval: 30 }] },
				},
				position: [0, -125],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.2,
			config: {
				parameters: {
					options: {},
					filtersUI: { values: [{ lookupValue: 'false', lookupColumn: 'Status' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit#gid=0',
						cachedResultName: 'Query',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit?usp=drivesdk',
						cachedResultName: 'Google Maps Scraper',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [220, -125],
				name: 'Read Pending Queries',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.apify.com/v2/acts/compass~crawler-google-places/runs',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "searchStringsArray": [\n    "restaurant"\n  ],\n  "locationQuery": "New York, USA",\n  "maxCrawledPlacesPerSearch": 15,\n  "language": "en",\n  "maximumLeadsEnrichmentRecords": 0,\n  "maxImages": 0\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpQueryAuth',
					headerParameters: {
						parameters: [
							{ name: 'Content-Type', value: 'application/json' },
							{ name: 'Accept', value: 'application/json' },
						],
					},
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [440, -125],
				name: 'Start Apify Scraping Job',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [660, -125], name: 'Wait for Job Succeed' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.apify.com/v2/actor-runs/{{ $json.data.id }}',
					options: { timeout: 10000 },
					sendHeaders: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpQueryAuth',
					headerParameters: {
						parameters: [
							{ name: 'Content-Type', value: 'application/json' },
							{ name: 'Accept', value: 'application/json' },
						],
					},
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [880, -200],
				name: 'Check Scraping Status',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: { position: [660, -125], name: 'Wait for Job Succeed' },
				}),
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: '=https://api.apify.com/v2/datasets/{{ $json.data.defaultDatasetId }}/items',
							options: { timeout: 10000 },
							sendHeaders: true,
							authentication: 'genericCredentialType',
							genericAuthType: 'httpQueryAuth',
							headerParameters: {
								parameters: [
									{ name: 'Content-Type', value: 'application/json' },
									{ name: 'Accept', value: 'application/json' },
								],
							},
						},
						credentials: {
							httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
							httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
						},
						position: [1320, -125],
						name: 'Fetch Scraped Results',
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
							typeValidation: 'loose',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'de704919-205a-470f-a417-b297fbbdbaf8',
								operator: { type: 'string', operation: 'notEquals' },
								leftValue: '={{ $json.data.status }}',
								rightValue: 'SUCCEEDED',
							},
						],
					},
					looseTypeValidation: true,
				},
				name: 'Loop Until Complete',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							phone: '={{ $json.phone }}',
							title: '={{ $json.title }}',
							status: 'false',
							address: '={{ $json.address }}',
							website: '={{ $json.website }}',
							categoryName: '={{ $json.categoryName }}',
							searchString: '={{ $json.searchString }}',
						},
						schema: [
							{
								id: 'searchString',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'searchString',
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
								id: 'categoryName',
								type: 'string',
								display: true,
								required: false,
								displayName: 'categoryName',
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
								id: 'phone',
								type: 'string',
								display: true,
								required: false,
								displayName: 'phone',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'website',
								type: 'string',
								display: true,
								required: false,
								displayName: 'website',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'status',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['searchString'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1948906848,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit#gid=1948906848',
						cachedResultName: 'Data',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit?usp=drivesdk',
						cachedResultName: 'Google Maps Scraper',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1540, -125],
				name: 'Save Business Data',
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
								id: '2218f0be-2c48-4a1a-bd21-8bdb67c495a1',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: '={{ $json.website }}',
								rightValue: '',
							},
							{
								id: 'd0ef3194-ee94-45c5-b9c3-5db32f08d1b5',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.status }}',
								rightValue: 'false',
							},
						],
					},
				},
				position: [1760, -125],
				name: 'Filter Businesses with Websites',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: {} },
				position: [1980, -125],
				name: 'Batch Processing Logic',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.firecrawl.dev/v1/scrape',
					method: 'POST',
					options: {},
					jsonBody: '={\n  "url": "{{ $json.website }}",\n  "formats": [\n    "html"\n  ]\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
				},
				credentials: {
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2260, -220],
				name: 'Scrape Website Content',
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
						"// N8N Code Node - Extract emails, LinkedIn, Facebook, Instagram for single item\nconst item = $input.first();\n\n// Get the text content to search (adjust field names as needed)\nconst textContent = item.json.data.html;\n\n// Initialize result object\nconst result = {\n  website: $('Batch Processing Logic').first().json.website,\n  emails: \"None\",\n  linkedin: \"None\", \n  facebook: \"None\",\n  instagram: \"None\",\n  twitter: \"None\"\n};\n\n// Email extraction regex - matches common email patterns\nconst emailRegex = /\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b/gi;\nconst emails = textContent.match(emailRegex);\n\nif (emails && emails.length > 0) {\n  // Remove duplicates and filter out common non-email matches\n  const uniqueEmails = [...new Set(emails)].filter(email => {\n    const lowerEmail = email.toLowerCase();\n    return !lowerEmail.includes('example.com') && \n           !lowerEmail.includes('test@') &&\n           !lowerEmail.includes('noreply@') &&\n           !lowerEmail.includes('no-reply@') &&\n           lowerEmail.length > 5;\n  });\n  \n  if (uniqueEmails.length > 0) {\n    result.emails = uniqueEmails.length === 1 ? uniqueEmails[0] : uniqueEmails.join(', ');\n  }\n}\n\n// LinkedIn extraction - improved pattern\nconst linkedinRegex = /(?:https?:\\/\\/)?(?:www\\.)?linkedin\\.com\\/(?:in\\/|company\\/|pub\\/)[a-zA-Z0-9\\-._]+\\/?/gi;\nconst linkedinMatches = textContent.match(linkedinRegex);\nif (linkedinMatches && linkedinMatches.length > 0) {\n  const cleanLinkedin = linkedinMatches[0].replace(/^(?:https?:\\/\\/)?(?:www\\.)?/i, 'https://www.');\n  result.linkedin = cleanLinkedin;\n}\n\n// Facebook extraction - improved to match numeric IDs and usernames\nconst facebookRegex = /(?:https?:\\/\\/)?(?:www\\.|m\\.|mobile\\.)?facebook\\.com\\/(?:[^\\/\\s]+\\/)*[^\\/\\s?#]+/gi;\nconst facebookMatches = textContent.match(facebookRegex);\nif (facebookMatches && facebookMatches.length > 0) {\n  const cleanFacebook = facebookMatches[0].replace(/^(?:https?:\\/\\/)?(?:www\\.)?/i, 'https://www.');\n  result.facebook = cleanFacebook;\n}\n\n// Instagram extraction - improved to match various URL formats\nconst instagramRegex = /(?:https?:\\/\\/)?(?:www\\.)?instagram\\.com\\/[a-zA-Z0-9\\-._]+\\/?/gi;\nconst instagramMatches = textContent.match(instagramRegex);\nif (instagramMatches && instagramMatches.length > 0) {\n  const cleanInstagram = instagramMatches[0].replace(/^(?:https?:\\/\\/)?(?:www\\.)?/i, 'https://www.');\n  result.instagram = cleanInstagram;\n}\n\n// Twitter/X extraction - improved to match usernames properly\nconst twitterRegex = /(?:https?:\\/\\/)?(?:www\\.)?(?:twitter\\.com|x\\.com)\\/[a-zA-Z0-9_]+\\/?/gi;\nconst twitterMatches = textContent.match(twitterRegex);\nif (twitterMatches && twitterMatches.length > 0) {\n  const cleanTwitter = twitterMatches[0].replace(/^(?:https?:\\/\\/)?(?:www\\.)?/i, 'https://www.');\n  result.twitter = cleanTwitter;\n}\n\n// Alternative extraction for social handles without full URLs\n// Look for @username patterns for Instagram and Twitter\nif (result.instagram === \"None\") {\n  const igHandleRegex = /@([a-zA-Z0-9._]{1,30})/gi;\n  const igHandles = textContent.match(igHandleRegex);\n  if (igHandles && igHandles.length > 0) {\n    const username = igHandles[0].replace('@', '');\n    if (username.length > 0 && !username.includes(' ')) {\n      result.instagram = `https://www.instagram.com/${username}`;\n    }\n  }\n}\n\n// Look for Twitter handles without full URLs\nif (result.twitter === \"None\") {\n  const twitterHandleRegex = /@([a-zA-Z0-9_]{1,15})/gi;\n  const twitterHandles = textContent.match(twitterHandleRegex);\n  if (twitterHandles && twitterHandles.length > 0) {\n    const username = twitterHandles[0].replace('@', '');\n    if (username.length > 0 && !username.includes(' ')) {\n      result.twitter = `https://www.x.com/${username}`;\n    }\n  }\n}\n\n// Clean up URLs - remove trailing slashes and parameters\n['linkedin', 'facebook', 'instagram', 'twitter'].forEach(platform => {\n  if (result[platform] !== \"None\") {\n    result[platform] = result[platform].split('?')[0].split('#')[0].replace(/\\/$/, '');\n  }\n});\n\nreturn result;",
				},
				position: [2480, -220],
				name: 'Extract Contact Information',
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
							emails: '={{ $json.emails }}',
							twitter: '={{ $json.twitter }}',
							website: '={{ $json.website }}',
							facebook: '={{ $json.facebook }}',
							linkedin: '={{ $json.linkedin }}',
							instagram: '={{ $json.instagram }}',
						},
						schema: [
							{
								id: 'website',
								type: 'string',
								display: true,
								required: false,
								displayName: 'website',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'emails',
								type: 'string',
								display: true,
								required: false,
								displayName: 'emails',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'linkedin',
								type: 'string',
								display: true,
								required: false,
								displayName: 'linkedin',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'facebook',
								type: 'string',
								display: true,
								required: false,
								displayName: 'facebook',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'instagram',
								type: 'string',
								display: true,
								required: false,
								displayName: 'instagram',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'twitter',
								type: 'string',
								display: true,
								required: false,
								displayName: 'twitter',
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
						value: 2056137853,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit#gid=2056137853',
						cachedResultName: 'Details',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit?usp=drivesdk',
						cachedResultName: 'Google Maps Scraper',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2700, -220],
				name: 'Save Contact Details',
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
						value: { status: 'true', website: '={{ $json.website }}' },
						schema: [
							{
								id: 'searchString',
								type: 'string',
								display: true,
								required: false,
								displayName: 'searchString',
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
								id: 'categoryName',
								type: 'string',
								display: true,
								required: false,
								displayName: 'categoryName',
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
								id: 'phone',
								type: 'string',
								display: true,
								required: false,
								displayName: 'phone',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'website',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'website',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'hasWebsite',
								type: 'string',
								display: true,
								required: false,
								displayName: 'hasWebsite',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'status',
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
						matchingColumns: ['website'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1948906848,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit#gid=1948906848',
						cachedResultName: 'Data',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit?usp=drivesdk',
						cachedResultName: 'Google Maps Scraper',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2920, -160],
				name: 'Mark as Processed',
			},
		}),
	)
	.add(
		sticky(
			'## 🚀 INITIALIZATION PHASE\n- Triggers every 30 minutes\n- Reads unprocessed records from [Google Sheet](https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit?usp=sharing)\n- Starts Google Places scraper for restaurants\n- Waits for completion',
			{ color: 4, position: [20, -360], width: 640, height: 180 },
		),
	)
	.add(
		sticky(
			'## 📊 DATA COLLECTION PHASE\n- Monitors scraper job status\n- Loops until job completes\n- Fetches scraped restaurant data\n- Saves to "Data" sheet in [Google Sheets](https://docs.google.com/spreadsheets/d/1DHezdcetT0c3Ie1xB3z3jDc5WElsLN87K4J9EQDef9g/edit?usp=sharing)',
			{ name: 'Sticky Note1', position: [940, -420], width: 660, height: 180 },
		),
	)
	.add(
		sticky(
			'## 🌐 WEBSITE PROCESSING PHASE\n- Filters restaurants with valid websites\n- Loops through each website\n- Scrapes website content with Firecrawl\n- Extracts contact information (emails, social media)\n- Saves to "Details" sheet and marks as processed',
			{ name: 'Sticky Note2', color: 6, position: [1940, -460], width: 740, height: 200 },
		),
	)
	.add(
		sticky(
			'## 🔄 LOOPS\n**Status Check Loop**: Continues until scraper job is complete\n**Website Processing Loop**: Processes each restaurant website individually',
			{ name: 'Sticky Note3', position: [2260, 80], width: 580, height: 120 },
		),
	);
