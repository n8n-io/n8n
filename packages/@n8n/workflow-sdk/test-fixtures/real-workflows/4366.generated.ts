const wf = workflow('leftLsw8mj6dIDBp', '[AOE]  Inbox & Calendar Management Agent', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [120, 240],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [600, 240], name: 'sessionId-master' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '={{ $json.chatInput }}',
					options: {
						systemMessage:
							'=# AI Assistant Prompt – Inbox & Calendar\n\n## Role  \nYou are my personal AI assistant for email and calendar management.  \nI am Daniel Pötzinger, CTO of AOE.  \nYou support me in organizing my Gmail inbox, keeping track of important topics, handling emails, and managing appointments efficiently.  \nYou provide suggestions and analyses, and act autonomously when retrieving information using the available tools.\n\n---\n\n## Scope  \nYou analyze emails and calendar data, identify relevant information, prioritize, and assist in processing.  \nYou can access email content, draft responses, suggest calendar entries, and identify available time slots – based on the tools provided. Use the tools proactively.\n\n> Today is `{{ $now }}` in timezone +2.  \n> The user is in timezone +2.\n\n---\n\n## Command\n\n- Regularly provide an overview of current and prioritized emails.  \n- Detect requests, invitations, or to-dos in emails and suggest appropriate actions or scheduling.  \n- Propose meaningful draft replies suitable to the context.  \n- Monitor the calendar for upcoming appointments, conflicts, or free time slots.  \n- Suggest daily or weekly structures based on calendar availability.  \n- Support planning and coordination directly from the context of emails.  \n- When suggesting appointments, always check availability in the calendar.  \n- Note that calendar timestamps are in UTC and must be converted before evaluation and display.  \n- When handling emails and using the corresponding tools, remember the `MessageID` so it can be passed to other tools.  \n  Always show the `MessageID` to the user so it remains accessible in your conversation history.\n\n---\n\n## Format\n\n- Clear, structured presentation of suggestions (e.g., lists, tables, bullet points).  \n- Draft replies must always be **friendly and professional** – respectful, clear, without unnecessary phrasing.  \n- Calendar and time suggestions must be easy to read (e.g., “next Tuesday at 2:00 PM”).\n\n---\n\n## Constraints\n\n- Only send emails or create appointments after confirmation from the user.  \n- Always act in the spirit of **relief, clarity, and efficiency**.\n',
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
									messageId: "={{ $fromAI('Message_ID', ``, 'string') }}",
									operation: 'delete',
									descriptionType: 'manual',
									toolDescription:
										'Call the Gmail API to delete an email. Always request the email message id before calling this tool.',
								},
								credentials: {
									gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
								},
								name: 'Delete an email',
							},
						}),
						tool({
							type: 'n8n-nodes-base.gmailTool',
							version: 2.1,
							config: {
								parameters: {
									limit:
										'={{ $fromAI("limit", "The maximal number of mails to receive.", "number") }}',
									filters: { q: 'in:inbox' },
									operation: 'getAll',
									descriptionType: 'manual',
									toolDescription: 'Consume the Gmail API to get the last emails',
								},
								credentials: {
									gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
								},
								name: 'Get last emails',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									limit: "={{ $fromAI('limit','the amount of event',\"number\") }}",
									options: {},
									timeMax:
										"={{ $fromAI('end','end date in format \"2017-07-01T13:00:00+02:00\"') }}",
									timeMin:
										"={{ $fromAI('start','start date in format \"2017-07-01T13:00:00+02:00\"') }}",
									calendar: {
										__rl: true,
										mode: 'list',
										value: 'user@example.com',
										cachedResultName: 'user@example.com',
									},
									operation: 'getAll',
									descriptionType: 'manual',
									toolDescription:
										'Consume Google Calendar API to receive a list of calendar events between "start" and "end". Make sure to pass datetime.',
								},
								credentials: {
									googleCalendarOAuth2Api: {
										id: 'credential-id',
										name: 'googleCalendarOAuth2Api Credential',
									},
								},
								name: 'Get calendar events',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									end: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('End', ``, 'string') }}",
									start:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Start', ``, 'string') }}",
									calendar: {
										__rl: true,
										mode: 'list',
										value: 'user@example.com',
										cachedResultName: 'user@example.com',
									},
									descriptionType: 'manual',
									toolDescription:
										'Consume Google Calendar API to add a new event or meeting to the calender',
									additionalFields: {
										summary:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Summary', ``, 'string') }}",
										description:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Description', ``, 'string') }}",
									},
								},
								credentials: {
									googleCalendarOAuth2Api: {
										id: 'credential-id',
										name: 'googleCalendarOAuth2Api Credential',
									},
								},
								name: 'Add an calender entry',
							},
						}),
						tool({
							type: 'n8n-nodes-base.gmailTool',
							version: 2.1,
							config: {
								parameters: {
									message:
										"={{ $fromAI('Message', `The Text that should be send in reply`, 'string') }}",
									options: {
										sendTo:
											"={{ $fromAI('To_Email', `The email adress of the sender`, 'string') }}",
									},
									subject: "={{ $fromAI('Subject', ``, 'string') }}",
									resource: 'draft',
									descriptionType: 'manual',
									toolDescription: 'Call Gmail API to create a New outgoing Draft message.',
								},
								credentials: {
									gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
								},
								name: 'Create an New Email Draft',
							},
						}),
						tool({
							type: 'n8n-nodes-base.gmailTool',
							version: 2.1,
							config: {
								parameters: {
									messageId:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Message_ID', ``, 'string') }}",
									operation: 'get',
									descriptionType: 'manual',
									toolDescription: 'Consume the Gmail API to receive an email by message-id',
								},
								credentials: {
									gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
								},
								name: 'Get an email by MessageID',
							},
						}),
						tool({
							type: 'n8n-nodes-base.dateTimeTool',
							version: 2,
							config: {
								parameters: {
									date: "={{ $fromAI('Date', ``, 'string') }}",
									format: 'custom',
									options: {},
									operation: 'formatDate',
									customFormat: 'EEEE dd MM ',
									descriptionType: 'manual',
									outputFieldName: '=formattedDate',
									toolDescription:
										'Formats the date in the name of the day of the week. Always use this before you output weekdays.',
								},
								name: 'Determine the name of the day of the week',
							},
						}),
						tool({
							type: 'n8n-nodes-base.gmailTool',
							version: 2.1,
							config: {
								parameters: {
									message:
										"={{ $fromAI('Message', `The Text that should be send in reply`, 'string') }}",
									options: {
										sendTo:
											"={{ $fromAI('To_Email', `The email adress of the sender`, 'string') }}",
										threadId:
											"={{ $fromAI('thread-ID', `The ID of the thread. Need to be received from the Email Tool Response. Use the exact ID and better call the Get Email Tool again`, 'string') }}",
									},
									subject:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Subject', ``, 'string') }}",
									resource: 'draft',
									descriptionType: 'manual',
									toolDescription:
										'Call Gmail API to create a Draft message as Reply To an existing email or email thread. Pass the correct Thread-Id of the message. To get the Thread ID call the Get Email Tool before.',
								},
								credentials: {
									gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
								},
								name: 'Create an Email Draft as response to a thread',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolVectorStore',
							version: 1.1,
							config: {
								parameters: {
									description:
										'Can answer questions and do research in previous email conversations. Use this tool whenever you need more context about past conversations to an email. \nFor better retrieval and more context always pass the email-adresses to the query!\n',
								},
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
									vectorStore: vectorStore({
										type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
										version: 1.1,
										config: {
											subnodes: {
												embedding: embedding({
													type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
													version: 1.2,
													config: {
														parameters: { options: {} },
														credentials: {
															openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
														},
														name: 'Embeddings OpenAI1',
													},
												}),
											},
											name: 'Threads History Vector Store',
										},
									}),
								},
								name: 'Research context and infos in previous conversations',
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
									value: 'gpt-4o',
									cachedResultName: 'gpt-4o',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: "={{ $('sessionId-master').item.json.sessionId }}",
								sessionIdType: 'customKey',
								contextWindowLength: 10,
							},
							name: 'Window Buffer Memory',
						},
					}),
				},
				position: [1060, 240],
				name: 'EMail Agent',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			version: 1.1,
			config: {
				parameters: {
					workflowInputs: { values: [{ name: 'sessionId' }, { name: 'chatInput' }] },
				},
				position: [120, 80],
				name: 'When Executed by Another Workflow',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [1840, -760], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: { filters: {}, resource: 'thread' },
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [2140, -560],
				name: 'Gmail - get recent Threads',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					options: {},
					resource: 'thread',
					threadId: '={{ $json.id }}',
					operation: 'get',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [2360, -560],
				name: 'Gmail1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					mode: 'runOnceForEachItem',
					jsCode:
						'const result = {}\n\nfunction summarizeConversation(messages) {\n  return messages.map(msg => {\n    const date = new Date(Number(msg.internalDate)).toISOString();\n    return `\n\n📅 ${date}\n📨 From: ${msg.From}\n📥 To: ${msg.To}\n📌 Subject: ${msg.Subject}\n\n${msg.snippet}\n`.trim();\n  }).join("\\n\\n-----------------------\\n\\n");\n}\n\n$json.emailSummary = summarizeConversation($json.messages);\n\nreturn $json;',
				},
				position: [2580, -560],
				name: 'Code - Summarize Email Thread as Text',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
			version: 1.1,
			config: {
				parameters: { mode: 'insert', clearStore: true },
				subnodes: {
					embedding: embedding({
						type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
						version: 1.2,
						config: {
							parameters: { options: {} },
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'Embeddings OpenAI',
						},
					}),
					documentLoader: documentLoader({
						type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
						version: 1,
						config: {
							parameters: {
								options: {
									metadata: {
										metadataValues: [{ name: 'threadId', value: '={{ $json.id }}' }],
									},
								},
								jsonData: '={{ $json.emailSummary }}',
								jsonMode: 'expressionData',
							},
							subnodes: {
								textSplitter: textSplitter({
									type: '@n8n/n8n-nodes-langchain.textSplitterTokenSplitter',
									version: 1,
									config: { parameters: { chunkSize: 2000 }, name: 'Token Splitter' },
								}),
							},
							name: 'Default Data Loader',
						},
					}),
				},
				position: [2900, -560],
				name: 'Write - Threads History Vector Store',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.gmailTrigger',
			version: 1.2,
			config: {
				parameters: { filters: {}, pollTimes: { item: [{ mode: 'everyMinute' }] } },
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [240, -540],
				name: 'Gmail Trigger',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.textClassifier',
			version: 1,
			config: {
				parameters: {
					options: { fallback: 'other' },
					inputText:
						'=Email Subject: {{ $json.Subject }}\n\nEMail From: {{ $json.From }}\n\n------\n##Email Snippet: \n{{ $json.snippet }}\n\n',
					categories: {
						categories: [
							{
								category: 'Kollegen',
								description: 'any email from colleagues with the sender @example.com',
							},
							{
								category: 'Kunden',
								description:
									'Every email with an existing contact in the CRM or that sounds like a customer.|Also mails that sound like a customer inquiry and mails that show a project reference.',
							},
						],
					},
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4.1-mini',
									cachedResultName: 'gpt-4.1-mini',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model2',
						},
					}),
				},
				position: [560, -680],
				name: 'Classify Emails',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					labelIds: ['Label_749967+1234567890'],
					messageId: '={{ $json.id }}',
					operation: 'addLabels',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1200, -800],
				name: 'Gmail - Label as Colleges',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					labelIds: ['Label_4725571417728382593'],
					messageId: '={{ $json.id }}',
					operation: 'addLabels',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [1200, -640],
				name: 'Gmail label as kunde',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
			version: 1.1,
			config: {
				parameters: { mode: 'load', topK: 100, prompt: 'workshop' },
				subnodes: {
					embedding: embedding({
						type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
						version: 1.2,
						config: {
							parameters: { options: {} },
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'Embeddings OpenAI',
						},
					}),
				},
				position: [2820, -760],
				name: 'Read- Threads History Vector Store',
			},
		}),
	)
	.add(sticky('## Email Sorting Agent\n', { position: [100, -860], width: 1500, height: 720 }))
	.add(
		sticky('## Email Access Tools', {
			name: 'Sticky Note1',
			position: [500, 660],
			width: 520,
			height: 460,
		}),
	)
	.add(
		sticky('## Calender Access Tools', {
			name: 'Sticky Note2',
			color: 6,
			position: [1100, 660],
			width: 520,
			height: 460,
		}),
	)
	.add(
		sticky('## Knowlede about past email conversations', {
			name: 'Sticky Note3',
			color: 5,
			position: [1700, 500],
			width: 520,
			height: 620,
		}),
	)
	.add(
		sticky('## Email Thread Knowledge adder', {
			name: 'Sticky Note4',
			color: 4,
			position: [1740, -900],
			width: 1680,
			height: 780,
		}),
	)
	.add(
		sticky(
			'## Main Inbox Assistance Agent\n\n### Before Using\n** Modify the classifier agent for your needs. Add the Labels in GMail before, if you want to assign labels.\n** Add proper credentials\n** Modify the Prompts (e.g. give more context about your role and company)\n\n### More on professional Agents:\n** From [AOE AI Lab](https://ai-radar.aoe.com/)',
			{ name: 'Sticky Note7', color: 3, position: [-460, 0], width: 480, height: 440 },
		),
	);
