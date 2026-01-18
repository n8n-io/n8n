const wf = workflow(
	'xiabGWCXUOe469Nm',
	'Google Maps Email Scraper with HTTP Requests & JavaScript',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [140, 0], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://www.google.com/maps/search/calgary+dentists',
					options: {
						response: { response: { fullResponse: true } },
						allowUnauthorizedCerts: true,
					},
				},
				position: [340, 0],
				name: 'Scrape Google Maps',
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
						'const input = $input.first().json.data\nconst regex = /https?:\\/\\/[^\\/\\s"\'>]+/g\nconst websites = input.match(regex)\nreturn websites.map(website => ({json:{website}}))',
				},
				position: [540, 0],
				name: 'Extract URLs',
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
								id: 'bf0a5053-9660-457c-9581-964793bb6d7d',
								operator: { type: 'string', operation: 'notContains' },
								leftValue: '={{ $json.website }}',
								rightValue: 'schema',
							},
							{
								id: '9110b9e0-12aa-45cc-bde0-9eda8c10970e',
								operator: { type: 'string', operation: 'notContains' },
								leftValue: '={{ $json.website }}',
								rightValue: 'google',
							},
							{
								id: 'fb9b6ed6-96a5-4560-ab10-b8a4b9a61a2b',
								operator: { type: 'string', operation: 'notContains' },
								leftValue: '={{ $json.website }}',
								rightValue: 'gg',
							},
							{
								id: '10500c0b-cdbd-4816-aba3-df60d69845dc',
								operator: { type: 'string', operation: 'notContains' },
								leftValue: '={{ $json.website }}',
								rightValue: 'gstatic',
							},
						],
					},
				},
				position: [740, 0],
				name: 'Filter Google URLs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.removeDuplicates',
			version: 2,
			config: { parameters: { options: {} }, position: [940, 0] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.limit',
			version: 1,
			config: { parameters: { maxItems: 10 }, position: [1120, 0] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [1340, 0], name: 'Loop Over Items' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [1520, -60], name: 'Wait1' },
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
								id: 'a6786c58-424a-409a-b87f-8a7592cb7944',
								operator: { type: 'array', operation: 'exists', singleValue: true },
								leftValue: '={{ $json.emails }}',
								rightValue: '',
							},
						],
					},
				},
				position: [1700, -60],
				name: 'Filter Out Empties',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: { parameters: { options: {}, fieldToSplitOut: 'emails' }, position: [1880, -60] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.removeDuplicates',
			version: 2,
			config: { parameters: { options: {} }, position: [2080, -60], name: 'Remove Duplicates (2)' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: { emails: '={{ $json.emails }}' },
						schema: [
							{
								id: 'emails',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'emails',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['emails'],
					},
					options: { useAppend: true },
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1fcijyZM1oU73i2xUbXYJ4j6RshmVEduOkCJji2SJP68/edit#gid=0',
						cachedResultName: 'emails',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1fcijyZM1oU73i2xUbXYJ4j6RshmVEduOkCJji2SJP68',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1fcijyZM1oU73i2xUbXYJ4j6RshmVEduOkCJji2SJP68/edit?usp=drivesdk',
						cachedResultName: 'Scrape WITHOUT Paying for APIs',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2280, -60],
				name: 'Add to Sheet (or whatever you want!)',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.website }}',
					options: { redirect: { redirect: { followRedirects: false } } },
				},
				position: [1520, 100],
				name: 'Scrape Site',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 1 }, position: [1700, 100] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'const input = $input.first().json.data\nconst regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.(?!jpeg|jpg|png|gif|webp|svg)[a-zA-Z]{2,}/g\nconst emails = input.match(regex)\nreturn {json: {emails:emails}}',
				},
				position: [1880, 100],
				name: 'Extract Emails',
			},
		}),
	)
	.add(
		sticky(
			'## 🗺️ STEP 1: Google Maps Data Extraction\n\nThis workflow starts by scraping Google Maps for business listings:\n\n**Process:** Uses HTTP requests to search Google Maps with queries like "Calgary dentists"\n**Output:** Raw HTML containing business listings and website URLs\n**Key:** No APIs required - direct HTML scraping\n\n**Note:** Replace search URL with your target location and business type',
			{ name: 'sticky-note-1', position: [100, -280], width: 350, height: 180 },
		),
	)
	.add(
		sticky(
			'## 🔗 STEP 2: Website URL Processing\n\nExtracts and cleans business website URLs:\n\n1. **Extract URLs:** JavaScript regex finds all website URLs in Google Maps data\n2. **Filter Google URLs:** Removes irrelevant domains (google.com, gstatic, etc.)\n3. **Remove Duplicates:** Eliminates duplicate websites\n4. **Limit:** Controls batch size for testing (adjust for production)\n\n**Result:** Clean list of actual business websites ready for email extraction',
			{ name: 'sticky-note-2', position: [300, -320], width: 380, height: 200 },
		),
	)
	.add(
		sticky(
			'## 🔄 STEP 3: Smart Website Scraping\n\nProcesses each website individually to prevent IP blocking:\n\n**Loop Over Items:** Processes websites one by one with built-in delays\n**Scrape Site:** Downloads HTML content from each business website\n**Wait Nodes:** Prevent rate limiting and IP blocking\n**Error Handling:** Continues processing even if some sites fail\n\n**Critical:** The batching and delays are essential for reliable operation at scale',
			{ name: 'sticky-note-3', position: [700, -320], width: 380, height: 200 },
		),
	)
	.add(
		sticky(
			'## 📧 STEP 4: Email Extraction & Export\n\nFinal processing pipeline:\n\n1. **Extract Emails:** JavaScript regex finds all email addresses in website HTML\n2. **Filter Out Empties:** Removes websites with no emails found\n3. **Split Out:** Converts email arrays into individual items\n4. **Remove Duplicates:** Final deduplication across all sources\n5. **Add to Sheet:** Exports clean email list to Google Sheets\n\n**Result:** Organized database of business emails ready for outreach',
			{ name: 'sticky-note-4', position: [1100, -340], width: 400, height: 220 },
		),
	);
