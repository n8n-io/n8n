const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [880, 208],
				name: 'Listen for incoming events',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.2,
			config: {
				parameters: {
					fields: {
						values: [
							{
								name: 'text',
								stringValue: '={{ $json?.message?.text || "" }}',
							},
						],
					},
					options: {},
				},
				position: [1104, 208],
				name: 'Voice or Text',
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
								id: 'a0bf9719-4272-46f6-ab3b-eda6f7b44fd8',
								operator: { type: 'string', operation: 'empty', singleValue: true },
								leftValue: '={{ $json.message.text }}',
								rightValue: '',
							},
						],
					},
				},
				position: [1328, 208],
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.1,
			config: {
				parameters: {
					fileId: "={{ $('Listen for incoming events').item.json.message.voice.file_id }}",
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1552, 128],
				name: 'Get Voice File',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: { options: {}, resource: 'audio', operation: 'transcribe' },
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1872, 128],
				name: 'Transcribe a recording',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.6,
			config: {
				parameters: {
					text: '={{ $json.text }}',
					options: {
						systemMessage:
							"=You are a helpful personal assistant called Jackie. \n\nToday's date is {{ $today.format('yyyy-MM-dd') }}.\n\nGuidelines:\n- When summarizing emails, include Sender, Message date, subject, and brief summary of email.\n- if the user did not specify a date in the request assume they are asking for today\n- When answering questions about calendar events, filter out events that don't apply to the question.  For example, the question is about events for today, only reply with events for today. Don't mention future events if it's more than 1 week away\n- When creating calendar entry, the attendee email is optional",
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.gmailTool',
							version: 2.1,
							config: {
								parameters: {
									limit: 20,
									filters: {
										labelIds: ['INBOX'],
										readStatus: 'unread',
										receivedAfter:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Received_After', ``, 'string') }}",
										receivedBefore:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Received_Before', ``, 'string') }}",
									},
									operation: 'getAll',
								},
								credentials: {
									gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
								},
								name: 'Get Email',
							},
						}),
						tool({
							type: 'n8n-nodes-base.gmailTool',
							version: 2.1,
							config: {
								parameters: {
									sendTo:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('To', ``, 'string') }}",
									message:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Message', `Please format this nicely in html`, 'string') }}",
									options: { appendAttribution: false },
									subject:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Subject', ``, 'string') }}",
								},
								credentials: {
									gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
								},
								name: 'Send Email',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.1,
							config: {
								parameters: {
									options: {
										fields: '=items(summary, start(dateTime))',
										timeMax:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Before', ``, 'string') }}",
										timeMin:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('After', ``, 'string') }}",
									},
									calendar: { __rl: true, mode: 'id', value: '=<insert email here>' },
									operation: 'getAll',
								},
								credentials: {
									googleCalendarOAuth2Api: {
										id: 'credential-id',
										name: 'googleCalendarOAuth2Api Credential',
									},
								},
								name: 'Google Calendar',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleTasksTool',
							version: 1,
							config: {
								parameters: {
									task: 'MTY1MTc5NzMxMzA5NDc5MTQ5NzQ6MDow',
									title:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Title', ``, 'string') }}",
									additionalFields: {},
								},
								credentials: {
									googleTasksOAuth2Api: {
										id: 'credential-id',
										name: 'googleTasksOAuth2Api Credential',
									},
								},
								name: 'Create a task in Google Tasks',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleTasksTool',
							version: 1,
							config: {
								parameters: {
									task: 'MTY1MTc5NzMxMzA5NDc5MTQ5NzQ6MDow',
									operation: 'getAll',
									additionalFields: {},
								},
								credentials: {
									googleTasksOAuth2Api: {
										id: 'credential-id',
										name: 'googleTasksOAuth2Api Credential',
									},
								},
								name: 'Get many tasks in Google Tasks',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
						version: 1,
						config: {
							parameters: { options: {} },
							credentials: {
								openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
							},
							name: 'OpenRouter',
						},
					}),
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.2,
						config: {
							parameters: {
								sessionKey: "={{ $('Listen for incoming events').first().json.message.from.id }}",
								sessionIdType: 'customKey',
							},
							name: 'Window Buffer Memory',
						},
					}),
				},
				position: [2224, 192],
				name: 'Jackie, AI Assistant 👩🏻‍🏫',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.1,
			config: {
				parameters: {
					text: '={{ $json.output }}',
					chatId: "={{ $('Listen for incoming events').first().json.message.from.id }}",
					additionalFields: { parse_mode: 'Markdown', appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [2688, 192],
			},
		}),
	)
	.add(
		sticky('## Process Telegram Request\n', {
			color: 7,
			position: [1072, 96],
			width: 624,
			height: 279,
		}),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n1. [In OpenRouter](https://openrouter.ai/settings/keys) click **“Create API key”** and copy it.\n\n2. Open the ```OpenRouter``` node:\n   * **Select Credential → Create New**\n   * Paste into **API Key** and **Save**\n',
			{ name: 'Sticky Note1', color: 3, position: [1584, 512], width: 294, height: 316 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\nThis node helps your agent remember the last few messages to stay on topic.',
			{ name: 'Sticky Note15', color: 7, position: [1904, 512], width: 308, height: 260 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nThis node allows your agent create and get tasks from Google Tasks\n',
			{ name: 'Sticky Note16', color: 7, position: [2240, 512], width: 484, height: 260 },
		),
	)
	.add(
		sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\nThis node allows your agent access your gmail\n', {
			name: 'Sticky Note18',
			color: 7,
			position: [2752, 512],
			width: 308,
			height: 260,
		}),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\nThis node allows your agent access your Google calendar\n',
			{ name: 'Sticky Note19', color: 7, position: [3088, 512], width: 404, height: 260 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nUses OpenAI to convert voice to text.\n[In OpenAI](https://platform.openai.com/api-keys) click **“Create new secret key”** and copy it.',
			{ name: 'Sticky Note20', color: 7, position: [1760, 96], width: 324, height: 276 },
		),
	)
	.add(
		sticky(
			'Caylee, your peronal AI Assistant:\n1. Get email\n2. Check calendar\n3. Get and create to-do tasks \n\nEdit the **System Message** to adjust your agent’s thinking, behavior, and replies.\n\n\n\n\n\n\n\n\n\n\n',
			{ name: 'Sticky Note13', color: 7, position: [2144, 0], width: 396, height: 380 },
		),
	)
	.add(
		sticky(
			'# Try It Out!\n\nLaunch Jackie—your personal AI assistant that handles voice & text via Telegram to manage your digital life.\n\n**To get started:**\n\n1. **Connect all credentials** (Telegram, OpenAI, Gmail, etc.)\n2. **Activate the workflow** and message your Telegram bot:\n   • "What emails do I have today?"\n   • "Show me my calendar for tomorrow"\n   • "Craete new to-do item"\n   • 🎤 Send voice messages for hands-free interaction\n\n## Questions or Need Help?\n\nFor setup assistance, customization, or workflow support, join my Skool community!\n\n### [AI Automation Engineering Community](https://www.skool.com/ai-automation-engineering-3014)\n\nHappy learning! -- Derek Cheung\n',
			{ name: 'Sticky Note3', color: 4, position: [368, -32], width: 460, height: 568 },
		),
	)
	.add(
		sticky('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nSend message back to Telegram\n', {
			name: 'Sticky Note4',
			color: 7,
			position: [2592, 96],
			width: 304,
			height: 288,
		}),
	)
	.add(
		sticky('## [Video Tutorial](https://youtu.be/ROgf5dVqYPQ)\n@[youtube](ROgf5dVqYPQ)', {
			name: 'Sticky Note2',
			color: 7,
			position: [2944, -16],
			width: 544,
			height: 400,
		}),
	);
