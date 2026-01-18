const wf = workflow(
	'HVThZXxmw59rTi0T',
	'LeadBot Autopilot: Chat-to-Lead for Salesforce Automation',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: {
					public: true,
					options: {},
					initialMessages:
						"Hi! I'm LeadBot. I'll help you submit your interest. Let's start with your full name.",
				},
				position: [-940, -140],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					options: {
						systemMessage:
							"You are a friendly and efficient chatbot named LeadBot, designed to replace web forms. Your goal is to collect information conversationally: Full Name, Email, Mobile Phone, and Product Interest. Guide the user step-by-step, asking one piece of info at a time. Be polite, confirm inputs, and handle corrections.\nRules:\n\nStart by greeting and explaining: \"Hi! I'm LeadBot. I'll help you submit your interest. Let's start with your full name.\"\nCollect in order: Name → Email (validate format) → Mobile Phone (validate as phone number) → Product Interest ([\"CRM Software\", \"Marketing Automation\"] – present as options).\nAfter Email: Always use the 'check_duplicate_lead' tool to search for existing records by email. If duplicate found, silently proceed to update the existing record (do not ask the user).\nValidate all inputs: If invalid (e.g., bad email or phone format), politely ask again.\nOnce all info collected: Use 'create_lead' or 'update_lead' tool to submit or update the info – If there is an existing record, pass the lead_id to update_lead; otherwise, use create_lead.\nAfter success: Use 'send_notification_internal' to notify the internal team via Slack (e.g., \"New/updated interest: [Name] - [Email] - [Interest]\"), and 'send_notification_client' to send a personalized message to the client based on their product interest (e.g., email with details about the chosen interest).\nEnd conversation: \"Thanks! Your request has been logged. We'll contact you soon.\"\nIf user wants to stop: Politely end and don't submit anything.\nKeep responses concise, under 100 words.\nOnly use tools when necessary; do not hallucinate data.\nUse the 'think' tool for internal reasoning on complex decisions, like ambiguous inputs or name splitting.\n\nAvailable Tools (use function calling format):\n\ncheck_duplicate_lead: Checks for duplicate record by email.\n\nParameters: email (string, required)\nReturns: {exists: boolean, lead_id: string or null, details: {name: string, birthday: string, interest: string} or null}\n\n\nupdate_lead: Updates existing record.\n\nParameters: firstname (string), lastname (string), email (string), mobile (string), interest (string), lead_id (string)\nReturns: {success: boolean, lead_id: string, message: string}\nAlways respond in JSON if calling tools, but output natural text to user.\n\n\ncreate_lead: Creates new record.\n\nParameters: firstname (string), lastname (string), email (string), mobile (string), interest (string)\nReturns: {success: boolean, lead_id: string, message: string}\nAlways respond in JSON if calling tools, but output natural text to user.\n\n\nsend_notification_internal: Sends Slack notification to internal team about the new/updated record.\n\nParameters: lead_id (string), name (string), email (string), interest (string)\nReturns: {success: boolean, message: string}\nAlways respond in JSON if calling tools, but output natural text to user.\n\n\nsend_notification_client: Sends personalized notification to the client based on their product interest.\n\nParameters: email (string), name (string), interest (string)\nReturns: {success: boolean, message: string}\nAlways respond in JSON if calling tools, but output natural text to user.\n\n\nthink: Allows you to reflect and reason step by step before answering. Use for complex queries or decisions.\n\nParameters: none\nReturns: {thought: string} (your reasoned response for internal use)\nAlways respond in JSON if calling tools, but output natural text to user.",
					},
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1,
							config: { name: 'Think' },
						}),
						tool({
							type: 'n8n-nodes-base.salesforceTool',
							version: 1,
							config: {
								parameters: {
									company: "={{ $fromAI('Company', ``, 'string') }}",
									lastname:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Last_Name', ``, 'string') }}",
									additionalFields: {
										email:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Email', ``, 'string') }}",
										firstname:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('First_Name', ``, 'string') }}",
										mobilePhone:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Mobile_Phone', ``, 'string') }}",
										customFieldsUi: {
											customFieldsValues: [
												{
													value:
														"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('customFieldsValues0_Value', ``, 'string') }}",
													fieldId: 'ProductInterest__c',
												},
											],
										},
									},
								},
								credentials: {
									salesforceOAuth2Api: {
										id: 'credential-id',
										name: 'salesforceOAuth2Api Credential',
									},
								},
								name: 'create_lead',
							},
						}),
						tool({
							type: 'n8n-nodes-base.salesforceTool',
							version: 1,
							config: {
								parameters: {
									leadId:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Lead_ID', ``, 'string') }}",
									operation: 'update',
									updateFields: {
										email:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Email', ``, 'string') }}",
										lastname:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Last_Name', ``, 'string') }}",
										firstname:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('First_Name', ``, 'string') }}",
										mobilePhone:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Mobile_Phone', ``, 'string') }}",
										customFieldsUi: {
											customFieldsValues: [
												{
													value:
														"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('customFieldsValues0_Value', ``, 'string') }}",
													fieldId: 'ProductInterest__c',
												},
											],
										},
									},
								},
								credentials: {
									salesforceOAuth2Api: {
										id: 'credential-id',
										name: 'salesforceOAuth2Api Credential',
									},
								},
								name: 'update_lead',
							},
						}),
						tool({
							type: 'n8n-nodes-base.salesforceTool',
							version: 1,
							config: {
								parameters: {
									options: {
										conditionsUi: {
											conditionValues: [
												{
													field: 'Email',
													value:
														"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('conditionValues0_Value', ``, 'string') }}",
												},
											],
										},
									},
									operation: 'getAll',
									returnAll: true,
									descriptionType: 'manual',
									toolDescription: 'Get many leads in Salesforce',
								},
								credentials: {
									salesforceOAuth2Api: {
										id: 'credential-id',
										name: 'salesforceOAuth2Api Credential',
									},
								},
								name: 'check_duplicate_lead',
							},
						}),
						tool({
							type: 'n8n-nodes-base.emailSendTool',
							version: 2.1,
							config: {
								parameters: {
									html: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('HTML', ``, 'string') }}",
									options: {},
									subject:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Subject', ``, 'string') }}",
									toEmail:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('To_Email', ``, 'string') }}",
									fromEmail: 'test@example.com',
								},
								credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
								name: 'send_notification_client',
							},
						}),
						tool({
							type: 'n8n-nodes-base.slackTool',
							version: 2.3,
							config: {
								parameters: {
									text: "={{ $fromAI('Message_Text', ``, 'string') }}",
									user: {
										__rl: true,
										mode: 'list',
										value: 'U08QYRBEE3V',
										cachedResultName: 'ai_agent',
									},
									select: 'user',
									otherOptions: {},
								},
								credentials: {
									slackApi: { id: 'credential-id', name: 'slackApi Credential' },
								},
								name: 'send_notification_internal',
							},
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: { name: 'Simple Memory' },
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4.1',
									cachedResultName: 'gpt-4.1',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
				},
				position: [-240, -120],
				name: 'AI Agent',
			},
		}),
	)
	.add(
		sticky(
			'## Workflow Overview\nThis workflow creates a Chat-to-Lead chatbot using AI to collect user data conversationally. It integrates with Salesforce for duplicate checks and lead CRUD, notifies teams via Slack, and sends client emails.\nKey flow:\n\n- Chat Trigger → AI Agent (with tools) → Salesforce/Notification actions.\n\n\nUses OpenAI for chat intelligence and memory for conversation state. Ensure all credentials are set before testing. Potential enhancements: Add more product options or validation regex in the prompt.',
			{ position: [-2000, 120], width: 600, height: 520 },
		),
	)
	.add(
		sticky(
			'## Memory Management\nSalesforce tool to query leads by email (using "getAll" with Email condition). Returns if a duplicate exists, with lead_id and details. Invoked after email collection.\nCredentials: Salesforce OAuth.\n\nOperation: getAll, returnAll: true, filters by email dynamically from AI.',
			{ name: 'Sticky Note1', color: 3, position: [-960, 340], width: 260, height: 320 },
		),
	)
	.add(
		sticky(
			'## Internal Reasoning\nLangChain Think tool for AI to reason step-by-step internally (e.g., splitting names or handling ambiguities).\n\nNo params; returns thoughts for the agent.\nUsed for complex decisions without external calls.\nHelps improve accuracy in edge cases like input validation.',
			{ name: 'Sticky Note2', color: 4, position: [-680, 340], width: 260, height: 320 },
		),
	)
	.add(
		sticky(
			'## Language Model\nProvides the LLM backend (GPT-4.1) for the AI Agent. Handles natural language processing, reasoning, and tool decisions.\nCredentials: OpenAI API key.\nOptions are minimal here; advanced configs like temperature can be added if needed for more creative responses.',
			{ name: 'Sticky Note3', color: 2, position: [-1300, 340], width: 300, height: 220 },
		),
	)
	.add(
		sticky(
			"## Chat Trigger Step\nThis node starts the workflow on incoming chat messages (e.g., via webhook). It sets an initial greeting:\n\n\"Hi! I'm LeadBot. I'll help you submit your interest. Let's start with your full name.\"\n\nActs as the entry point for user interactions, passing messages to the AI Agent. No credentials needed;",
			{ name: 'Sticky Note4', position: [-1420, -220], width: 440, height: 260 },
		),
	)
	.add(
		sticky(
			'## Internal Notification\nSends Slack message to a specific user/channel (here, user U08QYRBEE3V). Text dynamically from AI (e.g., "New/updated interest: [Name] - [Email] - [Interest]").\n\nActs as send_notification_internal.\nCredentials: Slack API. Webhook for tool invocation.',
			{ name: 'Sticky Note5', color: 6, position: [380, 380], height: 280 },
		),
	)
	.add(
		sticky(
			'## Client Notification \nEmails the user a personalized message based on interest.\nParams: fromEmail (fixed), toEmail, subject, HTML body – all dynamic from AI.\nUses SMTP credentials. Invoked after lead success for client-facing notification.',
			{ name: 'Sticky Note6', color: 6, position: [640, 380], height: 280 },
		),
	)
	.add(
		sticky(
			'## Update Lead\nSalesforce tool to update an existing lead.\nParams: leadId, firstname, lastname, email, mobile, custom field (ProductInterest__c).\nInvoked if duplicate found. Credentials: Salesforce OAuth. Dynamically pulls values from AI (e.g., $fromAI expressions).',
			{ name: 'Sticky Note7', color: 5, position: [-140, 380], height: 280 },
		),
	)
	.add(
		sticky(
			'## Duplicate Check\nSalesforce tool to query leads by email (using "getAll" with Email condition). Returns if a duplicate exists, with lead_id and details. Invoked after email collection.\nCredentials: Salesforce OAuth.\n\nOperation: getAll, returnAll: true, filters by email dynamically from AI.',
			{ name: 'Sticky Note8', color: 5, position: [-400, 380], height: 280 },
		),
	)
	.add(
		sticky(
			'## Create Lead\nSalesforce tool to create a new lead.\nParams: company (default), lastname, additional fields like email, firstname, mobile, ProductInterest__c.\nInvoked if no duplicate. Credentials: Salesforce OAuth. Uses $fromAI for dynamic data injection.',
			{ name: 'Sticky Note9', color: 5, position: [120, 380], height: 280 },
		),
	)
	.add(
		sticky(
			'## Core AI Agent\nThe heart of the bot: Uses OpenAI (via connected model) to manage conversation based on the system prompt. Handles step-by-step data collection, validations, and tool calls (e.g., duplicate check, lead create/update).\n\nMemory is connected for context retention.\nTools are invoked via function calls in the prompt.\nOutput is natural text responses to the user.',
			{ name: 'Sticky Note10', position: [-320, -400], width: 440, height: 260 },
		),
	);
