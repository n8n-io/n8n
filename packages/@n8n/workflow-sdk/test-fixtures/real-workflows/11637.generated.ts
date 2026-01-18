const wf = workflow('', 'Zyte AI Web Scraper')
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.3,
			config: {
				parameters: {
					options: {},
					formTitle: 'AI Web Scraper',
					formFields: {
						values: [
							{
								fieldLabel: 'Target URL',
								placeholder: 'e.g. https://books.toscrape.com/',
								requiredField: true,
							},
							{
								fieldType: 'dropdown',
								fieldLabel: 'Select Site Category',
								fieldOptions: {
									values: [
										{ option: 'Online Store / Product (E-commerce)' },
										{ option: 'News, Blog, Forum or Article Site' },
										{ option: 'Job Board / Career Site' },
										{ option: 'Search Engine Results (SERP)' },
										{ option: 'General / Other Website' },
									],
								},
								requiredField: true,
							},
							{
								fieldLabel: 'Zyte API Key',
								placeholder: 'Your API Key Goes Here',
								requiredField: true,
							},
							{
								html: '<div style="margin-top: -10px; font-size: 0.85em; color: #6b7280;">\n  Don\'t have one? \n  <a href="https://www.zyte.com/?utm_campaign=Discord_n8n_tpl&utm_activity=Community&utm_medium=social&utm_source=Discord" target="_blank" rel="noopener noreferrer" style="color: #ea580c; text-decoration: underline;">\n    Get your free API key here →\n  </a>.\n</div>',
								fieldType: 'html',
							},
						],
					},
					formDescription:
						'Enter a URL and select your goal.\nThe workflow will automatically route your request to the best AI schema, or let you extract raw data manually.',
				},
				position: [-3728, 1472],
				name: 'Main form submission',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.3,
			config: {
				parameters: {
					rules: {
						values: [
							{
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
											id: 'ff228f24-db2c-4a4c-8537-736a1549b61b',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json["Select Site Category"] }}',
											rightValue: '=Online Store / Product (E-commerce)',
										},
									],
								},
							},
							{
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
											id: 'fa859055-7d10-4a4d-824a-f9f2c6a527f1',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json["Select Site Category"] }}',
											rightValue: 'News, Blog, Forum or Article Site',
										},
									],
								},
							},
							{
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
											id: '48ffd4fc-3541-40f0-940e-beb5812a9207',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json["Select Site Category"] }}',
											rightValue: 'Job Board / Career Site',
										},
									],
								},
							},
							{
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
											id: '1e6c9af3-906c-432c-9bdd-808efad19c75',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json["Select Site Category"] }}',
											rightValue: 'Search Engine Results (SERP)',
										},
									],
								},
							},
							{
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
											id: '40faed08-3441-4738-b96d-0e2d7e880617',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json["Select Site Category"] }}',
											rightValue: 'General / Other Website',
										},
									],
								},
							},
						],
					},
					options: {},
				},
				position: [-3472, 1424],
				name: 'Route by Category',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 2.3,
			config: {
				parameters: {
					options: {},
					formFields: {
						values: [
							{
								fieldName: 'URL',
								fieldType: 'hiddenField',
								fieldValue: '={{ $json["Target URL"] }}',
							},
							{
								fieldName: 'Site Type',
								fieldType: 'hiddenField',
								fieldValue: '={{ $json["Select Site Category"] }}',
							},
							{
								fieldType: 'dropdown',
								fieldLabel: 'What is your extraction goal?',
								fieldOptions: {
									values: [
										{ option: 'Scrape details of a SINGLE item' },
										{ option: 'Get List of items from THIS PAGE only' },
										{ option: 'Scrape details of all items on THIS page' },
										{ option: 'Get List of items from all pages' },
										{ option: 'Scrape details of all items on ALL pages' },
									],
								},
								requiredField: true,
							},
						],
					},
				},
				position: [-3152, 1152],
				name: 'AI Extraction Goal Form',
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
						'// ZYTE CONFIG GENERATOR\n// Translates Form Inputs into clean Variables\n\n// --- MAPPINGS ---\nconst categoryMap = {\n    "Online Store / Product (E-commerce)": "product",\n    "News, Blog, Forum or Article Site": "article",\n    "Job Board / Career Site": "job"\n};\n\nconst goalMap = {\n    // 1. Single Item\n    "Scrape details of a SINGLE item": "single",\n    "Scrape details of a SINGLE job post": "single",\n    "Scrape content of a SINGLE article": "single",\n\n    // 2. List (Current Page only)\n    "Get List of items from THIS PAGE only": "list",\n\n    // 3. Crawl List (URLs from ALL pages)\n    "Get List of items from all pages": "crawl_list",\n    "Get List of Job URLs from ALL pages": "crawl_list",\n    "Get List of Article URLs from ALL pages": "crawl_list",\n\n    // 4. Details (Current Page - Items on this page)\n    "Scrape details of all items on THIS page": "details_current",\n    "Scrape content of articles on THIS page": "details_current",\n\n    // 5. Crawl Details (Full Scrape - ALL pages)\n    "Scrape details of all items on ALL pages": "crawl_all",\n    "Scrape content of articles on ALL pages": "crawl_all",\n    "Scrape job details from ALL pages": "crawl_all"\n};\n\n// 1. Get Inputs\nconst rawCategory = $input.first().json["Site Type"];\nconst rawGoal = $input.first().json["What is your extraction goal?"];\nconst url = $input.first().json.URL;\n\n// 2. Map to Short Keys\nconst category = categoryMap[rawCategory] || \'product\';\nconst goal = goalMap[rawGoal] || \'single\';\n\n// 3. Determine Base Key\nlet baseKey = \'product\'; \nif (category === \'article\') baseKey = \'article\';\nif (category === \'job\') baseKey = \'jobPosting\';\n\n// 4. LOGIC ENGINE: Set Target and Navigation Schemas\nlet targetSchema = baseKey;       // What data do we want?\nlet navigationSchema = null;      // How do we find the next page?\n\n// --- SCENARIO 1: SINGLE ITEM ---\nif (goal === \'single\') {\n    targetSchema = baseKey;       // e.g. \'product\'\n    navigationSchema = null;\n}\n\n// --- SCENARIO 2: LIST (THIS PAGE ONLY) ---\nelse if (goal === \'list\') {\n    // Products/Articles use \'List\'. Jobs use \'Navigation\'.\n    if (baseKey === \'jobPosting\') {\n        targetSchema = \'jobPostingNavigation\';\n    } else {\n        targetSchema = baseKey + \'List\'; // e.g. \'productList\'\n    }\n    navigationSchema = null;\n}\n\n// --- SCENARIO 3: CRAWL LIST (ALL PAGES) ---\n// CORRECTION APPLIED HERE\nelse if (goal === \'crawl_list\') {\n    // TARGET: We want rich list data (same as Scenario 2)\n    if (baseKey === \'jobPosting\') {\n        targetSchema = \'jobPostingNavigation\';\n    } else {\n        targetSchema = baseKey + \'List\'; // e.g. \'productList\'\n    }\n    \n    // NAVIGATION: We need to traverse pages to find the next list\n    navigationSchema = baseKey + \'Navigation\'; \n}\n\n// --- SCENARIO 4 & 5: DETAILS (THIS PAGE OR ALL PAGES) ---\nelse if (goal === \'details_current\' || goal === \'crawl_all\') {\n    // TARGET: We want full details per item (e.g. \'product\')\n    targetSchema = baseKey; \n    \n    // NAVIGATION: We need to find the item links first\n    navigationSchema = baseKey + \'Navigation\'; \n}\n\n// 5. Output\nreturn {\n    json: {\n        url: url,\n        extraction_goal: goal,       // For Switch Node\n        target_schema: targetSchema, // For Data Extraction (e.g. productList)\n        navigation_schema: navigationSchema, // For Loop Control (e.g. productNavigation)\n        // Debugging\n        raw_goal: rawGoal \n    }\n};',
				},
				position: [-2928, 1152],
				name: 'Zyte Config Generator',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.3,
			config: {
				parameters: {
					rules: {
						values: [
							{
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
											id: 'beb8e0bf-3d06-4511-bfa0-9e4847766441',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.extraction_goal }}',
											rightValue: 'single',
										},
									],
								},
							},
							{
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
											id: 'd1684ffb-aeb8-4b45-9c4b-729fea29bbcc',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.extraction_goal }}',
											rightValue: 'list',
										},
									],
								},
							},
							{
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
											id: '19209cdf-6fc8-45bf-b6c3-949954b75a2c',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.extraction_goal }}',
											rightValue: 'details_current',
										},
									],
								},
							},
							{
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
											id: 'abe62040-53bc-43bf-8ed8-a641760fb024',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.extraction_goal }}',
											rightValue: 'crawl_list',
										},
									],
								},
							},
							{
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
											id: '5af9a3f6-adbf-4fec-89ea-19c19879620d',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.extraction_goal }}',
											rightValue: 'crawl_all',
										},
									],
								},
							},
						],
					},
					options: {},
				},
				position: [-2624, 1104],
				name: 'Product Extraction Goal',
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
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.url }}' },
							{ name: '={{ $json.target_schema }}', value: '={{true}}' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [-192, -1296],
				name: 'HTTP Node: [Single Item] Get Details',
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
								id: 'b0af1640-c286-4053-aaf1-99b9aa194dc2',
								name: 'data',
								type: 'object',
								value:
									'={{ $json.productNavigation || $json.product || $json.productList || $json.browserHtml || $json.articleList?.articles || $json.jobPosting || $json.jobPostingNavigation }}',
							},
						],
					},
				},
				position: [1312, -1280],
				name: 'Format Output [ Single || List ]',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.convertToFile',
			version: 1.1,
			config: { parameters: { options: {} }, position: [3248, -368], name: 'Extracted AI Output' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.url }}' },
							{ name: '={{ $json.target_schema }}', value: '={{true}}' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [-192, -992],
				name: 'HTTP Node: [List] Get Current Page',
			},
		}),
	)
	.output(2)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.url }}' },
							{ name: '={{ $json.navigation_schema }}', value: '={{true}}' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									"=Basic {{ ($('Main form submission').item.json['Zyte API Key'] + \":\").base64Encode() }}",
							},
						],
					},
				},
				position: [-192, -640],
				name: 'HTTP Node: [Current Page] Get Item URLs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: {
					options: {},
					fieldToSplitOut:
						"={{ \n$json.productNavigation ? 'productNavigation.items' : \n$json.articleNavigation ? 'articleNavigation.items' : \n$json.jobPostingNavigation ? 'jobPostingNavigation.items' : \n'items' \n}}",
				},
				position: [128, -640],
				name: '[Current Page] Split Items',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: { reset: false }, batchSize: 5 },
				position: [1104, -640],
				name: '[Current Page] Item Loop',
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
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.url }}' },
							{
								name: "={{ $('Product Extraction Goal').item.json.target_schema }}",
								value: '={{true}}',
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [1312, -624],
				name: 'HTTP Node: [Current Page] Get Item Details',
			},
		}),
	)
	.output(3)
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
								id: '8e00d19a-bb7c-460e-b2b7-2bd4320287bc',
								name: 'url',
								type: 'string',
								value: '={{ $json.url }}',
							},
							{
								id: '517201f4-1765-4c36-a6ae-3b82091416a2',
								name: 'target_schema',
								type: 'string',
								value: '={{ $json.target_schema }}',
							},
							{
								id: 'efd367fb-fe6f-4c5e-b49d-773c9e611901',
								name: 'navigation_schema',
								type: 'string',
								value: '={{ $json.navigation_schema }}',
							},
						],
					},
				},
				position: [-464, -80],
				name: '[List-All] Init State',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [-64, -64], name: '[List-All] Merge Pages' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: '=url', value: '={{ $json.url }}' },
							{
								name: "={{ $('Zyte Config Generator').item.json.navigation_schema }}",
								value: '={{true}}',
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [144, -64],
				name: 'HTTP Node: [List-All] Get Page URLs',
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
						"// [List-All] PAGE CONTROLLER (The Brain)\n// Handles loop logic for Products, Articles, and Jobs automatically\n\nconst staticData = $getWorkflowStaticData('global');\n\n// 1. Initialize Memory\nif (!staticData.visited) staticData.visited = [];\n\n// 2. Get Navigation Data from the previous HTTP Node\n// Ensure the node name inside $() matches your actual HTTP node name!\nconst navData = $('HTTP Node: [List-All] Get Page URLs').first().json;\nconst currentUrl = navData.url; \n\n// --- DYNAMIC NAVIGATION DETECTION ---\n// We check which navigation object exists in the response\nlet navObject = null;\n\nif (navData.productNavigation) {\n    navObject = navData.productNavigation;\n} else if (navData.articleNavigation) {\n    navObject = navData.articleNavigation;\n} else if (navData.jobPostingNavigation) {\n    navObject = navData.jobPostingNavigation;\n} else if (navData.forumThreadNavigation) { // Rare, but possible\n    navObject = navData.forumThreadNavigation; \n}\n\n// Safely get the nextPage object (if it exists)\nconst nextPageObj = navObject ? navObject.nextPage : null;\n// ------------------------------------\n\n// 3. Mark Current Page as Visited\nif (currentUrl) {\n    staticData.visited.push(currentUrl);\n}\n\n// 4. Determine Loop Logic\nlet nextUrl = null;\nlet stop = false;\n\nif (nextPageObj && nextPageObj.url) {\n    // CRITICAL FIX: The \"Infinite Loop\" Preventer\n    if (staticData.visited.includes(nextPageObj.url)) {\n        stop = true; // We have been here before! Stop.\n    } else {\n        nextUrl = nextPageObj.url; // New page found. Continue.\n    }\n} else {\n    stop = true; // No next page (Null). Stop.\n}\n\n// 5. Output Configuration\nreturn {\n    json: {\n        // Tells the NEXT node (List Data) what to scrape right now\n        currentScrapeUrl: currentUrl, \n        \n        // Tells the LOOP (Edit Fields) where to go next\n        nextLoopUrl: nextUrl,\n        \n        // Tells the IF node whether to continue or finish\n        stopLoop: stop\n    }\n};",
				},
				position: [352, -64],
				name: '[List-All] Page Controller',
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
								id: 'ab1dbeae-e363-4ac0-a99d-07b79c7b17e7',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: '={{ $json.stopLoop }}',
								rightValue: '',
							},
						],
					},
				},
				position: [560, -64],
				name: '[List-All] Check Next Page',
			},
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
						"// [List-All] FINAL OUTPUT\nconst staticData = $getWorkflowStaticData('global');\n\n// 1. Retrieve Data\nconst allProducts = staticData.backpack || [];\n\n// 2. CLEANUP\nstaticData.backpack = [];\nstaticData.visited = [];\n\n// 3. SAFETY FILTER (New Optimization)\n// Removes nulls or bad data before sending to CSV\nconst validProducts = allProducts.filter(item => item && typeof item === 'object');\n\n// 4. Format\nreturn validProducts.map(item => {\n    return {\n        json: item\n    };\n});",
				},
				position: [1280, -240],
				name: '[List-All] Final Output',
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
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.currentScrapeUrl }}' },
							{
								name: "={{ $('[List-All] Init State').item.json.target_schema }}",
								value: '={{true}}',
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [1072, -48],
				name: '[List-All] Get Item List',
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
						"// [List-All] ACCUMULATOR (Universal)\n// Saves the batch of items found on the current page to memory\n// Works for Products, Articles, and Jobs\n\nconst staticData = $getWorkflowStaticData('global');\n\n// 1. Initialize Backpack\nif (!staticData.backpack) {\n    staticData.backpack = [];\n}\n\n// 2. Get Data from the HTTP List Node\nconst response = $input.first().json;\n\n// 3. DYNAMIC EXTRACTION\n// We check for all possible list types Zyte might return for our supported categories\nlet newItems = [];\n\nif (response.productList && response.productList.products) {\n    newItems = response.productList.products;\n} \nelse if (response.articleList && response.articleList.articles) {\n    newItems = response.articleList.articles;\n}\nelse if (response.jobPostingNavigation && response.jobPostingNavigation.items) {\n    // Jobs usually return 'items' inside navigation schema\n    newItems = response.jobPostingNavigation.items;\n}\n// Fallbacks for variations in Zyte API responses\nelse if (response.items) {\n    newItems = response.items;\n}\nelse if (response.products) {\n    newItems = response.products;\n}\n\n// 4. Save to Memory (Safety Check included)\nif (newItems.length > 0) {\n    staticData.backpack.push(...newItems);\n}\n\n// 5. Pass through (Output Status)\nreturn {\n    json: {\n        status: \"Saved\",\n        type_detected: Object.keys(response).find(k => k.includes('List') || k.includes('Navigation')) || \"unknown\",\n        items_found_on_page: newItems.length,\n        total_items_collected: staticData.backpack.length\n    }\n};",
				},
				position: [1280, -48],
				name: '[List-All] List Accumulator',
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
								id: '082744c5-a824-4f98-9ae4-6620a5c07af3',
								name: 'url',
								type: 'string',
								value: "={{ $('[List-All] Page Controller').item.json.nextLoopUrl }}",
							},
						],
					},
				},
				position: [1488, -48],
				name: '[List-All] Set Next URL',
			},
		}),
	)
	.output(4)
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
								id: 'ca1aad2b-7dbc-4a00-aad4-d3e28259523b',
								name: 'target_url',
								type: 'string',
								value: '={{ $json.url }}',
							},
							{
								id: '5542d947-4475-4d5c-9543-4434d30ae8e6',
								name: 'target_schema',
								type: 'string',
								value: '={{ $json.target_schema }}',
							},
							{
								id: '12d0829d-1e1c-4174-a566-b5b834fa88ac',
								name: 'navigation_schema',
								type: 'string',
								value: '={{ $json.navigation_schema }}',
							},
						],
					},
				},
				position: [-464, 496],
				name: '[Details-All] Init State',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [-64, 512], name: '[Details-All] Merge Pages' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.target_url }}' },
							{
								name: "={{ $('Zyte Config Generator').item.json.navigation_schema }}",
								value: '={{true}}',
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [144, 512],
				name: 'HTTP Node: [Details-All] Crawler (Phase 1)',
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
						"// [Details-All] URL COLLECTOR\n// Collects URLs from Products, Articles, or Jobs\n\nconst staticData = $getWorkflowStaticData('global');\n\n// 1. Initialize Memory\nif (!staticData.allItemUrls) {\n  staticData.allItemUrls = [];\n  staticData.visitedPages = [];\n}\n\n// 2. Get Data from HTTP Node\nconst response = $input.first().json;\n\n// --- DYNAMIC DETECTION START ---\n// Detect which navigation type was returned by Zyte\nlet navObject = null;\nif (response.productNavigation) navObject = response.productNavigation;\nelse if (response.articleNavigation) navObject = response.articleNavigation;\nelse if (response.jobPostingNavigation) navObject = response.jobPostingNavigation;\nelse if (response.forumThreadNavigation) navObject = response.forumThreadNavigation;\n\nconst items = navObject ? navObject.items : [];\nconst nextPage = navObject ? navObject.nextPage : null;\n// --- DYNAMIC DETECTION END ---\n\n// 3. Extract JUST the URLs\nif (items && items.length > 0) {\n  const urls = items.map(item => ({ url: item.url }));\n  staticData.allItemUrls.push(...urls);\n}\n\n// 4. Navigation Logic\nlet nextUrl = null;\nlet stop = false;\n\nif (nextPage && nextPage.url) {\n  if (staticData.visitedPages.includes(nextPage.url)) {\n    stop = true;\n  } else {\n    // Mark current page as visited\n    staticData.visitedPages.push(response.url);\n    \n    // --- PRODUCTION CODE ---\n    nextUrl = nextPage.url; \n    \n    // --- TEST CODE (Uncomment to limit pages) ---\n    // if (staticData.visitedPages.length >= 2) { stop = true; } \n    // else { nextUrl = nextPage.url; }\n  }\n} else {\n  stop = true;\n}\n\nreturn {\n  json: {\n    stop: stop,\n    nextPageUrl: nextUrl,\n    totalUrlsCollected: staticData.allItemUrls.length\n  }\n};",
				},
				position: [336, 512],
				name: '[Details-All] URL Collector',
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
								id: '2d5e6515-7b6d-4b6f-bfdc-644cd324fadc',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: '={{ $json.stop }}',
								rightValue: '',
							},
						],
					},
				},
				position: [544, 512],
				name: '[Details-All] More Pages?',
			},
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
						"const staticData = $getWorkflowStaticData('global');\nconst allUrls = staticData.allItemUrls || [];\n\n// Reset the static data so next run starts fresh\nstaticData.allItemUrls = [];\nstaticData.visitedPages = [];\n\n// Output the items so the next Loop node sees them!\nreturn allUrls.map(u => ({ json: { url: u.url } }));",
				},
				position: [752, 416],
				name: '[Details-All] Unpack List (Phase 2)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: {
					options: { reset: "={{ $prevNode.name === 'Split Out4' }}" },
					batchSize: 100,
				},
				position: [1088, 416],
				name: '[Details-All] Batch Processor',
			},
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
						"// COMBINED RETRIEVER & FORMATTER\nconst staticData = $getWorkflowStaticData('global');\n\n// 1. Retrieve everything we saved in the Accumulator\n// If nothing is there, default to an empty array\nconst allItems = staticData.finalResults || [];\n\n// 2. Reset memory for the next run (Cleanup)\n// This ensures your next execution starts with a fresh bag\nstaticData.finalResults = [];\n\n// 3. Filter the data to remove nulls or bad values\n// (Safety check from your second code block)\nconst validItems = allItems.filter(item => item && typeof item === 'object');\n\n// 4. Map the valid items directly to n8n format for the CSV node\nreturn validItems.map(item => {\n  return {\n    json: item\n  };\n});",
				},
				position: [1600, 240],
				name: '[Details-All] Final Output',
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
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.url }}' },
							{
								name: "={{ $('[Details-All] Init State').item.json.target_schema }}",
								value: '={{true}}',
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [1376, 432],
				name: 'HTTP Node: [Details-All] Get Details',
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
						'// [Details-All] ACCUMULATOR\n// Saves detailed data (Product, Article, Job, etc.) inside the loop\n\nconst staticData = $getWorkflowStaticData(\'global\');\n\n// 1. Initialize memory\nif (!staticData.finalResults) {\n  staticData.finalResults = [];\n}\n\n// 2. Get Input Items\nconst items = $input.all();\nconst validBatch = [];\n\n// 3. Process Items\nfor (const item of items) {\n  \n  // Option A: Success - Check for ANY valid Zyte schema\n  if (item.json.product) {\n    validBatch.push(item.json.product);\n  }\n  else if (item.json.article) {\n    validBatch.push(item.json.article);\n  }\n  else if (item.json.jobPosting) {\n    validBatch.push(item.json.jobPosting);\n  }\n  \n  // Option B: Success (Fallback - General browserHtml or Flat JSON)\n  // We check that it has NO error message\n  else if (item.json && !item.json.error && !item.json.message) {\n    validBatch.push(item.json);\n  }\n  \n  // Option C: FAILURE (Save an Error Record)\n  else {\n    validBatch.push({\n      name: "SKIPPED - ERROR",\n      url: "See error details",\n      error_message: item.json.message || item.json.error || "Unknown API Error",\n      timestamp: new Date().toISOString()\n    });\n  }\n}\n\n// 4. Push to memory\nif (validBatch.length > 0) {\n  staticData.finalResults.push(...validBatch);\n}\n\n// 5. Pass data through\nreturn items;',
				},
				position: [1600, 432],
				name: '[Details-All] Accumulator',
			},
		}),
	)
	.output(1)
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
								id: '223e56ca-4ed7-402c-9e28-972f7820b841',
								name: 'target_url',
								type: 'string',
								value: '={{ $json.nextPageUrl }}',
							},
						],
					},
				},
				position: [752, 608],
				name: '[Details-All] Set Next URL',
			},
		}),
	)
	.output(3)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json["Target URL"] }}' },
							{ name: 'serp', value: '={{true}}' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [-1248, 1504],
				name: 'HTTP Node: SERP Extraction',
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
								id: 'b0af1640-c286-4053-aaf1-99b9aa194dc2',
								name: 'data',
								type: 'object',
								value: '={{ $json.serp }}',
							},
						],
					},
				},
				position: [3248, 1504],
				name: 'serp response',
			},
		}),
	)
	.output(4)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 2.3,
			config: {
				parameters: {
					options: {},
					formFields: {
						values: [
							{
								fieldName: 'URL',
								fieldType: 'hiddenField',
								fieldValue: '={{ $json["Target URL"] }}',
							},
							{
								fieldName: 'Site Type',
								fieldType: 'hiddenField',
								fieldValue: '={{ $json["Select Site Category"] }}',
							},
							{
								fieldType: 'dropdown',
								fieldLabel: 'What is your extraction goal?',
								fieldOptions: {
									values: [
										{ option: 'BrowserHtml' },
										{ option: 'httpResponseBody' },
										{ option: 'Capture Network API' },
										{ option: 'Infinite Scroll' },
										{ option: 'Screenshot' },
									],
								},
								requiredField: true,
							},
						],
					},
				},
				position: [-3168, 1760],
				name: 'General Extraction Goal Form',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.3,
			config: {
				parameters: {
					rules: {
						values: [
							{
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
											id: 'ce59b8de-cffc-4f8e-973f-c2fa20b13ba5',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json["What is your extraction goal?"] }}',
											rightValue: 'BrowserHtml',
										},
									],
								},
							},
							{
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
											id: 'b44c142d-4039-4f8b-83dd-64b30c3a7042',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json["What is your extraction goal?"] }}',
											rightValue: 'httpResponseBody',
										},
									],
								},
							},
							{
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
											id: '5932f0e5-c195-447b-bbae-ca1d0a548810',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json["What is your extraction goal?"] }}',
											rightValue: 'Capture Network API',
										},
									],
								},
							},
							{
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
											id: '8047909a-ffe0-4031-a566-98ed971b1a0c',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json["What is your extraction goal?"] }}',
											rightValue: 'Infinite Scroll',
										},
									],
								},
							},
							{
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
											id: '927fcd5a-eecc-4dc3-990a-c9eebca50835',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json["What is your extraction goal?"] }}',
											rightValue: 'Screenshot',
										},
									],
								},
							},
						],
					},
					options: {},
				},
				position: [-2720, 1712],
				name: 'General Extract Goal',
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
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.URL }}' },
							{ name: 'browserHtml', value: '={{true}}' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [-1328, 2192],
				name: 'HTTP BrowserHtml',
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
								id: 'b0af1640-c286-4053-aaf1-99b9aa194dc2',
								name: 'data',
								type: 'string',
								value: '={{ $json.browserHtml || $json.httpResponseBody || $json.networkCapture }}',
							},
						],
					},
				},
				position: [3264, 2720],
				name: 'Custom Output',
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
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.URL }}' },
							{ name: 'httpResponseBody', value: '={{true}}' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [-1328, 2496],
				name: 'HTTP Response Body',
			},
		}),
	)
	.output(2)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n"url": "{{ $json.URL }}",\n  "browserHtml": true,\n  "networkCapture": [\n    {\n      "filterType": "url",\n      "httpResponseBody": true,\n      "value": "/api/",\n      "matchType": "contains"\n    }\n  ]\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [-1328, 2816],
				name: 'HTTP Node: Capture Network API',
			},
		}),
	)
	.output(3)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "url": "{{ $json.URL }}",\n  "browserHtml": true,\n  "actions": [\n    {\n      "action": "scrollBottom"\n    }\n  ]\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [-1328, 3136],
				name: 'HTTP Node: Infinite Scroll',
			},
		}),
	)
	.output(4)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.zyte.com/v1/extract',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'url', value: '={{ $json.URL }}' },
							{ name: 'screenshot', value: '={{true}}' },
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'authorization',
								value:
									'=Basic {{ ($(\'Main form submission\').item.json["Zyte API Key"] + ":").base64Encode() }}',
							},
						],
					},
				},
				position: [-1328, 3456],
				name: 'HTTP Node: Capture Page Screenshot',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.convertToFile',
			version: 1.1,
			config: {
				parameters: {
					options: { fileName: 'Sandbox Screenshot' },
					operation: 'toBinary',
					sourceProperty: 'screenshot',
				},
				position: [3280, 3440],
				name: 'Convert to File ( Image )',
			},
		}),
	)
	.add(
		sticky(
			'## AI Web Scraper\nThis workflow turns n8n into a universal scraping machine using the [**Zyte API**](https://www.zyte.com/?utm_campaign=Discord_n8n_tpl&utm_activity=Community&utm_medium=social&utm_source=Discord). It can crawl and extract structured data from almost any website (E-commerce, News, Jobs) without custom selectors.\n\n\n## How it works\n1. **User Input:** Takes a URL, Category, and API Key via the Form.\n2. **Phase 1 (Crawler):** Automatically loops through pagination to find all item URLs.\n3. **Phase 2 (Scraper):** Visits every item and uses AI to extract structured data (Price, Image, Availability, etc).\n4. **Manual Mode:** If AI isn\'t needed, you can select the "General" path to fetch raw HTML or Screenshots and handle the parsing yourself.\n\n## How to use\n1. Open the **"On Form Submission"** node and click **"Open Form"**.\n2. Enter your Target URL and select the Goal (e.g. "Crawl ALL pages").\n3. Enter your **Zyte API Key**.\n4. Run the workflow and download the CSV.\n\n## Requirements\n- A free or paid [**Zyte API Key**](https://www.zyte.com/?utm_campaign=Discord_n8n_tpl&utm_activity=Community&utm_medium=social&utm_source=Discord).',
			{ color: 6, position: [-4560, 1168], width: 384, height: 688 },
		),
	)
	.add(
		sticky('## AI Output: Aggregation & CSV Export', {
			name: 'Sticky Note1',
			color: 4,
			position: [3072, -512],
			width: 448,
			height: 352,
		}),
	)
	.add(
		sticky('## General Output: Raw Export\n## ( Custom Parsing Needed ) ⚠️', {
			name: 'Sticky Note2',
			color: 2,
			position: [3104, 2560],
			width: 432,
			height: 368,
		}),
	)
	.add(
		sticky('## Image Output: Save as JPEG or PNG', {
			name: 'Sticky Note3',
			color: 4,
			position: [3120, 3312],
			width: 432,
			height: 368,
		}),
	)
	.add(
		sticky(
			"## 🔍 Non-AI Extraction :: SERP\n\nThis gets search results using the 'serp' schema.\n\n**Note:** You can modify the Domain (in the HTTP node) to get details from different search engines or regions.",
			{ name: 'Sticky Note4', color: 7, position: [-1424, 1280], width: 464, height: 448 },
		),
	)
	.add(
		sticky(
			"## 🛠️ Manual Mode (Raw Data)\n\n\n\n\nAggregates raw outputs (HTML, JSON, Base64) from the manual flows.\n\n**⚠️ NOTE:** No AI parsing happens here. You must add your own 'HTML Extract' or 'Code' nodes after this point to parse the data.\n\n\n\n**Capabilities:**\n\n\n- **Browser HTML:** Returns the full rendered DOM.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n- **HTTP Response:** Sends HTTP request & returns Base64-encoded response body.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n- **Infinite Scroll:** Auto-scrolls to bottom before capturing HTML.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n- **Network Capture:** intercepts API calls (JSON) from the page.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n- **Screenshot:** Returns a visual snapshot of the page.",
			{ name: 'Sticky Note6', color: 7, position: [-1536, 1856], width: 736, height: 1888 },
		),
	)
	.add(
		sticky(
			'## 🕹️ Control Center\n\n**1. Form:** Accepts URL & API Key.\n**2. Logic Engine:** Maps your "Goal" (e.g., "Crawl all pages") to the correct AI Schema (Product, Article, Job).\n**3. Routing:** Directs traffic to one of 3 main pipelines:\n   - 🤖 **AI Extraction:** Smart parsing (Products/News/Jobs).\n   - 🔍 **SERP:** Search Engine Results.\n   - 🛠️ **Manual/General:** Raw HTML & Network dumps.',
			{ name: 'Sticky Note7', color: 7, position: [-3808, 944], width: 1424, height: 1072 },
		),
	)
	.add(
		sticky(
			'## 🤖 AI Extraction Pipeline (5 Scenarios)\n\nThis section handles the smart extraction based on your goal:\n\n\n\n1. **Simple Scrapes (No Pagination):**\n\n\n\ni. **Single Item:** Scrapes one specific product/article.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nii. **List (Current Page):** Gets all items from the provided URL only.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\niii. **Details (Current Page):** Finds items on this page & visits them one-by-one.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n2. **Advanced Crawlers (Pagination Active):**\n\n\n\n\n\n\n\niv. **Crawl List:** Loops through ALL pages to build a massive master list.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nv. **Crawl Details:** The "Ultimate" Mode. Loops through ALL pages + visits EVERY item to extract full details.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n',
			{ name: 'Sticky Note8', color: 7, position: [-608, -1552], width: 2592, height: 2560 },
		),
	)
	.add(
		sticky('## Output:: serp Response', {
			name: 'Sticky Note5',
			color: 4,
			position: [3072, 1360],
			width: 464,
			height: 368,
		}),
	);
