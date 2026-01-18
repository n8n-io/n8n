const wf = workflow('P6LeLqxzbkO3FiPE', '10 Track Email Campaign Performance', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ triggerAtHour: 9 }] } },
				position: [-60, 0],
				name: '⏰ Daily Campaign Check Trigger',
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
								id: '04df454e-d477-4dd4-a029-2c97cfd1bf8f',
								name: 'url',
								type: 'string',
								value: '=https://www.mailchimp.com/campaigns/123/report',
							},
						],
					},
				},
				position: [160, 0],
				name: '✏️ Set Campaign Input Fields',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: { options: {}, promptType: 'define', hasOutputParser: true },
				subnodes: {
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
										name: 'OpenAI Chat Model',
									},
								}),
								outputParser: outputParser({
									type: '@n8n/n8n-nodes-langchain.outputParserStructured',
									version: 1.2,
									config: {
										parameters: {
											jsonSchemaExample:
												'{\n  "campaign_name": "Summer Promo Blast",\n  "campaign_id": "123456789",\n  "date_sent": "2025-06-29",\n  "unique_opens": 1230,\n  "total_opens": 1590,\n  "open_rate": 47,\n  "unique_clicks": 530,\n  "total_clicks": 670,\n  "ctr": 20,\n  "soft_bounces": 25,\n  "hard_bounces": 10,\n  "bounce_rate": 1.8,\n  "unsubscribed": 15,\n  "unsubscribe_rate": 0.6\n}\n',
										},
										name: 'Structured Output Parser',
									},
								}),
							},
							name: 'Auto-fixing Output Parser',
						},
					}),
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
							name: '🧠 LLM: Summarize & Format',
						},
					}),
					tools: [
						tool({
							type: 'n8n-nodes-mcp.mcpClientTool',
							version: 1,
							config: {
								parameters: {
									toolName: 'scrape_as_markdown',
									operation: 'executeTool',
									toolParameters:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Tool_Parameters', ``, 'json') }}",
								},
								credentials: {
									mcpClientApi: { id: 'credential-id', name: 'mcpClientApi Credential' },
								},
								name: '🌐 Bright Data MCP: Scrape Report',
							},
						}),
					],
				},
				position: [520, 0],
				name: '🤖 Agent: Scrape & Analyze Campaign Performance',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.gmail',
					version: 2.1,
					config: {
						parameters: {
							sendTo: 'user@example.com',
							message:
								'Hi [First Name],  \nWe noticed you opened our recent email — thank you for staying connected! \n🙌 But we think you might have missed the best part…  \n👉 [Big Benefit or Offer — e.g., “Get 20% off your next order — today only!”]  \nWe don’t want you to miss out — just click below and grab your exclusive [deal / resource / upgrade].  \n[CTA Button: “Claim Your Offer”]  Still not sure? We’re here to help if you have any questions. Just hit reply — we love hearing from you!  Talk soon, [Your Name] [Your Company]',
							options: {},
							subject: 'Did you miss this? Here’s something special for you!',
							emailType: 'text',
						},
						credentials: {
							gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
						},
						position: [1340, -100],
						name: '📧 Send Follow-Up Engagement Email',
					},
				}),
				node({
					type: 'n8n-nodes-base.noOp',
					version: 1,
					config: { position: [1340, 100], name: '🚫 Skip — No Action Needed' },
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
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'd5c41a60-cadf-47a6-9685-9bead865346d',
								operator: { type: 'number', operation: 'gte' },
								leftValue: '={{ $json.open_rate }}',
								rightValue: 20,
							},
							{
								id: '7a251b0b-a122-418d-8b0c-6714ebfa6018',
								operator: { type: 'number', operation: 'lt' },
								leftValue: '={{ $json.ctr }}',
								rightValue: 130,
							},
						],
					},
				},
				name: '🔎 IF: Open ≥30% & CTR <10%?',
			},
		),
	)
	.add(
		sticky(
			'## 🎯 **🔹 SECTION 1: Schedule & Prepare Inputs**\n\n### ✅ **Nodes in this Section**\n\n| Node | Name                             |\n| ---- | -------------------------------- |\n| ⏰    | **Daily Campaign Check Trigger** |\n| ✏️   | **Set Campaign Input Fields**    |\n\n---\n\n### 💡 **What Happens Here**\n\n* **⏰ Daily Campaign Check Trigger:**\n  This node automatically **starts the workflow on a schedule** — for example, every morning at 9 AM.\n  It makes sure you **don’t have to run it manually** every time. The goal is to check your email campaign performance **regularly and consistently**.\n\n* **✏️ Set Campaign Input Fields:**\n  This node **defines any input values** that your Agent needs.\n  For example:\n\n  * Campaign ID\n  * ESP URL\n  * Date range\n  * Any dynamic variables\n\n  It acts like **filling in a form** that the rest of the workflow will use.\n  You can **edit it easily** without changing the whole workflow.\n\n---\n\n### 🎯 **Why It’s Important**\n\n✅ Automates the whole thing on autopilot.\n✅ Ensures the Agent always has the **right data**.\n✅ Makes the workflow easy to maintain for non-tech users — just change a value in **Edit Fields**, done!\n\n---\n\n---\n\n',
			{ color: 6, position: [-120, -1180], width: 420, height: 1360 },
		),
	)
	.add(
		sticky(
			'## 🤖 **🔹 SECTION 2: Scrape & Analyze with AI Agent**\n\n### ✅ **Nodes in this Section**\n\n| Node | Name                                             |\n| ---- | ------------------------------------------------ |\n| 🤖   | **Agent: Scrape & Analyze Campaign Performance** |\n| 🧠   | **LLM: Summarize & Format**                      |\n| 🌐   | **Bright Data MCP: Scrape Report**               |\n| 🗂️  | **Parse Scrape Output**                          |\n\n---\n\n### 💡 **What Happens Here**\n\n* **🤖 Agent: Scrape & Analyze Campaign Performance**\n  This is your **AI Agent** — it does the smart part:\n\n  * Talks to the **Bright Data MCP Tool** to scrape the ESP report page.\n  * Uses an **LLM** (OpenAI Chat Model) to process the scraped data.\n  * Passes the result to an **Output Parser** to turn messy text into clean, structured data.\n\n* **🌐 Bright Data MCP: Scrape Report**\n  Bright Data logs in, navigates to your campaign report page, and **scrapes live open/click numbers**.\n\n* **🧠 LLM: Summarize & Format**\n  The Chat Model turns raw scraped info into easy-to-read Markdown or JSON.\n  This is like having a mini data analyst!\n\n* **🗂️ Parse Scrape Output**\n  This node extracts the final numbers (open rate, CTR, bounces) so the logic can understand them.\n\n---\n\n### 🎯 **Why It’s Important**\n\n✅ You don’t have to log in manually to get reports.\n✅ The AI cleans up messy scraped data.\n✅ Makes follow-up decisions possible without human effort.\n✅ Works for **any ESP** — if the layout changes, just adjust the scraper.\n\n---\n\n---\n\n',
			{ name: 'Sticky Note1', color: 3, position: [440, -1300], width: 420, height: 1480 },
		),
	)
	.add(
		sticky(
			'## 📈 **🔹 SECTION 3: Decide & Act Automatically**\n\n### ✅ **Nodes in this Section**\n\n| Node | Name                                |\n| ---- | ----------------------------------- |\n| 🔎   | **IF: Open ≥30% & CTR <10%?**       |\n| 📧   | **Send Follow-Up Engagement Email** |\n| 🚫   | **Skip — No Action Needed**         |\n\n---\n\n### 💡 **What Happens Here**\n\n* **🔎 IF: Open ≥30% & CTR <10%?**\n  This node checks:\n\n  * Is the open rate good? (≥30%)\n  * But is the click-through rate low? (<10%)\n    If **true**, it triggers follow-up to re-engage the audience.\n\n* **📧 Send Follow-Up Engagement Email**\n  If the condition is true, this node sends a **personalized follow-up email** automatically.\n  For example: “Hey, you opened but didn’t click — here’s your special offer!”\n\n* **🚫 Skip — No Action Needed**\n  If the condition is **false** (e.g. CTR is healthy), do nothing. The workflow ends safely.\n\n---\n\n',
			{ name: 'Sticky Note2', color: 5, position: [1060, -840], width: 420, height: 1100 },
		),
	)
	.add(
		sticky(
			'## I’ll receive a tiny commission if you join Bright Data through this link—thanks for fueling more free content!\n\n### https://get.brightdata.com/1tndi4600b25',
			{ name: 'Sticky Note5', color: 7, position: [1560, -920], width: 380, height: 240 },
		),
	)
	.add(
		sticky(
			'=======================================\n            WORKFLOW ASSISTANCE\n=======================================\nFor any questions or support, please contact:\n    Yaron@nofluff.online\n\nExplore more tips and tutorials here:\n   - YouTube: https://www.youtube.com/@YaronBeen/videos\n   - LinkedIn: https://www.linkedin.com/in/yaronbeen/\n=======================================\n',
			{ name: 'Sticky Note9', color: 4, position: [-1980, -1180], width: 1300, height: 320 },
		),
	)
	.add(
		sticky(
			'# Dynamic Email Re-Engagement Automation\n---\n\n## 🎯 **🔹 SECTION 1: Schedule & Prepare Inputs**\n\n### ✅ **Nodes in this Section**\n\n| Node | Name                             |\n| ---- | -------------------------------- |\n| ⏰    | **Daily Campaign Check Trigger** |\n| ✏️   | **Set Campaign Input Fields**    |\n\n---\n\n### 💡 **What Happens Here**\n\n* **⏰ Daily Campaign Check Trigger:**\n  This node automatically **starts the workflow on a schedule** — for example, every morning at 9 AM.\n  It makes sure you **don’t have to run it manually** every time. The goal is to check your email campaign performance **regularly and consistently**.\n\n* **✏️ Set Campaign Input Fields:**\n  This node **defines any input values** that your Agent needs.\n  For example:\n\n  * Campaign ID\n  * ESP URL\n  * Date range\n  * Any dynamic variables\n\n  It acts like **filling in a form** that the rest of the workflow will use.\n  You can **edit it easily** without changing the whole workflow.\n\n---\n\n### 🎯 **Why It’s Important**\n\n✅ Automates the whole thing on autopilot.\n✅ Ensures the Agent always has the **right data**.\n✅ Makes the workflow easy to maintain for non-tech users — just change a value in **Edit Fields**, done!\n\n---\n\n---\n\n## 🤖 **🔹 SECTION 2: Scrape & Analyze with AI Agent**\n\n### ✅ **Nodes in this Section**\n\n| Node | Name                                             |\n| ---- | ------------------------------------------------ |\n| 🤖   | **Agent: Scrape & Analyze Campaign Performance** |\n| 🧠   | **LLM: Summarize & Format**                      |\n| 🌐   | **Bright Data MCP: Scrape Report**               |\n| 🗂️  | **Parse Scrape Output**                          |\n\n---\n\n### 💡 **What Happens Here**\n\n* **🤖 Agent: Scrape & Analyze Campaign Performance**\n  This is your **AI Agent** — it does the smart part:\n\n  * Talks to the **Bright Data MCP Tool** to scrape the ESP report page.\n  * Uses an **LLM** (OpenAI Chat Model) to process the scraped data.\n  * Passes the result to an **Output Parser** to turn messy text into clean, structured data.\n\n* **🌐 Bright Data MCP: Scrape Report**\n  Bright Data logs in, navigates to your campaign report page, and **scrapes live open/click numbers**.\n\n* **🧠 LLM: Summarize & Format**\n  The Chat Model turns raw scraped info into easy-to-read Markdown or JSON.\n  This is like having a mini data analyst!\n\n* **🗂️ Parse Scrape Output**\n  This node extracts the final numbers (open rate, CTR, bounces) so the logic can understand them.\n\n---\n\n### 🎯 **Why It’s Important**\n\n✅ You don’t have to log in manually to get reports.\n✅ The AI cleans up messy scraped data.\n✅ Makes follow-up decisions possible without human effort.\n✅ Works for **any ESP** — if the layout changes, just adjust the scraper.\n\n---\n\n---\n\n## 📈 **🔹 SECTION 3: Decide & Act Automatically**\n\n### ✅ **Nodes in this Section**\n\n| Node | Name                                |\n| ---- | ----------------------------------- |\n| 🔎   | **IF: Open ≥30% & CTR <10%?**       |\n| 📧   | **Send Follow-Up Engagement Email** |\n| 🚫   | **Skip — No Action Needed**         |\n\n---\n\n### 💡 **What Happens Here**\n\n* **🔎 IF: Open ≥30% & CTR <10%?**\n  This node checks:\n\n  * Is the open rate good? (≥30%)\n  * But is the click-through rate low? (<10%)\n    If **true**, it triggers follow-up to re-engage the audience.\n\n* **📧 Send Follow-Up Engagement Email**\n  If the condition is true, this node sends a **personalized follow-up email** automatically.\n  For example: “Hey, you opened but didn’t click — here’s your special offer!”\n\n* **🚫 Skip — No Action Needed**\n  If the condition is **false** (e.g. CTR is healthy), do nothing. The workflow ends safely.\n\n---\n\n### 🎯 **Why It’s Important**\n\n✅ Takes action **only when needed**, saving time.\n✅ Boosts click rates without extra manual work.\n✅ Protects your audience from spam by not sending unnecessary follow-ups.\n\n---\n\n## 🌟 **✨ Why This Whole Flow is Powerful**\n\n* Runs daily — **no manual checks**.\n* Scrapes live data — **no API? No problem!**\n* Uses AI to process messy data — **no coding required!**\n* Makes smart decisions — **no human micromanagement**.\n* Sends the right email to the right audience at the right time — **better engagement, better ROI!**\n\n---\n\n',
			{ name: 'Sticky Note4', color: 4, position: [-1980, -840], width: 1289, height: 3118 },
		),
	);
