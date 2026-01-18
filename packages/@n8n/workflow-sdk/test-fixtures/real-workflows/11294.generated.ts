const wf = workflow(
	'iseNsMusqpCWXzue',
	'Automate Inventory Reordering from Airtable using GPT-4o, Slack & Email',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-2144, 688], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2.1,
			config: {
				parameters: {
					base: {
						__rl: true,
						mode: 'list',
						value: 'appxjEpOgye5YQG1J',
						cachedResultUrl: 'https://airtable.com/appxjEpOgye5YQG1J',
						cachedResultName: 'Lead Manager',
					},
					table: {
						__rl: true,
						mode: 'list',
						value: 'tbl4TiSSi2uUJaUOO',
						cachedResultUrl: 'https://airtable.com/appxjEpOgye5YQG1J/tbl4TiSSi2uUJaUOO',
						cachedResultName: 'Leads',
					},
					options: {},
					operation: 'search',
				},
				credentials: {
					airtableTokenApi: {
						id: 'nWc9JHR6t25WPWVV',
						name: 'Airtable Personal Access Token account',
					},
				},
				position: [-1888, 688],
				name: 'Fetch Inventory Records from Airtable',
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
								id: 'e2adb005-2b3c-4d1e-8445-442df1fe925a',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: '={{ $json.id }}',
								rightValue: '',
							},
						],
					},
				},
				position: [-1648, 688],
				name: 'Validate Inventory Record Structure',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: '=Analyze the following Airtable inventory records and return the optimized stock details.\n\nInput Data:\n{{ JSON.stringify($json, null, 2) }}\n\nReturn ONLY this JSON structure:\n\n{\n  "results": [\n    {\n      "id": "...",\n      "ItemName": "...",\n      "SKU": "...",\n      "QuantityInStock": number,\n      "ReorderLevel": number,\n      "SuggestedReorderPoint": number,\n      "SuggestedSafetyStock": number,\n      "StockStatus": "OK | Needs Reorder | Critical"\n    }\n  ]\n}\n',
					options: {
						systemMessage:
							'=Analyze the following Airtable inventory records and return the optimized stock details.\n\nInput Data:\n{{ JSON.stringify($json, null, 2) }}\n\nReturn ONLY this JSON structure:\n\n{\n  "results": [\n    {\n      "id": "...",\n      "ItemName": "...",\n      "SKU": "...",\n      "QuantityInStock": number,\n      "ReorderLevel": number,\n      "SuggestedReorderPoint": number,\n      "SuggestedSafetyStock": number,\n      "StockStatus": "OK | Needs Reorder | Critical"\n    }\n  ]\n}\n\n\nImportant:\n- NEVER wrap the output in backticks.\n- NEVER include markdown.\n- Return ONLY raw JSON.\n- The final output MUST be a valid JSON object. \nYou are an Inventory Optimization Engine.\nFollow formulas strictly and NEVER improvise:\n\nFormula 1:\nSuggestedReorderPoint = ReorderLevel * 1.2\n\nFormula 2:\nSuggestedSafetyStock = ReorderLevel * 0.5\n\nRules:\n- DO NOT round values unless needed.\n- DO NOT swap the formulas.\n- DO NOT invent new logic.\n- Only use the formulas exactly as written.\n\nStockStatus:\n- "Critical" if QuantityInStock <= SuggestedSafetyStock\n- "Needs Reorder" if QuantityInStock <= SuggestedReorderPoint\n- "OK" otherwise\n\nReturn ONLY raw JSON.\n\n',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-1184, 672],
				name: 'Generate Inventory Optimization Output (AI)',
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
						"let items = $input.all();\n\n// AI may return multiple partial outputs → merge them\nlet mergedResults = [];\n\nfor (const item of items) {\n  let out = item.json.output || item.json;\n  \n  // Remove backticks or markdown\n  out = String(out).replace(/```json|```/g, '').trim();\n  \n  try {\n    const parsed = JSON.parse(out);\n    if (parsed?.results) {\n      mergedResults.push(...parsed.results);\n    }\n  } catch (err) {\n    // Skip invalid JSON\n  }\n}\n\nreturn [\n  {\n    json: {\n      results: mergedResults\n    }\n  }\n];\n",
				},
				position: [-768, 672],
				name: 'Merge AI Optimization Results ',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: '=Generate an operations-team–ready email summary based on the following inventory optimization results:\n\n{{ JSON.stringify($json, null, 2) }}\n\nThe email must include:\n- A clear subject line\n- A short overview of today’s inventory health\n- A bullet list highlighting:\n    - Item name\n    - SKU\n    - Quantity in stock\n    - Reorder level\n    - Suggested reorder point\n    - Suggested safety stock\n    - Stock status\n- Specific alerts for items:\n    - Below reorder level\n    - Below safety stock\n    - Low stock or critical stock\n- A closing section with recommended actions\n\nKeep the tone professional but simple.\n',
					options: {
						systemMessage:
							'=You are an expert Operations Assistant responsible for generating clear, concise, and actionable email summaries based on inventory optimization data. \n\nYour job:\n- Read the inventory items and their updated stock calculations.\n- Identify any SKUs that need attention.\n- Highlight items that are nearing reorder point, below safety stock, or have critical status.\n- Summarize important updates for the operations team in a professional business email format.\n- Keep tone: concise, objective, and action-oriented.\n- DO NOT rewrite or change inventory numbers; use exactly what is provided.\n- DO NOT add fictional items or assumptions.\n- If all items are healthy, still provide an email confirming "No issues detected".\n\nFormat the email as:\n1. Subject line\n2. Greeting\n3. Summary paragraph\n4. Bullet list of key items with issues\n5. Recommended next steps\n6. Closing\n',
					},
					promptType: 'define',
				},
				position: [64, 1408],
				name: 'Generate Inventory Email Summary ',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: '=',
					message: '={{ $json.output }}',
					options: {},
					subject: '=Consent Manager Governance',
				},
				credentials: {
					gmailOAuth2: { id: 'RchiXdmY8WaQhOSJ', name: 'Gmail account' },
				},
				position: [448, 1408],
				name: 'Email Inventory Summary to Manager',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: '=Generate a Slack-friendly inventory summary using the following data:\n\n{{ JSON.stringify($json, null, 2) }}\n\nInclude:\n- One-line overall inventory health message\n- A compact bullet list of items (name, SKU, stock, reorder level, suggestions, status)\n- Highlight items that are:\n   - Below reorder level\n   - Below safety stock\n   - Low or critical stock\n- Use emojis for quick visibility (⚠️ 🔴 🟢)\n- End with a single recommended Ops action line\n\nKeep it short and actionable.\n',
					options: {
						systemMessage:
							'=Generate a Slack-friendly inventory summary using the following data:\n\n{{ JSON.stringify($json, null, 2) }}\n\nInclude:\n- One-line overall inventory health message\n- A compact bullet list of items (name, SKU, stock, reorder level, suggestions, status)\n- Highlight items that are:\n   - Below reorder level\n   - Below safety stock\n   - Low or critical stock\n- Use emojis for quick visibility (⚠️ 🔴 🟢)\n- End with a single recommended Ops action line\n\nKeep it short and actionable.\n',
					},
					promptType: 'define',
				},
				position: [0, 608],
				name: 'Generate Inventory Slack Summary',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.slack',
			version: 2.1,
			config: {
				parameters: {
					text: '={{ $json.output }}',
					user: {
						__rl: true,
						mode: 'list',
						value: 'U09HMPVD466',
						cachedResultName: 'newscctv22',
					},
					select: 'user',
					otherOptions: { includeLinkToWorkflow: false },
				},
				credentials: {
					slackApi: { id: 'rNqvWj9TfChPVRYY', name: 'Slack account vivek' },
				},
				position: [432, 608],
				name: 'Notify Operations Team on Slack',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.asana',
			version: 1,
			config: {
				parameters: {
					name: "={{\n  ($json.results[0].ItemName || 'Unnamed Item')\n  + ' | Stock: ' + $json.results[0].StockStatus\n  + ' | SKU: ' + ($json.results[0].SKU || 'N/A')\n}}\n",
					workspace: '1212551193156936',
					authentication: 'oAuth2',
					otherProperties: {
						notes:
							"={{\n`📦 Inventory Alert\n\nItem Name: ${$json.results[0].ItemName || 'N/A'}\nSKU: ${$json.results[0].SKU || 'N/A'}\n\n📊 Stock Details\n• Quantity In Stock: ${$json.results[0].QuantityInStock}\n• Reorder Level: ${$json.results[0].ReorderLevel}\n• Suggested Reorder Point: ${$json.results[0].SuggestedReorderPoint}\n• Suggested Safety Stock: ${$json.results[0].SuggestedSafetyStock}\n\n🚦 Status: ${$json.results[0].StockStatus}\n\n🆔 Record ID: ${$json.results[0].id}\n`\n}}\n",
						due_on: '={{ $now.plus({ days: 1 }).toISODate() }}\n',
						projects: ['1212565062132347'],
					},
				},
				credentials: {
					asanaOAuth2Api: { id: '9Jp2gIIAp5UAgrHO', name: 'saurabh Asana account 4' },
				},
				position: [208, -80],
				name: 'Create Asana Task for Inventory Db',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.notion',
			version: 2.2,
			config: {
				parameters: {
					title: '=data',
					simple: false,
					options: {},
					resource: 'databasePage',
					databaseId: {
						__rl: true,
						mode: 'list',
						value: '2e2802b9-1fa0-8035-a725-c04fde5c7b00',
						cachedResultUrl: 'https://www.notion.so/2e2802b91fa08035a725c04fde5c7b00',
						cachedResultName: 'inventory reorder ',
					},
					propertiesUi: {
						propertyValues: [{ key: 'Name|title', title: '={{ $json.results }}' }],
					},
				},
				credentials: {
					notionApi: { id: 'iDjtgSTYG9ECVBtT', name: 'Notion account 2' },
				},
				position: [-64, -176],
				name: 'Log Trade Decision to Notion (inventory db)',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {},
						schema: [
							{
								id: 'output',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'output',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['output'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1318002027,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/17rcNd_ZpUQLm0uWEVbD-NY6GyFUkrD4BglvawlyBygM/edit#gid=1318002027',
						cachedResultName: 'hacker news',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '17rcNd_ZpUQLm0uWEVbD-NY6GyFUkrD4BglvawlyBygM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/17rcNd_ZpUQLm0uWEVbD-NY6GyFUkrD4BglvawlyBygM/edit?usp=drivesdk',
						cachedResultName: 'sample_leads_50',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: { id: 'kpPEOLCGn963qpoh', name: 'automations@techdome.ai' },
				},
				position: [-1520, 960],
				name: 'Log Invalid Inventory Rows to Google Sheet',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.errorTrigger',
			version: 1,
			config: { position: [-1888, 1552], name: 'Workflow Error Handler' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.2,
			config: {
				parameters: {
					message:
						'=🚨 *Workflow Error Alert*  *Error Node:* {{ $json.node.name }} *Error Message:* {{ $json.error.message }} *Timestamp:* {{ $now.toISO() }}  Please investigate immediately.',
					options: {},
					subject: 'Workflow Error Alert',
					emailType: 'text',
				},
				credentials: {
					gmailOAuth2: { id: 'gEIaWCTvGfYjMSb3', name: 'Gmail credentials' },
				},
				position: [-1536, 1552],
				name: 'Send a message1',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
			version: 1,
			config: {
				parameters: { model: 'gpt-4o', options: {} },
				credentials: {
					azureOpenAiApi: { id: 'C3WzT18XqF8OdVM6', name: 'Azure Open AI account' },
				},
				position: [64, 1712],
				name: 'Configure GPT-4o Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
			version: 1,
			config: {
				parameters: { model: 'gpt-4o', options: {} },
				credentials: {
					azureOpenAiApi: { id: 'C3WzT18XqF8OdVM6', name: 'Azure Open AI account' },
				},
				position: [0, 944],
				name: 'Configure GPT-4o Model1',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
			version: 1,
			config: {
				parameters: { model: 'gpt-4o', options: {} },
				credentials: {
					azureOpenAiApi: { id: 'C3WzT18XqF8OdVM6', name: 'Azure Open AI account' },
				},
				position: [-1184, 1040],
				name: 'Configure GPT-4o — Inventory Optimization Model',
			},
		}),
	)
	.add(
		sticky(
			'## 📦 Automate Inventory Reordering from Airtable using GPT-4o, Slack & Email\nThis workflow automates inventory intelligence using Airtable + AI models to generate \noptimized stock metrics, and delivers actionable summaries through Email and Slack.\n\nThe workflow starts with a manual trigger → fetches Inventory from Airtable → validates \neach row → uses GPT-4o to calculate reorder points, safety stock, and stock health using \nstrict formulas. Multiple AI outputs are merged into one consolidated dataset. Using the \noptimized results, the system generates two types of summaries: a professional email for \noperations managers and a compact Slack message for quick team visibility.\n\nInvalid rows are logged into Google Sheets to maintain audit-readiness. The workflow ensures \nzero hallucinations, strict JSON formatting, accurate stock-health status, and consistent \nmulti-channel communication. This enables the operations team to instantly identify low, \ncritical, or reorder-level items and take action on time.\n\nTools used:\n• Airtable → Inventory source  \n• GPT-4o (Azure) → Optimization + Email summary  \n• GPT-4o (Azure) → Slack summary  \n• Google Sheets → Invalid record logging  \n• Slack → Ops team alert  \n• Gmail → Email to Manager  \n\nOverall, this workflow ensures clean intake, strict validation, accurate AI-based \noptimization, and multi-channel actionable reporting.\n',
			{ position: [-2720, -368], width: 816, height: 576 },
		),
	)
	.add(
		sticky(
			'## Intake & Validation Block\n\nThis section handles data import and quality checks:\n• Pulls inventory from Airtable  \n• Validates required fields (id)  \n• Routes invalid rows to Google Sheets for auditing  \n• Only clean data enters the AI computation phase  \n',
			{ name: 'Sticky Note1', color: 7, position: [-1952, 464], width: 656, height: 688 },
		),
	)
	.add(
		sticky(
			'## AI Optimization Engine\n\nThis block processes inventory rows using GPT-4o:\n• Applies fixed formulas for reorder point & safety stock  \n• Computes stock health status  \n• Ensures strict JSON output (no markdown, no hallucinations)  \n• Merges multiple model outputs into one consolidated dataset  \n',
			{ name: 'Sticky Note5', color: 7, position: [-1232, 384], width: 688, height: 800 },
		),
	)
	.add(
		sticky(
			'## Email Summary Generation\n\nCreates a professional, actionable inventory report:\n• Overall stock health  \n• Low/critical SKU alerts  \n• Recommended next steps  \n• Delivered via Gmail to the manager  \n',
			{ name: 'Sticky Note8', color: 7, position: [0, 1216], width: 640, height: 672 },
		),
	)
	.add(
		sticky(
			'## Slack Summary Generation\n\nProduces a compact, emoji-friendly inventory status message:\n• One-line health indicator  \n• Item-wise stock highlights  \n• Critical/reorder alerts (🟢 ⚠️ 🔴)  \n• Auto-sent to the Ops Slack user/channel  \n',
			{ name: 'Sticky Note11', color: 7, position: [-48, 400], width: 720, height: 688 },
		),
	)
	.add(
		sticky('## Error Handling\nSends alerts when the workflow fails\n', {
			name: 'Sticky Note7',
			color: 7,
			position: [-1968, 1392],
			width: 672,
			height: 336,
		}),
	)
	.add(
		sticky(
			'## 🔐 Required Credentials\n- Airtable (Inventory source)\n- Azure OpenAI (GPT-4o)\n- Google Sheets (audit logging)\n- Slack API (Ops alerts)\n- Gmail OAuth2 (email summaries)\n- Notion API (inventory records)\n- Asana OAuth2 (task creation)\n\nUse n8n credentials. Never hard-code API keys.\n',
			{ name: 'Sticky Note2', color: 3, position: [880, 704], width: 336, height: 272 },
		),
	)
	.add(
		sticky(
			'## 🗂️ Task & Record Logging\nLogs inventory decisions for traceability and action.\nCreates tasks in Asana and stores optimized records\ninside a Notion inventory database.\n',
			{ name: 'Sticky Note3', color: 7, position: [-176, -432], width: 576, height: 576 },
		),
	);
