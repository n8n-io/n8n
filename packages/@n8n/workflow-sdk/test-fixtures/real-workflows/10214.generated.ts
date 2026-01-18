const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.whatsAppTrigger',
			version: 1,
			config: {
				parameters: { options: {}, updates: ['messages'] },
				credentials: {
					whatsAppTriggerApi: { id: 'credential-id', name: 'whatsAppTriggerApi Credential' },
				},
				position: [80, -16],
				name: 'WhatsApp Trigger',
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
						'const msg = $json.messages?.[0]?.text;\n\nif (!msg) {\n  // Exit early if no text message\n  return [];\n}\n\nreturn items;\n',
				},
				position: [304, -16],
				name: 'Check Message',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.redis',
			version: 1,
			config: {
				parameters: {
					key: '=llm-user:{{ $json.contacts[0].wa_id }}',
					options: {},
					operation: 'get',
				},
				credentials: { redis: { id: 'credential-id', name: 'redis Credential' } },
				position: [528, -16],
				name: 'Check User Number',
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
						"let data;\ntry {\n  data = $json.value ? JSON.parse($json.value) : null;\n} catch (e) {\n  data = null;\n}\n\nlet modelIndex;\nlet shouldSet = false;\n\nif (data && typeof data.modelIndex === 'number') {\n  // Alternate: flip the previous modelIndex\n  modelIndex = data.modelIndex === 0 ? 1 : 0;\n  shouldSet = true; // store the new one\n} else {\n  // If no data, default to model 0 and store it\n  modelIndex = 0;\n  shouldSet = true;\n}\n\nreturn [\n  {\n    json: {\n      modelIndex,\n      shouldSet\n    }\n  }\n];\n",
				},
				position: [752, -16],
				name: 'Model Decider',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.redis',
			version: 1,
			config: {
				parameters: {
					key: "=llm-user:{{ $('WhatsApp Trigger').item.json.contacts[0].wa_id }}",
					ttl: 3600,
					value: '={{ JSON.stringify({ modelIndex: $json.modelIndex }) }}',
					expire: true,
					operation: 'set',
				},
				credentials: { redis: { id: 'credential-id', name: 'redis Credential' } },
				position: [976, -16],
				name: 'Store User Number',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "={{ $('WhatsApp Trigger').item.json.messages[0].text.body }}",
					options: {
						systemMessage:
							"You are a helpful AI assistant tasked with answering questions about hotel bookings.\nYou have access to a MySQL database with tables like 'bookings', 'guests', 'rooms', etc.\n\nIMPORTANT SECURITY RULE: YOU ARE STRICTLY FORBIDDEN FROM PERFORMING ANY DATABASE WRITE OPERATIONS (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, etc.).\nYou must ONLY generate valid SQL SELECT statements.\n\nWhen a user asks a question, translate it into an appropriate SQL SELECT query.",
					},
					promptType: 'define',
				},
				position: [1456, -16],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.whatsApp',
			version: 1,
			config: {
				parameters: {
					textBody: '={{ $json.output }}',
					operation: 'send',
					phoneNumberId: '723548604171403',
					additionalFields: {},
					recipientPhoneNumber: "={{ $('WhatsApp Trigger').item.json.messages[0].from }}",
				},
				credentials: {
					whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
				},
				position: [2016, -16],
				name: 'Send message',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: {
					sessionKey: "={{ $('WhatsApp Trigger').item.json.contacts[0].wa_id }}",
					sessionIdType: 'customKey',
				},
				position: [1600, 192],
				name: 'Simple Memory',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1280, 384],
				name: 'Google Gemini Chat Model',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.modelSelector',
			version: 1,
			config: {
				parameters: {
					rules: {
						rule: [
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
											id: '61173b3f-c09e-4efb-aae0-5af12aed3b1e',
											operator: { type: 'number', operation: 'equals' },
											leftValue: '={{$json.modelIndex}}',
											rightValue: 0,
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
											id: '6fd19391-2c15-42a6-82db-152976b1d6d3',
											operator: { type: 'number', operation: 'equals' },
											leftValue: '={{$json.modelIndex}}',
											rightValue: 1,
										},
									],
								},
								modelIndex: 2,
							},
						],
					},
				},
				position: [1328, 192],
				name: 'Choose Model',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheetsTool',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/13yvxKTOWC4lgMLPWtVW_RELRZWdZHwUon_xOk4rF1X0/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'id',
						value: '13yvxKTOWC4lgMLPWtVW_RELRZWdZHwUon_xOk4rF1X0',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1728, 192],
				name: 'Pricing',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1456, 384],
				name: 'Google Gemini Chat Model1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.mySqlTool',
			version: 2.4,
			config: {
				parameters: {
					query: "{{ $('AI Agent').item.json.query }}",
					options: {},
					operation: 'executeQuery',
				},
				credentials: { mySql: { id: 'credential-id', name: 'mySql Credential' } },
				position: [1856, 192],
				name: 'Execute a SQL query in MySQL',
			},
		}),
	)
	.add(
		sticky(
			'💬 Workflow Overview\nThis workflow acts as an AI receptionist for hotels, built on n8n.\nGuests can message the hotel via WhatsApp, and the system automatically replies using AI with real booking or pricing details.\n\nIt combines WhatsApp → AI Agent → Database → WhatsApp in one seamless loop.',
			{ color: 4, position: [-368, -96], width: 336, height: 224 },
		),
	)
	.add(
		sticky(
			'⚙️ Model Switching System\nThe workflow uses Redis to track each user’s AI model assignment.\nEach user is automatically routed to a different Google Gemini model, helping:\nDistribute traffic evenly across models\nReduce overall API cost\nKeep performance fast and stable\nThis makes it ideal for large-scale or high-traffic hotel systems.',
			{ name: 'Sticky Note1', color: 5, position: [528, -256], width: 544, height: 176 },
		),
	)
	.add(
		sticky(
			'🧠 AI-Powered Hotel Assistant\nThe AI Agent interprets the user’s query and converts it into a read-only SQL SELECT statement.\n\nIt fetches information like room availability, guest check-ins, or booking data from MySQL, formats it naturally, and sends it back to the guest instantly on WhatsApp.\n\nThe workflow ensures safety (no write/delete queries) and delivers accurate, real-time hotel insights.',
			{ name: 'Sticky Note2', color: 6, position: [1216, -272], width: 448, height: 208 },
		),
	)
	.add(
		sticky(
			'Redis Get Node\n\n🧩 What it does\nWhen a WhatsApp message arrives, this node checks Redis for a record matching that user’s WhatsApp ID.\nThat stored record tells the workflow which AI model this user was last assigned to (e.g., model 0 or model 1).',
			{ name: 'Sticky Note3', color: 3, position: [448, 160], width: 288, height: 192 },
		),
	)
	.add(
		sticky(
			'Redis Set Node\n\n🧩 What it does\nAfter the Model Decider decides which model the user should use, this node stores that model index back into Redis.\nIt also sets an expiration (ttl = 3600 seconds → 1 hour), meaning the assignment lasts for one hour.',
			{ name: 'Sticky Note4', color: 3, position: [880, 160], width: 288, height: 192 },
		),
	);
