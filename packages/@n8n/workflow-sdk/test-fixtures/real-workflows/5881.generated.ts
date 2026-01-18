const wf = workflow(
	'OQuVjQzqswmDM86W',
	'WhatsApp Chatbot – Restaurant Info Assistant (Bookings, Menu, Timing)',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.whatsAppTrigger',
			version: 1,
			config: {
				parameters: { options: {}, updates: ['messages'] },
				credentials: {
					whatsAppTriggerApi: { id: 'credential-id', name: 'whatsAppTriggerApi Credential' },
				},
				position: [-400, -240],
				name: 'Receive WhatsApp Message',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '={{ $json.messages[0].text.body }}',
					options: {
						systemMessage:
							'=**You are a helpful and friendly WhatsApp chatbot for a restaurant.**\nWhen a customer sends a message, greet them politely and provide clear, short replies to their questions about:\n\n* Restaurant timings (opening/closing hours)\n* Table booking or reservation availability\n* Menu items (food types, popular dishes, specials)\n* Restaurant location or directions\n* Services offered (dine-in, takeaway, delivery)\n* Pricing and current offers\n* Confirming or cancelling a reservation\n\nIf the customer asks something unrelated to the restaurant, reply:\n🟢 *“I’m here to help with restaurant-related questions. Would you like to know our timings, menu, or book a table?”*\n\nIf a message is unclear or incomplete, respond with:\n🟢 *“Could you please clarify your question so I can assist you better?”*\n\nAlways keep the conversation short, polite, and informative.\n\n',
					},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOllama',
						version: 1,
						config: {
							parameters: { model: 'llama3.2-16000:latest', options: {} },
							credentials: {
								ollamaApi: { id: 'credential-id', name: 'ollamaApi Credential' },
							},
							name: 'Generate Reply with AI',
						},
					}),
				},
				position: [-180, -240],
				name: 'Extract Customer Query',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [196, -240], name: 'Wait For Response' },
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
								id: '0282b709-8b08-4831-ab40-5725db7d6034',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: 'Booking',
								rightValue: 'add_your_value_here',
							},
						],
					},
				},
				position: [416, -240],
				name: 'Check If Table Booking Required',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.postgres',
			version: 2.6,
			config: {
				parameters: {
					table: { __rl: true, mode: 'name', value: 'id' },
					schema: { __rl: true, mode: 'list', value: 'public' },
					columns: {
						value: {},
						schema: [],
						mappingMode: 'autoMapInputData',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
				},
				credentials: {
					postgres: { id: 'credential-id', name: 'postgres Credential' },
				},
				position: [636, -340],
				name: 'Create New Table Booking',
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
					phoneNumberId: '550325331503475',
					additionalFields: {},
					recipientPhoneNumber: "={{ $('Receive WhatsApp Message').item.json.contacts[0].wa_id }}",
				},
				credentials: {
					whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
				},
				position: [856, -340],
				name: 'Send Booking Confirmation to Customer',
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
					textBody: '={{ $json.output }}',
					operation: 'send',
					phoneNumberId: '550325331503475',
					additionalFields: {},
					recipientPhoneNumber: "={{ $('Receive WhatsApp Message').item.json.contacts[0].wa_id }}",
				},
				credentials: {
					whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
				},
				position: [636, -140],
				name: 'Send Reply to Customer',
			},
		}),
	)
	.add(
		sticky(
			'## This workflow powers a WhatsApp chatbot that answers customer questions about restaurant timing, menu, booking, services, and offers.\n\n## It uses a chat model (LLM) to understand queries and respond clearly via WhatsApp.\n\n',
			{ position: [-220, -620], width: 1000 },
		),
	);
