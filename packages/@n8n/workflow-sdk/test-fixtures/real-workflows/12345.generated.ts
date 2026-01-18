const wf = workflow('Hi3KUTF6mlwuZPFR', 'Physician Profile Enricher', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [1600, 176], name: 'On-Demand Execution' },
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
								id: '0411384e-7a25-4aa3-b1e9-be72ce7a110c',
								name: 'Location',
								type: 'string',
								value: 'Brooklyn',
							},
							{
								id: '60b18157-88b0-41b1-bc21-ab83a3ae09d3',
								name: 'State',
								type: 'string',
								value: 'NY',
							},
						],
					},
				},
				position: [1808, 176],
				name: 'Define Location',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-browseract.browserAct',
			version: 1,
			config: {
				parameters: {
					type: 'WORKFLOW',
					timeout: 7200,
					workflowId: '71087742787674119',
					workflowConfig: {
						value: {
							'input-State': '={{ $json.State }}',
							'input-Location': '={{ $json.Location }}',
						},
						schema: [
							{
								id: 'input-healow',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								description: 'If left blank, the default value defined in BrowserAct will be used.',
								displayName: 'healow',
								defaultMatch: true,
							},
							{
								id: 'input-Location',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								description: 'If left blank, the default value defined in BrowserAct will be used.',
								displayName: 'Location',
								defaultMatch: true,
							},
							{
								id: 'input-State',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								description: 'If left blank, the default value defined in BrowserAct will be used.',
								displayName: 'State',
								defaultMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['input-State'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					open_incognito_mode: false,
				},
				credentials: {
					browserActApi: { id: 'G1U5ih38TKU5wcI5', name: 'BrowserAct account' },
				},
				position: [2032, 176],
				name: 'Run BrowserAct Workflow',
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
						'// Get the JSON string using the exact path provided by the user.\nconst jsonString = $input.first().json.output.string;\n\nlet parsedData;\n\n// Check if the string exists before attempting to parse\nif (!jsonString) {\n    // Return an empty array or throw an error if no string is found\n    // Throwing an error is usually better to stop the workflow if data is missing.\n    throw new Error("Input string is empty or missing at the specified path: $input.first().json.output.string");\n}\n\ntry {\n    // 1. Parse the JSON string into a JavaScript array of objects\n    parsedData = JSON.parse(jsonString);\n} catch (error) {\n    // Handle JSON parsing errors (e.g., if the string is malformed)\n    throw new Error(`Failed to parse JSON string: ${error.message}`);\n}\n\n// 2. Ensure the parsed data is an array\nif (!Array.isArray(parsedData)) {\n    throw new Error(\'Parsed data is not an array. It cannot be split into multiple items.\');\n}\n\n// 3. Map the array of objects into the n8n item format { json: object }\n// Each element in this array will be treated as a new item by n8n, achieving the split.\nconst outputItems = parsedData.map(item =&gt; ({\n    json: item,\n}));\n\n// 4. Return the new array of items\nreturn outputItems;',
				},
				position: [2368, 176],
				name: 'Splitting Items',
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
							Name: '={{ $json.item[0].Name }}',
							Address: '={{ $json.item[0].Address }}',
							Specialty: '={{ $json.item[0].Specialty }}',
						},
						schema: [
							{
								id: 'Name',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Specialty',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Specialty',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Address',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Name'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 243879573,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/164YfKm0Jiwy2KNUyX18ugWxbKM9xfXhA2BHg8VPg8vU/edit#gid=243879573',
						cachedResultName: 'Physician Profile',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '164YfKm0Jiwy2KNUyX18ugWxbKM9xfXhA2BHg8VPg8vU',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/164YfKm0Jiwy2KNUyX18ugWxbKM9xfXhA2BHg8VPg8vU/edit?usp=drivesdk',
						cachedResultName: 'Physician Profile Enricher',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: 'BSirjWRAwIzOFp7c', name: 'Google Sheets account' },
				},
				position: [2576, 176],
				name: 'Update Leads',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.4,
			config: {
				parameters: {
					text: 'Physician Profile Enricher Workflow Finished succesfully',
					select: 'channel',
					channelId: {
						__rl: true,
						mode: 'list',
						value: 'C09KLV9DJSX',
						cachedResultName: 'all-browseract-workflow-test',
					},
					otherOptions: {},
				},
				credentials: {
					slackApi: { id: 'y5CGeG09MENm5J7q', name: 'Slack account 2' },
				},
				position: [2800, 176],
				name: 'Alert Team',
			},
		}),
	)
	.add(
		sticky(
			'## ⚡ Workflow Overview & Setup\n\n**Summary:** Automate the extraction of physician profiles (Name, Address, Specialty) from **Healow** based on location, archiving data to Google Sheets and notifying via Slack.\n\n### Requirements\n* **Credentials:** BrowserAct, Google Sheets, Slack.\n* **Mandatory:** BrowserAct API (Template: **Physician Profile Enricher**)\n\n### How to Use\n1. **Credentials:** Configure your API keys for BrowserAct, Google Sheets, and Slack.\n2. **BrowserAct Template:** Ensure you have the **Healow** template saved in your BrowserAct account.\n3. **Google Sheets:** Create a sheet named "Physician Profile" with headers: `Name`, `Address`, `Specialty`.\n4. **Configuration:** Update the **Define Location** node with your target City and State.\n\n### Need Help?\n[How to Find Your BrowseAct API Key & Workflow ID](https://docs.browseract.com)\n[How to Connect n8n to Browseract](https://docs.browseract.com)\n[How to Use & Customize BrowserAct Templates](https://docs.browseract.com)',
			{ name: 'Documentation', position: [1200, -336], width: 400, height: 464 },
		),
	)
	.add(
		sticky(
			'### 🏥 Step 1: Target & Scrape\n\nSets the search parameters (City and State) and executes the **Healow** BrowserAct automation to extract physician data from the target website.',
			{ name: 'Step 1 Explanation', color: 7, position: [1616, 16], width: 536, height: 124 },
		),
	)
	.add(
		sticky(
			'### 💾 Step 2: Process & Archive\n\nParses the raw scraped string into structured JSON objects, updates the Google Sheet database with new records, and sends a Slack notification upon success.',
			{ name: 'Step 2 Explanation', color: 7, position: [2368, 368], width: 540, height: 124 },
		),
	)
	.add(
		sticky(
			'### Google Sheet Headers\nTo use this workflow, create a Google Sheet with the following headers:\n* Name\n* Specialty\n* Address',
			{ color: 3, position: [2496, 48], width: 256, height: 288 },
		),
	)
	.add(
		sticky('@[youtube](DZ_Jq_b2-Ww)', {
			name: 'Sticky Note1',
			color: 6,
			position: [1616, -336],
			width: 528,
			height: 304,
		}),
	);
