const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-400, 672], name: 'Start' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"const categories = [\n  'Electronics',\n  'Clothing & Fashion',\n  'Home & Furniture',\n  'Food & Beverages',\n  'Sports & Outdoors',\n  'Beauty & Personal Care'\n];\nconst regions = [\n  'North America',\n  'South America',\n  'Europe',\n  'Asia',\n  'Africa',\n  'Oceania',\n  'Middle East',\n  'Central Asia'\n];\n\nfunction randomDateWithin730Days() {\n  const now = new Date();\n  const daysAgo = Math.floor(Math.random() * 730);\n  now.setDate(now.getDate() - daysAgo);\n  return now.toISOString().slice(0, 10);\n}\n\nlet items = [];\nfor (let i = 0; i < 1000; i++) {\n  items.push({\n    json: {\n      order_date: randomDateWithin730Days(),\n      product_category: categories[Math.floor(Math.random() * categories.length)],\n      region: regions[Math.floor(Math.random() * regions.length)],\n      sales_amount: (50 + Math.random() * 49950).toFixed(2)\n    }\n  });\n}\nreturn items;",
				},
				position: [32, 672],
				name: 'Sample Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: { options: {}, aggregate: 'aggregateAllItemData' },
				position: [368, 672],
				name: 'Process Data',
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
					url: 'https://ada.im/api/platform_api/EchartsVisualization',
					method: 'POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'input_json', value: '={{$json.data}}' },
							{
								name: 'query',
								value:
									'Use a pie chart to display the sales of each product in 2024, and a line chart to represent the total monthly sales of each product in 2024. Additionally, you can add some extra charts based on the data.',
							},
							{ name: 'platform', value: 'n8n' },
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				position: [592, 1024],
				name: 'DataVisualization',
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
								id: 'ab328d59-6af7-4084-9c75-a7b5c5673168',
								name: 'html',
								type: 'string',
								value: '={{ JSON.parse($json.data).data }}',
							},
						],
					},
				},
				position: [800, 1024],
				name: 'Process Visualization Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.convertToFile',
			version: 1.1,
			config: {
				parameters: {
					options: { fileName: 'chart.html' },
					operation: 'toText',
					sourceProperty: 'html',
					binaryPropertyName: 'chart',
				},
				position: [1008, 1024],
				name: 'Convert to HTML File',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					message: 'From n8n, please use a browser to open the HTML file in the attachment',
					options: {
						attachmentsUi: { attachmentsBinary: [{ property: '=chart' }] },
					},
					subject: 'n8ntest',
					emailType: 'text',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1488, 1024],
				name: 'Send DataVisualization',
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
					url: 'https://ada.im/api/platform_api/PythonDataAnalysis',
					method: 'POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'input_json', value: '={{$json.data}}' },
							{
								name: 'query',
								value:
									'What are the top three products in terms of sales in 2024? Analyze the gap between the top three products and the others from a statistical perspective.',
							},
							{ name: 'platform', value: 'n8n' },
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				position: [592, 672],
				name: 'DataAnalysis',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.markdown',
			version: 1,
			config: {
				parameters: {
					mode: 'markdownToHtml',
					options: {
						tables: true,
						simpleLineBreaks: true,
						completeHTMLDocument: false,
					},
					markdown: '={{ $json.data.parseJson().data }}',
					destinationKey: 'html',
				},
				position: [1008, 672],
				name: 'Convert markdown to HTML',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					message: '={{ $json.html }}',
					options: {},
					subject: 'n8n-email',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1488, 672],
				name: 'Send DataAnalysis message',
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
					url: 'https://ada.im/api/platform_api/DataInterpretation',
					method: 'POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'input_json', value: '={{$json.data}}' },
							{
								name: 'query',
								value: 'Sales volume of each product in 2024',
							},
							{ name: 'platform', value: 'n8n' },
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				position: [592, 848],
				name: 'DataInterpretation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.markdown',
			version: 1,
			config: {
				parameters: {
					mode: 'markdownToHtml',
					options: {
						tables: true,
						simpleLineBreaks: true,
						completeHTMLDocument: false,
					},
					markdown: '={{ $json.data.parseJson().data }}',
					destinationKey: 'html',
				},
				position: [1008, 848],
				name: 'Convert markdown to HTML 2',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					message: '={{ $json.html }}',
					options: {},
					subject: 'n8ntest',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1488, 848],
				name: 'Send DataInterpretation message',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.mySql',
			version: 2.5,
			config: {
				parameters: {
					query: 'select * from orders limit 100',
					options: {},
					operation: 'executeQuery',
				},
				position: [32, 864],
				name: 'Get data from database',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 332281959,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1IhUFreWCZFLAUaCP9ELBnvakg1xSs4CgqnSnMvgkGmM/edit#gid=332281959',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1IhUFreWCZFLAUaCP9ELBnvakg1xSs4CgqnSnMvgkGmM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1IhUFreWCZFLAUaCP9ELBnvakg1xSs4CgqnSnMvgkGmM/edit?usp=drivesdk',
						cachedResultName: 'example_data',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [32, 1056],
				name: 'Get data from Google Sheets',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.readWriteFile',
			version: 1,
			config: {
				parameters: { options: { dataPropertyName: 'input_file' } },
				position: [-48, 1248],
				name: 'Get data from local file',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.extractFromFile',
			version: 1,
			config: {
				parameters: {
					options: {},
					operation: 'xlsx',
					binaryPropertyName: 'input_file',
				},
				position: [144, 1248],
				name: 'Extract JSON from xlsx file',
			},
		}),
	)
	.add(
		sticky(
			'## Data Source\nThese nodes extract structured data directly from your data source (e.g., MySQL, Google Sheets, Excel/CSV).\n\nSimply connect the data source nodes you need and disconnect any unused nodes.\n\n**You must select one - and only one - data source node. Disconnect any additional data source nodes. You can also replace these nodes with any other data sources**\n\nAs long as the generated data matches the structured format required by the subsequent steps.\n\n## Sample Data\nA node is provided here that randomly generates one thousand data entries each time.\n\nThis dataset is a collection of simulated sales order records. Each record contains the following fields:\n\norder_date: The date when the order was placed.\nproduct_category: The category of the product sold, such as "Electronics," "Clothing & Fashion," "Home & Furniture," "Food & Beverages," "Sports & Outdoors," or "Beauty & Personal Care."\nregion: The sales region, which can include "North America," "South America," "Europe," "Asia," "Africa," "Oceania," "Middle East," or "Central Asia."\nsales_amount: The total sales amount for the order.\nThis type of data is typically used for analyzing sales performance across different time periods, product categories, and regions. In n8n, such data is usually structured as an array of objects, making it suitable for further processing, analysis, and automation workflows.',
			{ color: 4, position: [-112, -48], width: 448, height: 1536 },
		),
	)
	.add(
		sticky(
			'## Select the skills you need\nConnect the skill nodes you require\n\nYou need to apply for an API key according to the instructions, configure credentials, and set up Authentication in the DataAnalysis, DataInterpretation, and DataVisualization nodes.\n\n### Input parameters\ninput_json: Data from previous nodes\nquery: Query statement, you can set a fixed query according to your needs or use LLM to generate the query\n\n### Output\nThe output of DataAnalysis and DataInterpretation nodes will include markdown text, while the output of DataVisualization nodes will include HTML code.',
			{ name: 'Sticky Note1', color: 4, position: [528, 304], width: 656, height: 976 },
		),
	)
	.add(
		sticky(
			'## Output\n\nHere we use sending email as an example; you can choose the method that suits your needs.',
			{ name: 'Sticky Note2', color: 4, position: [1360, 432], width: 336, height: 848 },
		),
	)
	.add(
		sticky(
			'## Overview\nThis template empowers low-code data analysis using natural language. Simply connect to your data sources (e.g., MySQL, Google Sheets),\nand it automates the entire workflow—from data querying and processing to interpretation and visualization. For instance,\nit can professionally analyze, interpret, and visualize weekly sales data and have the report delivered directly to your inbox.\n\nThis template is supported by [ada.im](https://ada.im/home?ada_data_=&utm_source=n8n&utm_medium=landingpage&utm_infeluncer=landingpage&utm_campain=landingpage&utm_content=landingpage)\n## Here are some example results:\n\n### DataVisualization\nquery: Use a pie chart to display the sales of each product in 2024, and a line chart to represent the total monthly sales of each product in 2024. Additionally, you can add some extra charts based on the data.\nresult: \n![result2.png](https://d1551jsgrpwivo.cloudfront.net/result2.png)\n![result3.png](https://d1551jsgrpwivo.cloudfront.net/result3.png)\n\n### DataInterpretation\nquery: Sales volume of each product in 2024\nresult: \n![result4.png](https://d1551jsgrpwivo.cloudfront.net/result4.png)\n![result5.png](https://d1551jsgrpwivo.cloudfront.net/result5.png)\n\n### DataAnalysis\nquery: What are the top three products in terms of sales in 2024? Analyze the gap between the top three products and the others from a statistical perspective.\nresult: \n![result6.png](https://d1551jsgrpwivo.cloudfront.net/result6.png)',
			{ name: 'Sticky Note3', color: 7, position: [-3552, 304], width: 3088, height: 4672 },
		),
	)
	.add(
		sticky(
			"## 2️⃣ Set credentials\n\nIn HTTP nodes(DataAnalysis, DataInterpretation, and DataVisualization) select Authentication → Generic Credential Type\n![set_credentials_1.png](https://d1551jsgrpwivo.cloudfront.net/set_credentials_1.png)\n\nChoose Header Auth → Create new credential\n![set_credentials_2.png](https://d1551jsgrpwivo.cloudfront.net/set_credentials_2.png)\n\nName the header Authorization, which must be exactly 'Authorization', and fill in the previously applied API key\n![set_credentials_3.png](https://d1551jsgrpwivo.cloudfront.net/set_credentials_3.png)",
			{ name: 'Sticky Note4', position: [-1120, 576], width: 512, height: 1536 },
		),
	)
	.add(
		sticky(
			'## Consult\nContact us for inquiries or feedback.\n\nemail: n8n-plugin@ada.im\n\n[Discord](https://discord.com/invite/Bwd6zGYThS)\n\nExplore [Ada](https://ada.im/home?ada_data_=&utm_source=n8n&utm_medium=landingpage&utm_infeluncer=landingpage&utm_campain=landingpage&utm_content=landingpage) : Your own AI Data Analyst.',
			{ name: 'Sticky Note5', position: [-2240, 2944], width: 1088, height: 224 },
		),
	)
	.add(
		sticky(
			'## 1️⃣ Apply for an API Key\nYou can easily create and manage your API Key in the [ADA official website](https://ada.im/home?ada_data_=&utm_source=n8n&utm_medium=landingpage&utm_infeluncer=landingpage&utm_campain=landingpage&utm_content=landingpage) - API. To begin with, You need to register for an ADA account.\n\nOnce on the homepage, click the bottom left corner to access the API management dashboard.\n\n![apply_apikey_1.png](https://d1551jsgrpwivo.cloudfront.net/apply_apikey_1.png)\n\nHere, you can create new APIs and set the credit consumption limit for each API. A single account can create up to 10 APIs.\n\n![apply_apikey_2.png](https://d1551jsgrpwivo.cloudfront.net/apply_apikey_2.png)\n\nAfter successful creation, you can copy the API Key to set credentials. You can also view the credit consumption of each API and manage your APIs.\n\n![apply_apikey_3.png](https://d1551jsgrpwivo.cloudfront.net/apply_apikey_3.png)\n### **Credit Rules:**\n\n- Calling a single tool consumes 20 credits.\n- You will get 500 free credits per month for ADA Free account,  with each batch of credits valid for three months.\n- When credits run out, you can purchase more or upgrade your account on the ADA Billing page. Each batch of purchased credits is valid for three months. Expiration dates and billing details are available on the [ADA website-Billing](https://ada.im/udsl/#/system/billing).\n![apply_apikey_4.png](https://d1551jsgrpwivo.cloudfront.net/apply_apikey_4.png)',
			{ name: 'Sticky Note6', position: [-2256, 576], width: 1056, height: 2336 },
		),
	)
	.add(
		sticky(
			'## 3️⃣ Try out the skills\nSelect the data source and fill in the query parameters for the DataAnalysis, DataInterpretation, and DataVisualization nodes.\n![skills.png](https://d1551jsgrpwivo.cloudfront.net/set_credentials_4.png)',
			{ name: 'Sticky Note7', position: [-1120, 2160], width: 512, height: 1168 },
		),
	);
