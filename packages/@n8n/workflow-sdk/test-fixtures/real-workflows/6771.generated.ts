const wf = workflow(
	'InxpOwOAX7qfXIvX',
	'WhatsApp RAG Chatbot with Supabase, Gemini 2.5 Flash, and OpenAI Embeddings',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.whatsAppTrigger',
			version: 1,
			config: {
				parameters: { options: {}, updates: ['messages'] },
				credentials: {
					whatsAppTriggerApi: { id: 'yVPQQ9GPjNKE9nkZ', name: 'whatsApp_OAuth_api' },
				},
				position: [-304, 560],
				name: 'New WhatsApp Message',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'query',
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
											id: 'dcd448ce-72f0-4c83-b721-3417a746473e',
											operator: { type: 'object', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.messages[0].text }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'document',
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
											id: '8b2b9810-08c7-452f-a2e0-ba1453586919',
											operator: { type: 'object', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.messages[0].document }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [-48, 560],
				name: 'Check if Query or Document',
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
					text: '={{ $json.messages[0].text }}',
					options: {},
					promptType: 'define',
				},
				position: [368, 272],
				name: 'RAG Query Agent',
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
					phoneNumberId: '768049963047541',
					additionalFields: {},
					recipientPhoneNumber: "={{ $('New WhatsApp Message').item.json.contacts[0].wa_id }}",
				},
				credentials: {
					whatsAppApi: { id: 'LV22R0NzX9vZLEp9', name: 'whatsapp_reply' },
				},
				position: [912, 272],
				name: 'Send WhatsApp Reply',
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
					resource: 'media',
					operation: 'mediaUrlGet',
					mediaGetId: '={{ $json.messages[0].document.id }}',
				},
				credentials: {
					whatsAppApi: { id: 'LV22R0NzX9vZLEp9', name: 'whatsapp_reply' },
				},
				position: [288, 928],
				name: 'Get Document URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.url }}',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'y4by5K1yYvLIIf84', name: 'whatsapp' },
				},
				position: [560, 928],
				name: 'Download WhatsApp Document',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
			version: 1.3,
			config: {
				parameters: {
					mode: 'insert',
					options: {},
					tableName: {
						__rl: true,
						mode: 'list',
						value: 'documents',
						cachedResultName: 'documents',
					},
				},
				credentials: {
					supabaseApi: { id: 'QkeJlJh5cCiuLpvg', name: 'Supabase account' },
				},
				position: [896, 928],
				name: 'Store Embeddings in Supabase',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
			version: 1.1,
			config: {
				parameters: { options: {}, dataType: 'binary' },
				position: [1008, 1216],
				name: 'Convert File to Text',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
			version: 1.2,
			config: {
				parameters: { options: {} },
				credentials: {
					openAiApi: { id: 'GVGOwCYLGI5SaqsK', name: 'OpenAi account' },
				},
				position: [816, 1216],
				name: 'Generate OpenAI Embeddings',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
			version: 1.3,
			config: {
				parameters: {
					mode: 'retrieve-as-tool',
					options: {},
					tableName: {
						__rl: true,
						mode: 'list',
						value: 'documents',
						cachedResultName: 'documents',
					},
					toolDescription: 'call this tool to reach the goal',
				},
				credentials: {
					supabaseApi: { id: 'QkeJlJh5cCiuLpvg', name: 'Supabase account' },
				},
				position: [480, 496],
				name: 'Retrieve Context from Supabase',
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
					googlePalmApi: {
						id: 'SuWwLWBsAfrDFgCm',
						name: 'Google Gemini(PaLM) Api account',
					},
				},
				position: [352, 496],
				name: 'Google Gemini LLM',
			},
		}),
	)
	.add(
		sticky(
			'## Document Flow:\n\n* Fetch file URL from WhatsApp message\n* Download and convert file to readable text\n* Generate embeddings with OpenAI\n* Store embeddings in Supabase for future queries',
			{ color: 7, position: [240, 736], width: 960, height: 384 },
		),
	)
	.add(
		sticky(
			'## Query Flow:\n\n- Convert user query into embeddings (OpenAI)\n- Match embeddings with Supabase vectors to find context\n- Send retrieved context to Gemini 2.5 Flash for answer\n- Return concise response to WhatsApp user',
			{ name: 'Sticky Note1', color: 7, position: [240, 80], width: 560, height: 544 },
		),
	)
	.add(
		sticky(
			'## Message Check: \n- Determines if the message is a query(text) or a document upload. ',
			{ name: 'Sticky Note2', color: 7, position: [-112, 432], height: 304 },
		),
	)
	.add(
		sticky(
			'## Try It Out!\n### This n8n template demonstrates how to build a WhatsApp-based AI chatbot using **document retrieval (RAG)**.It stores documents in **Supabase** with **OpenAI embeddings** and generates user-friendly answers using **Gemini 2.5 Flash LLM**.\n\nUse cases: Turn your WhatsApp into a **knowledge assistant** for FAQs, customer support, or internal team knowledge.\n\n### How it works\n\n* **Trigger:** A WhatsApp webhook activates on every new message.\n* **Message Check:** Detects if the message is a document upload or a query.\n* **Document Handling:** File URL → text conversion → embeddings with OpenAI → stored in Supabase.\n* **Query Handling:** Query embeddings → retrieve context → Gemini 2.5 Flash generates response.\n* **Reply:** Sends the answer back to the user via WhatsApp.\n\n### How to use\n\n* Configure **WhatsApp Business API**, **Supabase**, and **OpenAI credentials** in n8n’s credential manager.\n* Upload documents via WhatsApp to populate the vector database.\n* Ask questions directly on WhatsApp — the bot retrieves context and replies instantly.\n\n### Requirements\n\n* WhatsApp Business API (or Twilio sandbox)\n* Supabase account (vector storage)\n* OpenAI API key (embeddings)\n* Gemini API access (LLM responses)\n\n### Need Help?\n\nDM me on [X (formerly Twitter)](https://x.com/manav170303) or email [titanfactz@gmail.com](mailto:titanfactz@gmail.com).\n\nAlways open to feedback and improvements!',
			{ name: 'Sticky Note3', position: [-1168, 208], width: 800, height: 832 },
		),
	)
	.add(
		sticky(
			'## Document Upload Flow\n\nExample: Shows how a document is uploaded and detected in the workflow.  \n\n![Document Upload Example](https://github.com/Manav54321/WhatsApp-RAG-Chatbot-with-Supabase-Gemini-2.5-Flash-OpenAI-Embeddings/raw/main/screenshots/4956396C-F927-4308-9B7C-7F1CDEFE88F4_1_101_o.jpeg)\n',
			{ name: 'Sticky Note4', position: [1296, 736], width: 336, height: 832 },
		),
	)
	.add(
		sticky(
			'## Contextual Answer Flow\n\nExample: Demonstrates how the bot retrieves context from Supabase and responds with Gemini 2.5 Flash.  \n\n![Contextual Answer Example](https://github.com/Manav54321/WhatsApp-RAG-Chatbot-with-Supabase-Gemini-2.5-Flash-OpenAI-Embeddings/raw/main/screenshots/5FB5C957-2435-4FA1-93BA-9C9E0A749BF2_1_101_o.jpeg)\n',
			{ name: 'Sticky Note5', position: [1104, -192], width: 336, height: 848 },
		),
	);
