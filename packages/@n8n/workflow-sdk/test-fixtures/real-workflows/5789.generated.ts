const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.gmailTrigger',
			version: 1.2,
			config: {
				parameters: {
					simple: false,
					filters: {},
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [-220, 1560],
				name: 'Gmail Trigger',
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
								id: '6d582588-255e-4113-9811-3046c8f9861c',
								name: 'discord_channel',
								type: 'string',
								value: '=1234567894',
							},
							{
								id: 'f69cbf07-eb5c-4987-bdb1-bc7e851ac68b',
								name: 'email',
								type: 'string',
								value: 'user@example.com',
							},
						],
					},
				},
				position: [-20, 1560],
				name: 'medium7',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.1,
			config: {
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
				},
				position: [380, 1600],
				name: 'Merge4',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "=sender_email: {{ $json.from.text }}\nrecipient_email: {{ $json.to.text }}\nSubject: {{ $('Merge4').item.json.subject }}\nGmail labels: {{ $json.labelIds }}\nContent: {{ $('Merge4').item.json.text }}",
					options: {
						systemMessage:
							'You are an AI agent in an n8n workflow. You receive raw email objects with the following fields:  \n– `sender_email`  \n– `recipient_email`  \n– `subject`  \n– `content` (plain text)  \n– `labels` (Gmail labels)  \n– Optional: `image_url` (URL to image in email), `action_url` (main link to external content)\n\nYou also have access to a tool called `getSpamList()` which returns a list of sender emails and domains previously labeled as spam or legit.\n\n**Instructions:**\n\n1. **Classify as “Spam”** if any of the following are true:  \n   – The sender_email or its domain matches common spam sources (e.g., "no-reply@", "offers@", mass mailers, suspicious domains).  \n   – The content contains characteristics of spam: promotional offers, phishing attempts, irrelevant ads, mass marketing, or unsolicited content not relevant to the user or organization.  \n   – The sender_email or domain appears in the retrieved spam list.\n\n   If spam, return only:\n   ```json\n   {\n     "priority": "Spam"\n   }\nEnd execution.\n\nIf not spam, determine priority:\n– High: Time-sensitive emails from clients, leadership, legal, finance, or regarding contracts, deadlines, critical system issues, urgent decisions, or high-value opportunities.\n– Medium: Informative updates, meeting invites, team announcements, project updates, customer support, or internal collaboration threads that are useful but not urgent.\n– Low: Casual internal communication, newsletters, generic notifications, non-urgent follow-ups, or general FYI content.\n\nSummarize the email within 250 characters, include all key important information and numbers.\n\nPriority color mapping:\n– High: #00FF00\n– Medium: #0000FF\n– Low: #FF00000\n\nAlso include the image_url in the output if you find any relevant or important image url in the content. also include the action_url if you find any important url for the user to click',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.googleSheetsTool',
							version: 4.5,
							config: {
								parameters: {
									options: {},
									sheetName: {
										__rl: true,
										mode: 'list',
										value: 'gid=0',
										cachedResultUrl: '',
										cachedResultName: 'list',
									},
									documentId: {
										__rl: true,
										mode: 'list',
										value: '1iOYH829GJ-ytTlmz0Zsl875Efn1qyrwuv6Rx83N1QJU',
										cachedResultUrl: '',
										cachedResultName: 'Email spam list',
									},
									descriptionType: 'manual',
									toolDescription:
										'Get row(s) in sheet in email spam list Google Sheets. It contains a list of emails that are considered spam and legit.',
								},
								credentials: {
									googleSheetsOAuth2Api: {
										id: 'credential-id',
										name: 'googleSheetsOAuth2Api Credential',
									},
								},
								name: 'Get spam list1',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4o-mini',
									cachedResultName: 'gpt-4o-mini',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model3',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n  "from": "user@example.com",\n  "to": "user@example.com",\n  "subject": "Urgent: Contract Finalization by Tomorrow",\n  "summary": "The CEO is requesting immediate action to finalize and sign the strategic partnership contract before tomorrow\'s deadline.",\n  "priority": "High",\n  "priority_color": 16711680,\n  "image_url" : "",\n  "action_url" : ""\n}\n',
							},
							name: 'Structured Output Parser1',
						},
					}),
				},
				position: [600, 1600],
				name: 'AI Agent2',
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
								id: 'd8cf81aa-1b7c-4a54-87f0-2f86655c5875',
								operator: { type: 'object', operation: 'notEmpty', singleValue: true },
								leftValue: '={{$json.output}}',
								rightValue: 'Spam',
							},
							{
								id: '81703823-b378-4831-ace1-5242d45e7c41',
								operator: { type: 'string', operation: 'notEquals' },
								leftValue: '={{$json.output.priority}}',
								rightValue: 'Spam',
							},
						],
					},
				},
				position: [900, 1600],
				name: 'If2',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.discord',
			version: 2,
			config: {
				parameters: {
					embeds: {
						values: [
							{
								url: '={{ $json.output.action_url }}',
								color: '={{ $json.output.priority_color }}',
								image: '={{ $json.output.image_url }}',
								title: '={{ $json.output.subject }}',
								author: '={{ $json.output.from }}',
								description: '={{ $json.output.summary }}',
							},
						],
					},
					guildId: { __rl: true, mode: 'list', value: '1363069056558825554' },
					options: {},
					resource: 'message',
					channelId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Merge4').item.json.discord_channel }}",
					},
					authentication: 'oAuth2',
				},
				credentials: {
					discordOAuth2Api: { id: 'credential-id', name: 'discordOAuth2Api Credential' },
				},
				position: [1160, 1580],
				name: 'Send a message',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.gmailTrigger',
			version: 1.2,
			config: {
				parameters: {
					simple: false,
					filters: {},
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [-200, 1860],
				name: 'Gmail Trigger1',
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
								id: '6d582588-255e-4113-9811-3046c8f9861c',
								name: 'discord_channel',
								type: 'string',
								value: '=1234567893',
							},
							{
								id: 'f69cbf07-eb5c-4987-bdb1-bc7e851ac68b',
								name: 'email',
								type: 'string',
								value: 'user@example.com',
							},
						],
					},
				},
				position: [-20, 1860],
				name: 'medium6',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.gmailTrigger',
			version: 1.2,
			config: {
				parameters: {
					simple: false,
					filters: {},
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [-200, 2400],
				name: 'Gmail Trigger2',
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
								id: '6d582588-255e-4113-9811-3046c8f9861c',
								name: 'discord_channel',
								type: 'string',
								value: '=1234567892',
							},
							{
								id: 'f69cbf07-eb5c-4987-bdb1-bc7e851ac68b',
								name: 'email',
								type: 'string',
								value: 'user@example.com',
							},
						],
					},
				},
				position: [0, 2400],
				name: 'medium5',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.gmailTrigger',
			version: 1.2,
			config: {
				parameters: {
					simple: false,
					filters: {},
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [-200, 2140],
				name: 'Gmail Trigger3',
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
								id: '6d582588-255e-4113-9811-3046c8f9861c',
								name: 'discord_channel',
								type: 'string',
								value: '=1234567891',
							},
							{
								id: 'f69cbf07-eb5c-4987-bdb1-bc7e851ac68b',
								name: 'email',
								type: 'string',
								value: 'user@example.com',
							},
						],
					},
				},
				position: [0, 2140],
				name: 'medium4',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: { path: 'email-feedback', options: {}, httpMethod: 'POST' },
				position: [360, 2160],
				name: 'Webhook',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "=User Input : {{ $('Webhook').item.json.body.content.text }}\n\nReference discord message: {{ JSON.stringify($json.body.original_message.reference) }}",
					options: {
						systemMessage:
							'You are an AI agent running inside an n8n workflow.\nYou have three tools available:\n• getDiscordMessage(reference) – retrieves a Discord message when given a valid reference object\n• getSpamList() – retrieves the current list of spam emails and domains from Google Sheets\n• updateSpamList(columns) – appends or updates a row in the “Email spam list” sheet with the given columns\n\nBehavior:\n\nIf the user’s input indicates they want to classify an email (e.g. “spam” or “legit”):\na. If a valid reference object is provided, invoke getDiscordMessage(reference).\nb. Invoke getSpamList().\nc. Determine sender_email and domain from the retrieved message.\nd. Compare against the spam list to decide “spam” or “legit.”\ne. Invoke updateSpamList({email: sender_email, domain: domain, Classification: classification }).\nf. Respond with the classification result and if the list has been updated successfully\n\nIf the user’s input does not refer to classifying an email, do not call any tool; respond directly to the user’s inquiry. Remind the user that this tool is most affective when the user refers to a message to classify. ',
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.googleSheetsTool',
							version: 4.5,
							config: {
								parameters: {
									options: {},
									sheetName: {
										__rl: true,
										mode: 'list',
										value: 'gid=0',
										cachedResultUrl: '',
										cachedResultName: 'list',
									},
									documentId: {
										__rl: true,
										mode: 'list',
										value: '1iOYH829GJ-ytTlmz0Zsl875Efn1qyrwuv6Rx83N1QJU',
										cachedResultUrl: '',
										cachedResultName: 'Email spam list',
									},
									descriptionType: 'manual',
									toolDescription:
										'Get row(s) in sheet in email spam list Google Sheets. It contains a list of emails that are considered spam and legit.',
								},
								credentials: {
									googleSheetsOAuth2Api: {
										id: 'credential-id',
										name: 'googleSheetsOAuth2Api Credential',
									},
								},
								name: 'Get spam list',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleSheetsTool',
							version: 4.5,
							config: {
								parameters: {
									columns: {
										value: {
											email:
												"={{ $fromAI('sender_email', 'email of the sender that wants to be labelled') }}",
											domain:
												"={{ $fromAI('domain', 'domain name of the sender that wants to be labelled') }}",
											labelled_by: 'n8n',
											labelled_date: "={{ $now.format('dd/MM/yyyy') }}",
											Classification:
												"={{ $fromAI('classification', 'classigfication of the email whether spam or legit') }}",
										},
										schema: [
											{
												id: 'domain',
												type: 'string',
												display: true,
												required: false,
												displayName: 'domain',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'email',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'email',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Classification',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Classification',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'labelled_by',
												type: 'string',
												display: true,
												required: false,
												displayName: 'labelled_by',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'labelled_date',
												type: 'string',
												display: true,
												required: false,
												displayName: 'labelled_date',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'defineBelow',
										matchingColumns: ['email'],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
									options: {},
									operation: 'appendOrUpdate',
									sheetName: {
										__rl: true,
										mode: 'list',
										value: 'gid=0',
										cachedResultUrl: '',
										cachedResultName: 'list',
									},
									documentId: {
										__rl: true,
										mode: 'list',
										value: '1iOYH829GJ-ytTlmz0Zsl875Efn1qyrwuv6Rx83N1QJU',
										cachedResultUrl: '',
										cachedResultName: 'Email spam list',
									},
									descriptionType: 'manual',
									toolDescription:
										'Update row(s) in sheet in email spam list Google Sheets. It can update or add a row of email, domain of the sender that is considered spam and legit.',
								},
								credentials: {
									googleSheetsOAuth2Api: {
										id: 'credential-id',
										name: 'googleSheetsOAuth2Api Credential',
									},
								},
								name: 'update spam list',
							},
						}),
						tool({
							type: 'n8n-nodes-base.discordTool',
							version: 2,
							config: {
								parameters: {
									guildId: {
										__rl: true,
										mode: 'id',
										value: "={{ $fromAI('guildId', 'guildId of the discord reference message') }}",
									},
									options: {},
									resource: 'message',
									channelId: {
										__rl: true,
										mode: 'id',
										value:
											"={{ $fromAI('channelId', 'channelId of the discord reference message') }}",
									},
									messageId:
										"={{ $fromAI('messageId', 'messageId of the discord reference message') }}",
									operation: 'get',
									authentication: 'oAuth2',
								},
								credentials: {
									discordOAuth2Api: { id: 'credential-id', name: 'discordOAuth2Api Credential' },
								},
								name: 'Get a message in Discord',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4o-mini',
									cachedResultName: 'gpt-4o-mini',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model1',
						},
					}),
				},
				position: [580, 2160],
				name: 'AI Agent1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.discord',
			version: 2,
			config: {
				parameters: {
					embeds: {
						values: [
							{
								color: '#FFD900',
								author: 'Email Feedback Bot',
								description: '={{ $json.output }}',
							},
						],
					},
					content: '=',
					guildId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Webhook').item.json.body.guild.id }}",
					},
					options: {},
					resource: 'message',
					channelId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Webhook').item.json.body.channel.id }}",
					},
					authentication: 'oAuth2',
				},
				credentials: {
					discordOAuth2Api: { id: 'credential-id', name: 'discordOAuth2Api Credential' },
				},
				position: [900, 2160],
				name: 'Discord - reply1',
			},
		}),
	)
	.add(
		sticky('## account1@gmail.com\n', {
			name: 'Sticky Note2',
			color: 4,
			position: [-300, 1480],
			width: 460,
			height: 280,
		}),
	)
	.add(
		sticky('## account2@gmail.com\n\n', {
			color: 6,
			position: [-300, 1780],
			width: 460,
			height: 280,
		}),
	)
	.add(
		sticky('## account4@gmail.com\n\n', {
			name: 'Sticky Note1',
			color: 5,
			position: [-300, 2340],
			width: 460,
			height: 240,
		}),
	)
	.add(
		sticky('## account3@gmail.com\n\n', {
			name: 'Sticky Note3',
			color: 3,
			position: [-300, 2080],
			width: 460,
			height: 240,
		}),
	)
	.add(
		sticky('## Update spam list', {
			name: 'Sticky Note4',
			color: 7,
			position: [280, 2080],
			width: 1060,
			height: 500,
		}),
	)
	.add(
		sticky('## Filter incoming message\n### Send important emails only', {
			name: 'Sticky Note5',
			color: 7,
			position: [280, 1480],
			width: 1060,
			height: 580,
		}),
	);
