const wf = workflow(
	'J2D0BssoDmn4BC6D',
	'AI Customer-Support Assistant · WhatsApp Ready · Works for Any Business',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.whatsAppTrigger',
			version: 1,
			config: {
				parameters: { updates: ['messages'] },
				credentials: {
					whatsAppTriggerApi: { id: 'credential-id', name: 'whatsAppTriggerApi Credential' },
				},
				position: [-260, 140],
				name: 'WhatsApp Trigger',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '={{ $json.messages[0].text.body }}',
					options: {
						maxIterations: 10,
						systemMessage:
							'=You are [Company Name]’s real-time website assistant for https://www.your-company-url.com.\n\nAVAILABLE TOOLS\n• list_links(url) → { urls:[ … ] }  — returns up to 100 internal links from that page  \n• get_page(url)   → { text:"…" }    — returns the visible, tag-free text of the page (JavaScript rendered if needed)\n\nSEARCH STRATEGY\n1. Start with list_links on the root page.  \n2. Pick ≤ 5 links whose URL or anchor text best match the user’s question (producto, pago, envío, servicio, política, etc.).  \n3. For each chosen link call get_page once.  \n4. Read the returned text and look for the answer.  \n5. If the answer is still unknown, you may repeat steps 1-4 one level deeper.  \n6. Stop after two list_links rounds **or** eight get_page calls (whichever comes first).\n\nANSWER RULES\n• Reply in clear and friendly toon **as part of [Company Name]** (use “we”, “our”).  \n• Keep answers concise but complete.  \n• **No Markdown ni símbolos de formato. Nunca uses \\*, **, \\_, \\~, ni [texto](url).**  \n  Write urls like: Descriptive Text ␣URL   Ej.: Combos https://…  \n• Quote the exact wording for facts such as stock status, prices, envíos, métodos de pago, garantías o políticas.  \n• If the information is not on the site, reply exactly:  \n  “I can\'t find that information on our site right now. Do you want me to put you through to a human agent?”  \n• Stay on-domain; ignore mailto:, tel:, javascript:, or off-site links.\n• Finally, if any of the tools returns a status code 404, then reply:\n"Non-subscribed user."',
						returnIntermediateSteps: true,
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
							version: 1.1,
							config: {
								parameters: {
									url: 'https://lemolex.app.n8n.cloud/webhook/get_text',
									method: 'POST',
									sendBody: true,
									parametersBody: {
										values: [
											{ name: 'url' },
											{
												name: 'auth-token',
												value: 'your-auth-token (read setup guide)',
												valueProvider: 'fieldValue',
											},
										],
									},
									toolDescription:
										'Fetches the fully-rendered **plain text** of a single web.  \n• Input  : { "url": "<absolute https://…>" }  \n• Auth   : token is sent as HTTP basic-auth.  \n• Query  : url=<encoded url>  \n• Output : { "text": "<visible text of the body>", "url": "<same url>" }  \n• The "text" field already has **all HTML tags removed** .  \n• Use this tool whenever you need the actual words that appear on the page—product details, prices, stock lines, shipping terms, payment options, company policies, etc.  \n• Do **not** call it on off-site links or mailto:/tel:/javascript: pseudo-links.  \n',
								},
								name: 'get_page',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
							version: 1.1,
							config: {
								parameters: {
									url: 'https://lemolex.app.n8n.cloud/webhook/list-links',
									method: 'POST',
									sendBody: true,
									parametersBody: {
										values: [
											{
												name: 'url',
												value: 'https://www.your-company-url.com',
												valueProvider: 'fieldValue',
											},
											{
												name: 'auth-token',
												value: 'your-auth-token (read setup guide)',
												valueProvider: 'fieldValue',
											},
										],
									},
									toolDescription:
										'Returns up to 100 unique, fully-qualified INTERNAL links for a given page.\n\nInput  (JSON body the model must supply)\n  {\n    "url": "<absolute https://…>"\n  }\n\nBehaviour\n  • Crawls only the domain of the input URL.\n  • Converts relative <a href> values to absolute URLs.\n  • Drops empty roots ("/"), mailto:, tel:, javascript:, and off-site links.\n  • De-duplicates the list.\n  • Responds with a JSON object:\n\n      {\n        "urls": [ "<link-1>", "<link-2>", … ]\n      }\n\nUse this tool when you need a navigation map of the current page.\nPass one of the returned URLs back into other tools (e.g. get_text) to read its content.\n',
								},
								name: 'list_links',
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
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
						version: 1.3,
						config: {
							parameters: {
								tableName: 'message_history',
								sessionKey: '={{ $json.contacts[0].wa_id }}',
								sessionIdType: 'customKey',
							},
							credentials: {
								postgres: { id: 'credential-id', name: 'postgres Credential' },
							},
							name: 'Postgres Users Memory',
						},
					}),
				},
				position: [120, 140],
				name: 'AI Agent',
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
						"// within24h?  – run once per item\n// Meta (WhatsApp) timestamp arrives as seconds since epoch\nconst lastTs = Number($('WhatsApp Trigger').first().json.messages[0].timestamp) * 1000;   // → ms\nconst withinWindow = Date.now() - lastTs < 24 * 60 * 60 * 1000;\n\nreturn [{ json: { withinWindow, answer: $json.answer, userId: $json.userId } }];",
				},
				position: [520, 140],
				name: '24-hour window check',
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
								id: 'd33e218e-a49a-49ed-9c6b-55b9ea0b0dbb',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: '={{ $json.withinWindow }}',
								rightValue: '',
							},
						],
					},
				},
				position: [740, 140],
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
						"// cleanAnswer – run once per item\nlet txt = $('AI Agent').first().json.output || '';\n\n// 1. Remove bold / italic / strike markers\ntxt = txt.replace(/[*_~]+/g, '');\n\n// 2. Convert [Texto](https://url) → Texto https://url\ntxt = txt.replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)/g, '$1 $2');\n\n// 3. Collapse 3+ blank lines\ntxt = txt.replace(/\\n{3,}/g, '\\n\\n').trim();\n\nreturn [{ json: { answer: txt } }];\n",
				},
				position: [1040, 120],
				name: 'cleanAnswer',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.whatsApp',
			version: 1,
			config: {
				parameters: {
					textBody: '={{ $json.answer }}',
					operation: 'send',
					phoneNumberId: '679436108574898',
					requestOptions: {},
					additionalFields: {},
					recipientPhoneNumber: "={{ $('WhatsApp Trigger').item.json.contacts[0].wa_id }}",
				},
				credentials: {
					whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
				},
				position: [1260, 120],
				name: "Send AI Agent's Answer",
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.whatsApp',
			version: 1,
			config: {
				parameters: {
					template: 'hello_world|en_US',
					phoneNumberId: '679436108574898',
					requestOptions: {},
					recipientPhoneNumber: "={{ $('WhatsApp Trigger').item.json.contacts[0].wa_id }}",
				},
				credentials: {
					whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
				},
				position: [1060, 360],
				name: 'Send Pre-approved Template Message to Reopen the Conversation',
			},
		}),
	)
	.add(
		sticky(
			'# Step by Step Setup Guide\n\n### **The technology that powers this AI Agent—continuously crawling, extracting, and generating answers—incurs real operating costs to stay online.**\n### **That’s why the workflow requires an active membership, priced at only **\\$29 per month**. Comparable AI-support platforms charge **\\$150 – \\$500 each month**, so with this template you either save a large chunk of that expense for your own business or earn the same amount by reselling the chatbot to clients—while paying just \\$29 yourself. *And because the bot pulls fresh information from the site in real time, you never have to “re-train” a model, saving you even more time and money.***\n\n **Activate your membership here:** [https://lemolex.gumroad.com/l/ejsnx](https://lemolex.gumroad.com/l/ejsnx)\n\n### Let\'s start setting this up step by step:\n*Total hands-on time: ≈ 15 minutes*\n\n1. Activate the tools with the membership generated key: \n- Go to the membership link to get your key.\n- Copy the key (e.g 6F0E4C97-B72A4E69-A11BF6C4-AF123456) and paste it in the body parameters of list_links and get_page (tools):\n*Name: auth-token*\n*Value:  6F0E4C97-B72A4E69-A11BF6C4-AF123456* **(example)**\n\n2. Customize for Your Company:\n- Copy the Root URL of your company\'s website (Home Page).\n- Open the AI Agent node and inside the `System Message`, change the following values:\n[Company Name] with your company name (e.g [Company Name] -> Facebook)\n[https://www.your-company-url.com] with your company Root URL that you copied before.\nCheck for these 2 values along the entire text.\n- Go back to the tools list_links and get_page and paste the Root URL inside the body parameters, specifically:\n*Name: url*\n*Value: https://www.your-company-url.com **(e.g https://www.facebook.com)**\n\n3. Connect your credentials:\n- Go to the OpenAI Chat Model node and connect your OpenAI credentials.\n- Go to the Postgres Users Memory node and connect your Supabase credentials. A tutorial for this: https://youtu.be/6w5f_jsPYSQ?si=MPdXYUjxv3fghQPj&t=105 (Minute 1:45 to 5:00)\n- Go to the WhatsApp nodes "WhatsApp Trigger", "Send Pre-approved Template Message to Reopen the Conversation" and "Send AI Agent\'s Answer" to connect your credentials. A tutorial for this: https://youtu.be/ZrhTQle55LQ?si=MO_leooogO9KchCV\n- Go to the "Send Pre-approved Template Message to Reopen the Conversation" and select the template message under the "Template" parameter.\n***If you don\'t want to use this feature (not recommended) delete the nodes "24-hour window check", "If" and "Send Pre-approved Template Message to Reopen the Conversation". Then connect the AI Agent node to the "cleanAnswer" node.***\n\n\n### **You are ready**',
			{ position: [-920, -320], width: 460, height: 1460 },
		),
	);
