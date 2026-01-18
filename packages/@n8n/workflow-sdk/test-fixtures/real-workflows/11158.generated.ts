const wf = workflow('B01FguFGfZeVurIi', 'Olostep Amazon scraper', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.3,
			config: {
				parameters: {
					options: {},
					formTitle: 'Olostep Amazon Products Scraper',
					formFields: {
						values: [
							{
								fieldLabel: 'search query',
								placeholder: 'wireless bluetooth headphones',
							},
						],
					},
					formDescription: 'please fill all fields',
				},
				position: [-1424, 480],
				name: 'On form submission',
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
								id: '9cb88c80-de98-43d5-af5a-d3b9897ebe9b',
								name: 'counter',
								type: 'array',
								value: '[1,2,3,4,5,6,7,8,9,10]',
							},
						],
					},
				},
				position: [-1248, 480],
				name: 'Edit Fields',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'counter' },
				position: [-1040, 480],
				name: 'Split Out2',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-832, 480], name: 'Loop Over Items' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.olostep.com/v1/scrapes',
					method: 'POST',
					options: { allowUnauthorizedCerts: true },
					jsonBody:
						'={\n  "url_to_scrape": "https://www.amazon.com/s?k={{ $(\'On form submission\').item.json[\'search query\'] }}&page={{ $json.counter }}",\n  "formats": [\n    "json"\n  ],\n  "wait_before_scraping": 6000,\n  "remove_css_selectors": "default",\n  "llm_extract": {\n    "schema": {\n      "type": "array",\n      "description": "A list of products listed on Amazon.",\n      "items": {\n        "type": "object",\n        "properties": {\n          "title": {\n            "type": "string",\n            "description": "The title of the product."\n          },\n          "url": {\n            "type": "string",\n            "description": "The full url for the product."\n          }\n        },\n        "required": [\n          "title",\n          "url"\n        ]\n      }\n    }\n  },\n  "screen_size": {\n    "screen_type": "desktop",\n    "screen_width": 1920,\n    "screen_height": 1080\n  }\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer <token>' }],
					},
				},
				position: [-608, 496],
				name: 'scrape amazon products',
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
								id: '21d26317-c9bc-4a56-a3ca-962254a23329',
								name: 'parsedJson',
								type: 'array',
								value: "={{ $json.result.json_content.replace(/\\\\/g, '') }}",
							},
						],
					},
				},
				position: [-432, 496],
				name: 'parsedInfo',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'parsedJson' },
				position: [-224, 496],
				name: 'Split Out',
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
								id: '62b69c0a-ad68-4fbd-8ecd-9f3b50f5ca2d',
								operator: { type: 'string', operation: 'notStartsWith' },
								leftValue: '={{ $json.url }}',
								rightValue: 'https://www.amazon.com',
							},
						],
					},
				},
				position: [-16, 496],
				name: 'If',
			},
		}),
	)
	.output(0)
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
								id: 'dde443ff-9f08-459a-a3a2-6301cba3c9b8',
								name: 'url',
								type: 'string',
								value: '=https://www.amazon.com{{ $json.url }}',
							},
							{
								id: 'd895888d-ac1d-4a4e-90d6-97e2d0fbc7ed',
								name: 'title',
								type: 'string',
								value: '={{ $json.title }}',
							},
						],
					},
				},
				position: [176, 368],
				name: 'Edit Fields1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.dataTable',
			version: 1,
			config: {
				parameters: {
					columns: {
						value: { url: '={{ $json.url }}', title: '={{ $json.title }}' },
						schema: [
							{
								id: 'title',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'title',
								defaultMatch: false,
							},
							{
								id: 'url',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'url',
								defaultMatch: false,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					dataTableId: {
						__rl: true,
						mode: 'list',
						value: 'hCFSIc5S243rctOO',
						cachedResultUrl: '/projects/V9LxWBdY4sxeqAOs/datatables/hCFSIc5S243rctOO',
						cachedResultName: 'amazon products',
					},
				},
				position: [368, 512],
				name: 'Insert row',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [576, 512], name: 'Wait' },
		}),
	)
	.add(
		sticky('## Pagination  \nIterates through multiple Amazon pages (1–10).\n', {
			name: 'Sticky Note1',
			color: 7,
			position: [-1264, 384],
			width: 352,
			height: 256,
		}),
	)
	.add(
		sticky('## Olostep Amazon Scrape  \nExtracts product title + URL.', {
			name: 'Sticky Note2',
			color: 7,
			position: [-896, 352],
			width: 416,
			height: 368,
		}),
	)
	.add(
		sticky('## Parse & Split  \nConverts JSON output into individual products.', {
			name: 'Sticky Note3',
			color: 7,
			position: [-464, 352],
			width: 784,
			height: 368,
		}),
	)
	.add(
		sticky('## Insert Row  \nSaves each product to a Google Sheet / Data Table.\n', {
			name: 'Sticky Note5',
			color: 7,
			position: [336, 352],
			width: 384,
			height: 368,
		}),
	)
	.add(
		sticky(
			'# Olostep Amazon Products Scraper  \n\nThis n8n template automates Amazon product scraping using the Olostep API.  \nSimply enter a **search query**, and the workflow scrapes multiple Amazon search pages to extract product titles and URLs.  \nResults are cleaned, normalized, and saved into a Google Sheet or Data Table.\n\n## How it works / What it does  \n1. **Form Trigger**  \n   - User enters a search query (e.g., “wireless bluetooth headphones”).  \n   - The query is used to build the Amazon search URL.\n\n2. **Pagination Setup**  \n   - A list of page numbers (1–10) is generated automatically.  \n   - Each number loads the corresponding Amazon search results page.\n\n3. **Scrape Amazon with Olostep**  \n   - For each page, Olostep scrapes Amazon search results.  \n   - Olostep’s LLM extraction returns:  \n     - **title** — product title  \n     - **url** — product link  \n\n4. **Parse & Split Results**  \n   - The JSON output is decoded and turned into individual product items.\n\n5. **URL Normalization**  \n   - If the product URL is relative, it is automatically converted into a full Amazon URL.\n\n6. **Conditional Check (IF node)**  \n   - Ensures only valid product URLs are stored.  \n   - Helps avoid scraping Amazon navigation links or invalid items.\n\n7. **Insert into Sheet / Data Table**  \n   - Each valid product is saved in:  \n     - title  \n     - url  \n\n8. **Automatic Looping & Rate Management**  \n   - A wait step ensures API rate limits are respected while scraping multiple pages.\n\nThis workflow gives you a complete, reliable Amazon scraper with no browser automation and no manual copy/paste — everything runs through the Olostep API and n8n.\n\n## How to set up  \n1. Import this template into your n8n account.  \n2. Add your **Olostep API key**.  \n3. Connect your **Google Sheets** or **Data Table**.  \n4. Deploy the form and start scraping with any Amazon search phrase.',
			{ name: 'Sticky Note6', position: [-2096, 64], width: 608, height: 1152 },
		),
	)
	.add(
		sticky('## Enter a search query  \nExample: “wireless bluetooth headphones”.', {
			color: 7,
			position: [-1472, 352],
			width: 192,
			height: 272,
		}),
	)
	.add(
		sticky(
			'## WARNING\nIf the http request runs through a 504 gateway timeout error try to execute again or set the node settings to retry on failure.',
			{ name: 'Sticky Note4', color: 3, position: [-864, 736], width: 384, height: 128 },
		),
	);
