const wf = workflow(
	'UkKQ9WAMrgGbWCJw',
	'💥 Automate Scrape Google Maps Business Leads (Email, Phone, Website) using Apify -vide II',
)
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				position: [-2144, 4032],
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
						"// Parse the Telegram message and extract three comma-separated values\nconst messageText = $input.first().json.message.text;\n\n// Split by commas and trim whitespace\nconst parts = messageText.split(';').map(part => part.trim());\n\n// Extract the three values\nconst sector = parts[0] || '';\nconst limit = parseInt(parts[1]) || 0;\nconst mapsUrl = parts[2] || '';\n\n// Return the parsed data as a JSON object\nreturn [\n  {\n    json: {\n      sector: sector,\n      limit: limit,\n      mapsUrl: mapsUrl\n    }\n  }\n];",
				},
				position: [-1920, 4032],
				name: 'Extract Input Data',
			},
		}),
	)
	.then(
		node({
			type: '@apify/n8n-nodes-apify.apify',
			version: 1,
			config: {
				parameters: {
					actorId: {
						__rl: true,
						mode: 'list',
						value: 'nwua9Gu5YrADL7ZDj',
						cachedResultUrl: 'https://console.apify.com/actors/nwua9Gu5YrADL7ZDj/input',
						cachedResultName: 'Google Maps Scraper (compass/crawler-google-places)',
					},
					timeout: {},
					customBody:
						'={\n    "includeWebResults": false,\n    "language": "fr",\n    "locationQuery": "",\n    "maxCrawledPlacesPerSearch": {{ $(\'Extract Input Data\').item.json.limit }},\n    "maxImages": 0,\n    "maximumLeadsEnrichmentRecords": 0,\n    "scrapeContacts": false,\n    "scrapeDirectories": false,\n    "scrapeImageAuthors": false,\n    "scrapePlaceDetailPage": false,\n    "scrapeReviewsPersonalData": true,\n    "scrapeTableReservationProvider": false,\n    "searchStringsArray": [\n        "{{ $(\'Extract Input Data\').item.json.sector }}"\n    ],\n    "skipClosedPlaces": false,\n    "startUrls": [\n        {\n            "url": "{{ $(\'Extract Input Data\').item.json.mapsUrl }}"\n        }\n    ]\n}',
				},
				position: [-1680, 4032],
				name: 'Run Google Maps Scraper',
			},
		}),
	)
	.then(
		node({
			type: '@apify/n8n-nodes-apify.apify',
			version: 1,
			config: {
				parameters: {
					limit: {},
					offset: {},
					resource: 'Datasets',
					datasetId: '={{ $json.defaultDatasetId }}',
				},
				position: [-1440, 4032],
				name: 'Get dataset items',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.removeDuplicates',
			version: 2,
			config: {
				parameters: {
					compare: 'selectedFields',
					options: {},
					fieldsToCompare: 'title',
				},
				position: [-1200, 4032],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-800, 4032], name: 'Loop Over Items' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: 'DONE',
					chatId: "={{ $('Telegram Trigger').first().json.message.chat.id }}",
					additionalFields: {},
				},
				position: [-784, 4272],
				name: 'Notification message',
			},
		}),
	)
	.output(1)
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
					options: {},
					messages: {
						values: [
							{
								role: 'system',
								content:
									'=You are an AI assistant specialized in generating professional, concise, and natural company summaries from structured data scraped from Google Maps.\n\nYour goal is to transform the provided company information into a fluent, human-like paragraph suitable for business directories or lead databases.\n\nFollow these principles:\n\nMaintain a professional and informative tone.\n\nWrite in one coherent paragraph (no lists or bullet points).\n\nSmoothly omit any fields that are missing without mentioning it.\n\nThe final text must sound natural and ready for direct publication.\n\nOutput only the final summary paragraph — no explanations, notes, or JSON.',
							},
							{
								content:
									'=Generate a clear and concise summary of the following company based on its Google Maps data:\n\nCompany Name: {{ $json.title }}\nCategory: {{ $json.categoryName }}\nAddress: {{ $json.address }}\nCity: {{ $json.city }}\nCountry: {{ $json.countryCode }}\nPhone: {{ $json.phones }}\nGoogle Maps URL: {{ $json.url }}\n\nWrite a natural paragraph like this example (without quotes):\n\nThe company name is [Name]. It is a [category] located at [address] in [city, country]. You can contact them at [phone]. For more details, visit their Google Maps page: [URL].\n\nEnsure the output flows naturally and excludes any missing information.\n\n',
							},
							{
								content: 'Output the result in the JSON format companySummary',
							},
						],
					},
					jsonOutput: true,
				},
				position: [-544, 4048],
				name: 'AI Company Description Generator',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: {
							url: "={{ $('Loop Over Items').item.json.url }}",
							city: "={{ $('Loop Over Items').item.json.city }}",
							rank: "={{ $('Loop Over Items').item.json.rank }}",
							phone:
								"={{ \"'\" + ($('Loop Over Items').item.json.phonesUncertain || $('Loop Over Items').item.json.phoneUnformatted || '') }}\n",
							title: "={{ $('Loop Over Items').item.json.title }}",
							street: "={{ $('Loop Over Items').item.json.street }}",
							address: "={{ $('Loop Over Items').item.json.address }}",
							website: "={{ $('Loop Over Items').item.json.website }}",
							imageUrl: "={{ $('Loop Over Items').item.json.imageUrl }}",
							scrapedAt: "={{ $('Loop Over Items').item.json.scrapedAt }}",
							categories: "={{ $('Loop Over Items').item.json.categories }}",
							postalcode: "={{ $('Loop Over Items').item.json.postalCode }}",
							totalScore: "={{ $('Loop Over Items').item.json.totalScore }}",
							countryCode: "={{ $('Loop Over Items').item.json.countryCode }}",
							categoryName: "={{ $('Loop Over Items').item.json.categoryName }}",
							isAdvertisement: "={{ $('Loop Over Items').item.json.isAdvertisement }}",
							companySummaryIn: '={{ $json.message.content.companySummary }}',
							phoneUnformatted:
								"={{ $('Loop Over Items').item.json.phonesUncertain || $('Loop Over Items').item.json.phoneUnformatted || 'No phone found' }}\n",
						},
						schema: [
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
								id: 'street',
								type: 'string',
								display: true,
								required: false,
								displayName: 'street',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'city',
								type: 'string',
								display: true,
								required: false,
								displayName: 'city',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'postalcode',
								type: 'string',
								display: true,
								required: false,
								displayName: 'postalcode',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'countryCode',
								type: 'string',
								display: true,
								required: false,
								displayName: 'countryCode',
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
								id: 'phoneUnformatted',
								type: 'string',
								display: true,
								required: false,
								displayName: 'phoneUnformatted',
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
								id: 'Email',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Email',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'totalScore',
								type: 'string',
								display: true,
								required: false,
								displayName: 'totalScore',
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
								id: 'scrapedAt',
								type: 'string',
								display: true,
								required: false,
								displayName: 'scrapedAt',
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
								id: 'rank',
								type: 'string',
								display: true,
								required: false,
								displayName: 'rank',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'isAdvertisement',
								type: 'string',
								display: true,
								required: false,
								displayName: 'isAdvertisement',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'imageUrl',
								type: 'string',
								display: true,
								required: false,
								displayName: 'imageUrl',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'companySummaryIn',
								type: 'string',
								display: true,
								required: false,
								displayName: 'companySummaryIn',
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
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				position: [-160, 4048],
				name: 'Google maps database',
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
								id: 'ccc11066-fad4-4931-acf6-6c45e5e7b117',
								name: 'Site internet',
								type: 'string',
								value: "={{ $('Loop Over Items').first().json.website }}",
							},
						],
					},
				},
				position: [128, 4048],
				name: 'Extract Only Website URLs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: "={{ $json['Site internet'] }}", options: {} },
				position: [384, 4048],
				name: 'Fetch Raw HTML Content from Business Website',
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
						value: 'gpt-4o-mini',
						cachedResultName: 'GPT-4O-MINI',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									'=You are analyzing the HTML content of a business website to extract the most relevant contact email address.\n\nYour task:\n\nExtract only one email address, ideally belonging to the business owner, manager, or main contact person.\n\nIf multiple emails appear, choose the most authoritative or professional one (e.g., not “info@” or “support@” unless it’s the only option).\n\nIf no valid email is found, return exactly:\nNull\n\nOutput rules:\n\nOutput only the email address (no explanation, no JSON, no punctuation, no quotes).\n\nThe result must be a clean, valid email format (e.g., contact@company.com).\n\nWebsite HTML content:\n{{ $json.data }}',
							},
						],
					},
				},
				position: [608, 4048],
				name: 'Extract Business Email from Website HTML (GPT-4)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: {
							Email: '={{ $json.message.content }}',
							title: "={{ $('Loop Over Items').item.json.title }}",
						},
						schema: [
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'categoryName',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'categoryName',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'address',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'street',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'street',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'city',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'city',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'postalcode',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'postalcode',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'countryCode',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'countryCode',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'phone',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'phone',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'phoneUnformatted',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'phoneUnformatted',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'website',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'website',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
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
								id: 'totalScore',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'totalScore',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'categories',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'categories',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'scrapedAt',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'scrapedAt',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'rank',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'rank',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'isAdvertisement',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'isAdvertisement',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'imageUrl',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'imageUrl',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'companySummaryIn',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'companySummaryIn',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['title'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				position: [960, 4048],
				name: 'Email Update',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 2 }, position: [960, 4272], name: 'Pause for rate limit' },
		}),
	)
	.add(
		sticky(
			'## Step 1 - Extract Input Data and  Run Google Maps Scraper\n\n**Purpose:** Parses the Telegram message and extracts the three input parameters needed for the Google Maps scraper.\n\n**Configuration:**\n1. **Mode:** Run Once for All Items\n2. **Language:** JavaScript\n3. **Code Logic:**\n   - Splits the message by semicolons (;)\n   - Extracts three values: sector, limit, mapsUrl\n   - Returns structured JSON output\n\n\n**Purpose:** Executes the Apify Google Maps Scraper actor to collect business listings based on the provided search criteria.\n\n**Configuration:**\n1. **[API : Apify](https://www.apify.com?fpr=udemy)**\n2. **Resource:** Actors\n3. **Operation:** Run actor',
			{
				name: 'Step 2 - Extract Input Data Documentation',
				color: 7,
				position: [-2208, 3472],
				width: 1184,
				height: 1056,
			},
		),
	)
	.add(
		sticky(
			'## Step 2 - Google Maps Database and Extract Business Email\n\n**Purpose:** Appends the processed business data (including AI-generated summary) to a Google Sheet for storage and analysis.\n\n**Configuration:**\n1. **Resource:** Sheet\n2. **Operation:** Append\n3. **Document ID:** 1STVdZYYKCE5Rt3YS4xKlEiZ85FZqTkqIn3ebm8xskYU\n4. **Sheet Name:** Feuille 1\n5. **Columns Mapping Mode:** Define Below\n\n**Purpose:** Uses GPT-4o-mini to intelligently extract the business owner or primary contact email from the website HTML.\n\n**Configuration:**\n1. **Resource:** Text\n2. **Operation:** Message\n3. **Model:** GPT-4o-mini\n4. **Simplify Output:** Enabled\n5. **JSON Output:** Disabled (returns plain text email)',
			{ name: 'Sticky Note8', color: 6, position: [-976, 3472], width: 2160, height: 1056 },
		),
	)
	.add(
		sticky(
			'## 🔄 Google Maps Business Scraper with Email Enrichment\n\n@[youtube](cijBIHI6iLk)\n\n## **Global Purpose:**\nAutomated lead generation system that scrapes business listings from Google Maps, generates AI-powered summaries, extracts contact emails from websites, and stores everything in Google Sheets.\n\n**- [API : Apify](https://www.apify.com?fpr=udemy)** \n**- [Documentation : notion](https://automatisation.notion.site/Automate-Scrape-Google-Maps-Business-Leads-Email-Phone-Website-using-Apify-2a53d6550fd98118ba22e441171944dd?source=copy_link)** \n**- [Google Sheets : copy](https://docs.google.com/spreadsheets/d/1STVdZYYKCE5Rt3YS4xKlEiZ85FZqTkqIn3ebm8xskYU/copy)** \n\n1️⃣ **Extract Input Data and  Run Google Maps Scraper** \n   - Apify scrapes Google Maps for businesses\n   - Dataset retrieved with all business details\n   - Duplicates removed for data quality\n\n\n2️⃣ **Google Maps Database and Extract Business Email** \n   - Each business processed individually:\n     a) AI generates human-readable summary\n     b) Business data + summary saved to Sheet \n     c) Website URL extracted \n     d) Website HTML fetched \n     e) AI extracts email from HTML \n     f) Email updated in Sheet \n     g) 2-second pause before next business \n\n## 📬 Need Help or Want to Customize This?\n**Contact me for consulting and support:** [LinkedIn](https://www.linkedin.com/in/dr-firas/) / [YouTube](https://www.youtube.com/@DRFIRASS)  / [🚀 Mes Ateliers n8n  ](https://hotm.art/formation-n8n)',
			{
				name: 'Workflow Overview Documentation',
				position: [-2832, 3472],
				width: 592,
				height: 1056,
			},
		),
	);
