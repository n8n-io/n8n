const wf = workflow('FJU3f2ANp6c9kw2k', '19 Monitor Keyword Rankings', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ triggerAtHour: 9 }] } },
				name: '🕒 Trigger: Run Daily/Weekly',
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
								id: '95b1399f-4709-46e0-89a9-cbf17ce9c06c',
								name: 'keyword',
								type: 'string',
								value: 'best running shoes',
							},
						],
					},
				},
				position: [200, 0],
				name: '📝 Input: Keyword & Domain',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=Based on the following keyword, provide me ranking of the 1st 5 website.\nkeyword: {{ $json.keyword }}',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-mcp.mcpClientTool',
							version: 1,
							config: {
								parameters: {
									toolName: 'search_engine',
									operation: 'executeTool',
									toolParameters:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Tool_Parameters', ``, 'json') }}",
								},
								credentials: {
									mcpClientApi: { id: 'credential-id', name: 'mcpClientApi Credential' },
								},
								name: 'MCP Client',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserAutofixing',
						version: 1,
						config: {
							parameters: { options: {} },
							subnodes: {
								model: languageModel({
									type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
									version: 1.2,
									config: {
										parameters: {
											model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
											options: {},
										},
										credentials: {
											openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
										},
										name: 'OpenAI Chat Model1',
									},
								}),
								outputParser: outputParser({
									type: '@n8n/n8n-nodes-langchain.outputParserStructured',
									version: 1.2,
									config: {
										parameters: {
											jsonSchemaExample:
												'[\n  {\n    "rank": 1,\n    "title": "Runner\'s World",\n    "url": "https://www.runnersworld.com/gear/a19663621/best-running-shoes/",\n    "description": "A comprehensive guide on the best running shoes, recommending models like Brooks Ghost and Nike Pegasus for new runners."\n  },\n  {\n    "rank": 2,\n    "title": "RunRepeat",\n    "url": "https://runrepeat.com/catalog/running-shoes",\n    "description": "Offers running shoe reviews with ratings for various models such as Nike Pegasus 41 and Hoka Mach 6."\n  },\n  {\n    "rank": 3,\n    "title": "Believe in the Run",\n    "url": "https://believeintherun.com/shoe-reviews/best-running-shoes-2025/",\n    "description": "Features an in-depth guide to the best running shoes of 2025 across different categories."\n  },\n  {\n    "rank": 4,\n    "title": "The Run Testers",\n    "url": "https://theruntesters.com/running-shoes/the-best-running-shoes-to-buy/",\n    "description": "Reviews the best running shoes available, highlighting their performance and value."\n  },\n  {\n    "rank": 5,\n    "title": "Men\'s Health",\n    "url": "https://www.menshealth.com/fitness/a64476227/running-shoes-editors-picks/",\n    "description": "Provides a selection of top running shoes recommended by Men\'s Health editors."\n  }\n]\n',
										},
										name: 'Structured Output Parser1',
									},
								}),
							},
							name: 'Auto-fixing Output Parser',
						},
					}),
				},
				position: [480, 0],
				name: '🤖 SERP Scraper Agent (MCP)',
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
						'// Get the SERP list from the incoming item\nconst serpList = items[0].json.output;\n\n// Emit each result as a separate item\nreturn serpList.map(result => {\n  return {\n    json: result\n  };\n});\n',
				},
				position: [960, 0],
				name: '🧠 Format SERP Results',
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
							Rank: '={{ $json.rank }}',
							Title: '={{ $json.title }}',
							Description: '={{ $json.description }}',
						},
						schema: [
							{
								id: 'Title',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Title',
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
								id: 'Description',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Rank',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Rank',
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
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1p64unH_JjzG978cAxPZC4kSZmoXgvYTA-Q7qdfnxr8Y/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1p64unH_JjzG978cAxPZC4kSZmoXgvYTA-Q7qdfnxr8Y',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1p64unH_JjzG978cAxPZC4kSZmoXgvYTA-Q7qdfnxr8Y/edit?usp=drivesdk',
						cachedResultName: 'Website Ranking',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1180, 0],
				name: '📊 Log to Google Sheets',
			},
		}),
	)
	.add(
		sticky(
			'## 🟦 **Section 1: Input & Trigger Configuration**\n\n### 🕒 **Trigger: Run Daily/Weekly**\n\n🔧 **Node Name:** `Trigger: Run Daily/Weekly`\n💡 **What it does:**\nThis node automatically starts your workflow on a set schedule. You can run it:\n\n* Daily to monitor SEO fluctuations\n* Weekly to track long-term trends\n\n📌 **Why it\'s useful:**\nNo manual work is needed. Just set it once and it keeps your ranking logs up to date.\n\n---\n\n### 📝 **Input: Keyword & Domain**\n\n🔧 **Node Name:** `Input: Keyword & Domain`\n💡 **What it does:**\nHere you provide the **search keyword** (like `"best running shoes"`) and optionally the **domain name** (like `"yourwebsite.com"`) to monitor.\n\n📌 **Why it\'s useful:**\nYou can change or extend keywords anytime without changing the rest of the workflow. Great for campaign flexibility.\n\n---\n\n',
			{ color: 6, position: [-20, -1120], width: 360, height: 1320 },
		),
	)
	.add(
		sticky(
			"## 🟨 **Section 2: Smart SERP Scraping with AI Agent**\n\n### 🤖 **SERP Scraper Agent (MCP)**\n\n🔧 **Node Name:** `SERP Scraper Agent (MCP)`\n💡 **What it does:**\nThis is your smart agent that uses **Bright Data's MCP (Mobile Carrier Proxy)** to simulate real user behavior and scrape **Google Search Results** accurately.\n\nIt connects to:\n\n#### 🧠 **AI Brain**\n\n🔧 **Sub-node:** `OpenAI Chat Model`\n🎯 Understands the keyword, crafts a natural query prompt, and makes sure the search context is accurate.\n\n#### 🌐 **MCP SERP Fetcher**\n\n🔧 **Sub-node:** `MCP Client`\n🛰️ Actually performs the search on Google and fetches the **top 5 results** anonymously through real mobile-like connections (bypassing CAPTCHAs & blocks).\n\n#### 🧾 **SERP Output Formatter**\n\n🔧 **Sub-node:** `Structured Output Parser`\n🧹 Cleans up the scraped data and structures it into useful fields:\n\n* `rank`\n* `title`\n* `url`\n* `description`\n\n📌 **Why it's useful:**\nTraditional scrapers break often. This smart setup ensures highly accurate, undetectable scraping that adapts to changes in search results.\n\n---\n\n",
			{ name: 'Sticky Note1', color: 3, position: [440, -1080], width: 340, height: 1280 },
		),
	)
	.add(
		sticky(
			"## 🟩 **Section 3: Rank Logging and Reporting**\n\n### 🧠 **Parse SERP Results**\n\n🔧 **Node Name:** `Parse SERP Results`\n💡 **What it does:**\nThis **Code node** takes the structured list of top 5 results and **splits them into individual records**, one per website.\n\n📌 **Why it's useful:**\nIt prepares the data so each row can be logged separately in your spreadsheet, which makes filtering, charting, and comparison super easy.\n\n---\n\n### 📊 **Log to Google Sheets**\n\n🔧 **Node Name:** `Log to Google Sheets`\n💡 **What it does:**\nAppends each parsed search result (rank, title, URL, description) into your tracking spreadsheet.\n\n",
			{ name: 'Sticky Note2', color: 5, position: [920, -900], width: 400, height: 1100 },
		),
	)
	.add(
		sticky(
			'## I’ll receive a tiny commission if you join Bright Data through this link—thanks for fueling more free content!\n\n### https://get.brightdata.com/1tndi4600b25',
			{ name: 'Sticky Note5', color: 7, position: [1420, -900], width: 380, height: 240 },
		),
	)
	.add(
		sticky(
			'=======================================\n            WORKFLOW ASSISTANCE\n=======================================\nFor any questions or support, please contact:\n    Yaron@nofluff.online\n\nExplore more tips and tutorials here:\n   - YouTube: https://www.youtube.com/@YaronBeen/videos\n   - LinkedIn: https://www.linkedin.com/in/yaronbeen/\n=======================================\n',
			{ name: 'Sticky Note9', color: 4, position: [-1680, -1120], width: 1300, height: 320 },
		),
	)
	.add(
		sticky(
			"## 🔍 **Workflow: Monitor Keyword Rankings with AI & Bright Data MCP**\n\nTrack where your website ranks on Google for specific keywords, using AI-powered scraping and structured logging in Google Sheets.\n\n---\n\n## 🟦 **Section 1: Input & Trigger Configuration**\n\n### 🕒 **Trigger: Run Daily/Weekly**\n\n🔧 **Node Name:** `Trigger: Run Daily/Weekly`\n💡 **What it does:**\nThis node automatically starts your workflow on a set schedule. You can run it:\n\n* Daily to monitor SEO fluctuations\n* Weekly to track long-term trends\n\n📌 **Why it's useful:**\nNo manual work is needed. Just set it once and it keeps your ranking logs up to date.\n\n---\n\n### 📝 **Input: Keyword & Domain**\n\n🔧 **Node Name:** `Input: Keyword & Domain`\n💡 **What it does:**\nHere you provide the **search keyword** (like `\"best running shoes\"`) and optionally the **domain name** (like `\"yourwebsite.com\"`) to monitor.\n\n📌 **Why it's useful:**\nYou can change or extend keywords anytime without changing the rest of the workflow. Great for campaign flexibility.\n\n---\n\n## 🟨 **Section 2: Smart SERP Scraping with AI Agent**\n\n### 🤖 **SERP Scraper Agent (MCP)**\n\n🔧 **Node Name:** `SERP Scraper Agent (MCP)`\n💡 **What it does:**\nThis is your smart agent that uses **Bright Data's MCP (Mobile Carrier Proxy)** to simulate real user behavior and scrape **Google Search Results** accurately.\n\nIt connects to:\n\n#### 🧠 **AI Brain**\n\n🔧 **Sub-node:** `OpenAI Chat Model`\n🎯 Understands the keyword, crafts a natural query prompt, and makes sure the search context is accurate.\n\n#### 🌐 **MCP SERP Fetcher**\n\n🔧 **Sub-node:** `MCP Client`\n🛰️ Actually performs the search on Google and fetches the **top 5 results** anonymously through real mobile-like connections (bypassing CAPTCHAs & blocks).\n\n#### 🧾 **SERP Output Formatter**\n\n🔧 **Sub-node:** `Structured Output Parser`\n🧹 Cleans up the scraped data and structures it into useful fields:\n\n* `rank`\n* `title`\n* `url`\n* `description`\n\n📌 **Why it's useful:**\nTraditional scrapers break often. This smart setup ensures highly accurate, undetectable scraping that adapts to changes in search results.\n\n---\n\n## 🟩 **Section 3: Rank Logging and Reporting**\n\n### 🧠 **Parse SERP Results**\n\n🔧 **Node Name:** `Parse SERP Results`\n💡 **What it does:**\nThis **Code node** takes the structured list of top 5 results and **splits them into individual records**, one per website.\n\n📌 **Why it's useful:**\nIt prepares the data so each row can be logged separately in your spreadsheet, which makes filtering, charting, and comparison super easy.\n\n---\n\n### 📊 **Log to Google Sheets**\n\n🔧 **Node Name:** `Log to Google Sheets`\n💡 **What it does:**\nAppends each parsed search result (rank, title, URL, description) into your tracking spreadsheet.\n\n📌 **Why it's useful:**\nYou now have a full historical record of how rankings change day by day, week by week. This is great for:\n\n* SEO audits\n* Campaign reporting\n* Alerting when a competitor outranks you\n\n---\n\n",
			{ name: 'Sticky Note4', color: 4, position: [-1680, -780], width: 1289, height: 2558 },
		),
	);
