const wf = workflow('PYTm8uU9m0FN8tG9', '9 Monitor Customer Support Forums', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-440, -80], name: '🚦 Start Workflow (Manual Trigger)' },
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
								id: 'e53f8457-1c2c-41ff-8621-4f7ebee981a8',
								name: 'URL',
								type: 'string',
								value:
									'https://api.stackexchange.com/2.3/search?order=desc&sort=activity&intitle=openai&site=superuser',
							},
						],
					},
				},
				position: [-240, -80],
				name: '🔗 Enter Forum URL',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=scrape the question and answers forum about openAi from this below URL:\n{{ $json.URL }}\nand i want to include in my output are platform name , author name , question , answer_snippet , link , pain point\ncheck if any question have no answer than dont scrape it search for those which have question , its answer_snippet and also customer pain point\n',
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
									toolName: 'scrape_as_markdown',
									operation: 'executeTool',
									toolParameters:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Tool_Parameters', ``, 'json') }}",
								},
								credentials: {
									mcpClientApi: { id: 'credential-id', name: 'mcpClientApi Credential' },
								},
								name: '🌐 Web Scraper Tool ',
							},
						}),
					],
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
											model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
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
									version: 1.3,
									config: {
										parameters: {
											jsonSchemaExample:
												'{\n  "platform": "SuperUser",\n  "questions": [\n    {\n      "author": "Tolure",\n      "question": "How to use Azure OpenAI as a pseudo DB",\n      "answer_snippet": "(Answer is available but not fully provided in the current data; question is marked as answered)",\n      "link": "https://superuser.com/questions/1824019/how-to-use-azure-openai-as-a-pseudo-db",\n      "pain_point": "Difficulty in using Azure OpenAI for database-like functionality"\n    },\n    {\n      "author": "Point Clear Media",\n      "question": "How do I use FFmpeg and OpenAI Whisper to transcribe a RTMP stream?",\n      "answer_snippet": "(Answer is available but not fully provided in the current data)",\n      "link": "https://superuser.com/questions/1778870/how-do-i-use-ffmpeg-and-openai-whisper-to-transcribe-a-rtmp-stream",\n      "pain_point": "Challenges in setting up transcription using FFmpeg and OpenAI Whisper for streaming media"\n    }\n  ]\n}\n',
										},
										name: '📦 Format Forum Data as JSON1',
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
								model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: '🧠 Chat Model Reasoning1',
						},
					}),
				},
				position: [60, -80],
				name: '🤖 Agent: Scrape Forum & Extract Insights',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message:
						'=Hello Product Team,\n\nHere are recent customer pain points and technical discussions about OpenAI from the SuperUser forum:\n\nQuestion:       {{$json["output"][0]["question"]}}\nAsked by:       {{$json["output"][0]["author_name"]}}\nLink:           {{$json["output"][0]["link"]}}{{$json["output"][0]                         ["link"]}}\nAnswer Snippet: {{$json["output"][0]["answer_snippet"]}}\nPain Point:     {{$json["output"][0]["pain_point"]}}\n  \nQuestion:       {{$json["output"][1]["question"]}}\nAsked by:       {{$json["output"][1]["author_name"]}}\nLink:           {{$json["output"][1]["link"]}}{{$json["output"][1]                         ["link"]}}\nAnswer Snippet: {{$json["output"][1]["answer_snippet"]}}\nPain Point:     {{$json["output"][1]["pain_point"]}}\n\nBest regards,\nYour Automation Workflow\n',
					options: { appendAttribution: false },
					subject:
						'=Customer Forum Insights: OpenAI Pain Points from {{ $json.output[0].platform_name }}',
					emailType: 'text',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [580, -80],
				name: '✉️ Send Insights to Product Team (Gmail)',
			},
		}),
	)
	.add(
		sticky(
			'## 1️⃣ **Section 1: Start & Input**\n\n* **🚦 Start Workflow (Manual Trigger)**\n\n  * *Node: When clicking ‘Execute workflow’*\n  * **What happens:**\n    You begin the automation by clicking the "Execute workflow" button in n8n. This makes the process fully manual and secure—you decide when to run it.\n\n* **🔗 Enter Forum URL**\n\n  * *Node: Edit Fields (manual)*\n  * **What happens:**\n    You paste the URL of the specific Superuser Q\\&A forum post you want to analyze. No coding or technical setup—just copy and paste!\n\n**🟢 Why this is great for beginners:**\nYou only need to provide the link and click a button. No scripts, no complex setup.\n',
			{ color: 5, position: [-500, -580], width: 420, height: 720 },
		),
	)
	.add(
		sticky(
			'## 3️⃣ **Section 3: Share Insights with Your Team**\n\n* **✉️ Send Insights to Product Team**\n\n  * *Node: Gmail (send: message)*\n  * **What happens:**\n    The final, cleaned, and structured insights are sent as an email to your Product Team. This means the right people get the right information at the right time—automatically.\n\n**🟢 Why this is great for beginners:**\nNo more compiling or sending emails yourself! The system takes care of communicating findings—saving time and ensuring nothing is forgotten.\n\n',
			{ name: 'Sticky Note1', color: 6, position: [480, -520], width: 340, height: 680 },
		),
	)
	.add(
		sticky(
			'## 2️⃣ **Section 2: AI Agent Scrapes & Analyzes**\n\n* **🤖 Agent: Extract Forum Insights**\n\n  * *Node: AI Agent*\n\n  This is where all the magic happens! The AI agent coordinates a team of tools to read the forum post, pick out the most important details, and structure everything perfectly.\n\n  **Sub-nodes powering the agent:**\n\n  * **🧠 Chat Model Reasoning**\n    *Node: OpenAI Chat Model*\n    — Understands what you want and plans the scraping/analysis logic.\n  * **🌐 Web Scraper Tool (scrape\\_as\\_markdown)**\n    *Node: MCP Client (executeTool)*\n    — Securely visits the forum page and fetches the Q\\&A content in a readable format.\n  * **📦 Format Forum Data as JSON**\n    *Node: Structured Output Parser*\n    — Transforms messy forum data into a well-structured JSON object including:\n\n    * Platform name\n    * Author name\n    * Question\n    * Answer snippet\n    * Link\n    * **Identified customer pain points!**\n\n**🟢 Why this is great for beginners:**\nYou don’t have to read, sort, or copy any forum data. The agent does everything: reading, understanding, summarizing, and structuring—just like a human analyst, but automated!\n\n',
			{ name: 'Sticky Note2', color: 2, position: [-20, -940], width: 460, height: 1080 },
		),
	)
	.add(
		sticky(
			'## I’ll receive a tiny commission if you join Bright Data through this link—thanks for fueling more free content!\n\n### https://get.brightdata.com/1tndi4600b25',
			{ name: 'Sticky Note5', color: 7, position: [860, -520], width: 380, height: 240 },
		),
	)
	.add(
		sticky(
			'=======================================\n            WORKFLOW ASSISTANCE\n=======================================\nFor any questions or support, please contact:\n    Yaron@nofluff.online\n\nExplore more tips and tutorials here:\n   - YouTube: https://www.youtube.com/@YaronBeen/videos\n   - LinkedIn: https://www.linkedin.com/in/yaronbeen/\n=======================================\n',
			{ name: 'Sticky Note9', color: 4, position: [-2580, -1320], width: 1300, height: 320 },
		),
	)
	.add(
		sticky(
			'# 🚀 Monitor Customer Support Forums\n\n### Instantly turn forum questions about OpenAI into actionable product insights—delivered right to your Product Team’s inbox!\n\n---\n\n## 1️⃣ **Section 1: Start & Input**\n\n* **🚦 Start Workflow (Manual Trigger)**\n\n  * *Node: When clicking ‘Execute workflow’*\n  * **What happens:**\n    You begin the automation by clicking the "Execute workflow" button in n8n. This makes the process fully manual and secure—you decide when to run it.\n\n* **🔗 Enter Forum URL**\n\n  * *Node: Edit Fields (manual)*\n  * **What happens:**\n    You paste the URL of the specific Superuser Q\\&A forum post you want to analyze. No coding or technical setup—just copy and paste!\n\n**🟢 Why this is great for beginners:**\nYou only need to provide the link and click a button. No scripts, no complex setup.\n\n---\n\n## 2️⃣ **Section 2: AI Agent Scrapes & Analyzes**\n\n* **🤖 Agent: Extract Forum Insights**\n\n  * *Node: AI Agent*\n\n  This is where all the magic happens! The AI agent coordinates a team of tools to read the forum post, pick out the most important details, and structure everything perfectly.\n\n  **Sub-nodes powering the agent:**\n\n  * **🧠 Chat Model Reasoning**\n    *Node: OpenAI Chat Model*\n    — Understands what you want and plans the scraping/analysis logic.\n  * **🌐 Web Scraper Tool (scrape\\_as\\_markdown)**\n    *Node: MCP Client (executeTool)*\n    — Securely visits the forum page and fetches the Q\\&A content in a readable format.\n  * **📦 Format Forum Data as JSON**\n    *Node: Structured Output Parser*\n    — Transforms messy forum data into a well-structured JSON object including:\n\n    * Platform name\n    * Author name\n    * Question\n    * Answer snippet\n    * Link\n    * **Identified customer pain points!**\n\n**🟢 Why this is great for beginners:**\nYou don’t have to read, sort, or copy any forum data. The agent does everything: reading, understanding, summarizing, and structuring—just like a human analyst, but automated!\n\n---\n\n## 3️⃣ **Section 3: Share Insights with Your Team**\n\n* **✉️ Send Insights to Product Team**\n\n  * *Node: Gmail (send: message)*\n  * **What happens:**\n    The final, cleaned, and structured insights are sent as an email to your Product Team. This means the right people get the right information at the right time—automatically.\n\n**🟢 Why this is great for beginners:**\nNo more compiling or sending emails yourself! The system takes care of communicating findings—saving time and ensuring nothing is forgotten.\n\n---\n\n## 🌟 **How Beginners Can Use This Workflow**\n\n| Step                | What to Do                                     | What Happens                                               |\n| ------------------- | ---------------------------------------------- | ---------------------------------------------------------- |\n| 🚦 Start            | Click **Execute workflow** in n8n              | The automation begins                                      |\n| 🔗 Input URL        | Paste a Superuser Q\\&A forum link about OpenAI | The workflow targets this exact forum question             |\n| 🤖 AI Agent Scrapes | (You wait for a moment)                        | The AI extracts question, answer, author, pain points…     |\n| ✉️ Receive Insights | (No action needed)                             | An email with all structured insights is sent to your team |\n\n---\n\n## 💡 **Benefits**\n\n* 🕐 **Save Hours:** No manual copying or summarizing forum content\n* 📊 **Actionable Insights:** Quickly see customer pain points for product improvement\n* 📧 **Automated Communication:** Ensure your team never misses key feedback\n* 🧑‍💻 **Zero Coding:** Designed for anyone—no technical experience needed\n\n\n',
			{ name: 'Sticky Note3', color: 4, position: [-2580, -980], width: 1300, height: 1880 },
		),
	);
