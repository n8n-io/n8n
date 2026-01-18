const wf = workflow(
	'h7qrcXor10jWVpln',
	'Voice2Propal – Smart WhatsApp Proposal Generator (Voice & Text)',
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
				position: [-500, 500],
				name: 'WhatsApp Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: '={{ $json.field }}' },
				position: [-280, 500],
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.whatsApp',
					version: 1,
					config: {
						parameters: {
							resource: 'media',
							operation: 'mediaUrlGet',
							mediaGetId: '={{ $json.audio.id }}',
						},
						credentials: {
							whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
						},
						position: [160, 420],
						name: 'WhatsApp Business Cloud',
					},
				}),
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: {
						parameters: {
							options: {},
							assignments: {
								assignments: [
									{
										id: '7453a002-ec0f-4853-a28d-5d06669cb5d0',
										name: 'text',
										type: 'string',
										value: "={{ $('WhatsApp Trigger').item.json.messages[0].text.body }}",
									},
								],
							},
						},
						position: [600, 600],
						name: 'Edit Fields',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'voice',
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
											id: 'b969c18d-14dd-4b34-8d08-801d8818b8d2',
											operator: { type: 'string', operation: 'equals' },
											leftValue: "={{ $('WhatsApp Trigger').item.json.messages[0].type }}",
											rightValue: 'audio',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'text',
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
											id: '1daa0ee5-cb8b-44c4-ae74-954cae03c10d',
											operator: { type: 'string', operation: 'equals' },
											leftValue: "={{ $('WhatsApp Trigger').item.json.messages[0].type }}",
											rightValue: 'text',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.url }}',
					options: {},
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'whatsAppApi',
				},
				credentials: {
					whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
				},
				position: [380, 400],
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
				position: [600, 400],
				name: 'OpenAI',
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
								id: '8cbf25ac-3fc9-4892-9c6a-24c974b03362',
								name: 'message_type',
								type: 'string',
								value: '={{ $json.text }}',
							},
						],
					},
				},
				position: [820, 500],
				name: 'Edit Fields1',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: '={{ $json.message_type }}',
					options: {
						systemMessage:
							'=# Overview  \nYou are an AI assistant responsible for generating custom proposal documents in HTML format using JavaScript by pulling data from an Airtable service database.  \n\n## Context  \n- You assist in creating personalized business proposals for leads using a prebuilt HTML template managed via a JavaScript class (PropositionGenerator).  \n- The template includes placeholders like "nom", "pack_nom", "pack_services", etc., that must be dynamically filled using relevant records from Airtable.  \n- The Airtable base "[BlockA] - Invoice" contains a table with pack offers, their components, objectives, pricing, and booking links.  \n- The proposal is directly addressed to the future client. Always use "you" when describing the situation and benefits.  \n- For spoken or informal requests, **use approximate matching**: a single keyword (e.g., "automation", "sales", "finance") is sufficient to infer the corresponding pack based on its `Objectifs` or pack name.\n\n## Instructions  \n1. Retrieve the correct pack data from the Airtable “Services” table based on the selected pack name.  \n2. If no pack is explicitly mentioned, analyze the client\'s objective (`situation_lead` or related message content) and match it to the most relevant `Objectifs` field in Airtable to select the appropriate service pack.  \n3. For oral or loose requests, use keyword-based fuzzy matching to determine the best-fit pack (e.g., "flow" → Pack SALES FLOW™, "content" → Pack CONTENT OPS™).  \n4. Use the following Airtable fields to populate the corresponding variables in the HTML template:  \n   - `Mes Services` → `pack_nom`  \n   - `Objectifs` → `pack_objectif`  \n   - `Agents & Services inclus` → `pack_services`  \n   - `Prix` → `prix`  \n   - `Lien de réservation` → `lien_reservation`  \n5. Collect client-specific information from user inputs or Airtable if available:  \n   - `nom`, `nom_entreprise`, `situation_lead`, `date`, and current date (`date_actuel`)  \n6. Replace all placeholders in the template using the `genererProposition(donnees)` method.  \n7. Respond directly. Do not explain, structure, or rephrase the request.  \n\n## Instructions  \n- Respond strictly in the JSON format defined below.  \n- Replace each placeholder value with the correct extracted or generated data:\n  - `"date_actuel"`: insert today’s date in the format "DD Month YYYY" (e.g., "03 July 2025").\n  - `"nom_entreprise"`: insert the exact name of the company.\n  - `"nom"`: insert the full name (first and last) of the person.\n  - `"date"`: insert the date of the last call or contact.\n  - `"situation_lead"`: Briefly reformulate the current situation or need you’ve expressed, speaking directly to the future client in French. \n  - `"pack_nom"`: insert the name of the proposed pack or service.\n  - `"pack_objectif"`: describe the strategic objective tied to this pack.\n  - `"pack_services"`: list the included services in the pack with `\\n` line breaks.\n  - `"duree_estimee"`: list the included `duree_estimee` in the pack with `\\n` line breaks.\n  - `"prix"`: insert the pack price in euros excl. tax (e.g., "€4,200 HT").\n  - `"lien_reservation"`: insert the personalized booking link (e.g., Calendly).\n\n- The output must follow this structure strictly:\n\n{\n  "date_actuel": "Current time",\n  "nom_entreprise": "Company Name",\n  "nom": "First Last Name",\n  "date": "Current time",\n  "situation_lead": "Briefly describe the current situation or expressed need.",\n  "pack_nom": "Recommended Pack Name",\n  "pack_objectif": "Describe the strategic goal targeted by this pack.",\n  "pack_services": "- Included service 1\\n- Included service 2\\n- Included service 3",\n  "duree_estimee": "Estimated duration on your own (e.g., 2 to 4 weeks)",\n  "prix": "Price in € excl. tax",\n  "lien_reservation": "https://your-booking-link.com"\n}\n\n- Return *only* this correctly filled JSON block and nothing else.  \n- With nothing before or after `{`  \n- If any required field is missing from Airtable, insert `[missing_field_name]` instead.  \n- Do not alter the layout or structure of the HTML template. Only replace variables.  \n- Once generated, return the HTML string or offer a download option to the user.  \n\n## Tools  \n- Airtable API  \n- JavaScript class `PropositionGenerator`  \n- HTML proposal template with dynamic placeholders  \n\n## Examples  \n- Input: "Generate a proposal for Pack FULL SYSTEM™ and client Jean Martin"  \n  - Output: "✅ The proposal for Jean Martin with Pack FULL SYSTEM™ is ready. Download it [here]."  \n- Input: "You need to automate prospecting and improve customer experience"  \n  - Output: "Based on the client’s goal, Pack SALES FLOW™ has been selected. Proposal is ready."  \n- Input (voice): "Can you send something for controlling my finances?"  \n  - Output: "Pack MONEY CONTROL™ selected based on keyword \'finances\'. Proposal ready."\n\n## SOP (Standard Operating Procedure)  \n1. Parse user request to identify the target client and desired pack.  \n2. If pack is not specified, analyze the client’s goal and match it to the most appropriate `Objectifs` from Airtable.  \n3. For informal inputs, use keyword-based fuzzy matching to find a close match in `Mes Services` or `Objectifs`.  \n4. Search Airtable for the matching pack row.  \n5. Extract corresponding fields and map them to the variables in the HTML template.  \n6. Collect client data and generate current date if needed.  \n7. Inject values into the `PropositionGenerator` using `genererProposition(donnees)`.  \n8. Provide the resulting HTML output or download link to the user.  \n\n## Final Notes  \n- Always ensure consistent formatting in HTML output.  \n- Default to French language formatting and phrasing in the final document.  \n- Never include internal or debug messages in the user response.  \n- Validate that the pack name matches exactly as shown in Airtable: e.g., "Pack FULL SYSTEM™".  \n\nCurrent time is {{ $now.format(\'yyyy-MM-dd\') }}  \nTime zone: Paris/Europe  \n',
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.airtableTool',
							version: 2.1,
							config: {
								parameters: {
									base: {
										__rl: true,
										mode: 'list',
										value: 'appT1CYPk7IFSWAsZ',
										cachedResultUrl: 'https://airtable.com/appT1CYPk7IFSWAsZ',
										cachedResultName: '[BlockA] - Invoice',
									},
									limit: 5,
									table: {
										__rl: true,
										mode: 'list',
										value: 'tblsD8z9C4oLQNbN6',
										cachedResultUrl: 'https://airtable.com/appT1CYPk7IFSWAsZ/tblsD8z9C4oLQNbN6',
										cachedResultName: 'Services',
									},
									options: {},
									operation: 'search',
									returnAll: false,
									filterByFormula:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Filter_By_Formula', ``, 'string') }}",
								},
								credentials: {
									airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
								},
								name: 'Get Info',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolCalculator',
							version: 1,
							config: { name: 'Calculator' },
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: "={{ $('Edit Fields1').item.json.message_type }} ",
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4-turbo-preview',
									cachedResultName: 'gpt-4-turbo-preview',
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
				position: [1140, 500],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.apiTemplateIo',
			version: 1,
			config: {
				parameters: {
					resource: 'pdf',
					pdfTemplateId: 'e8177b236ab07826',
					jsonParameters: true,
					propertiesJson: '={{ $json.output }}',
				},
				credentials: {
					apiTemplateIoApi: { id: 'credential-id', name: 'apiTemplateIoApi Credential' },
				},
				position: [1600, 500],
				name: 'APITemplate.io',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.whatsApp',
			version: 1,
			config: {
				parameters: {
					mediaLink: '={{ $json.download_url }}',
					operation: 'send',
					messageType: 'document',
					phoneNumberId: "={{ $('WhatsApp Trigger').item.json.metadata.phone_number_id }}",
					additionalFields: {
						mediaCaption:
							'=Re-bonjour,\n\nCe fut un réel plaisir d’échanger avec vous.\nComme convenu, vous trouverez ci-joint une proposition presonnalisée.\nElle inclut également un lien pour planifier un rendez-vous, si vous souhaitez saisir l’occasion.\n\nJe reste à votre disposition si besoin,\nFloyd Mahou',
						mediaFilename: 'Feuille de route proposée',
					},
					recipientPhoneNumber: 'YOUR PHONE NUMBER',
				},
				credentials: {
					whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
				},
				position: [1820, 500],
				name: 'WhatsApp Business Cloud2',
			},
		}),
	)
	.add(
		sticky(
			"## 🧩 Part 1: Message Intake & Transcription (Voice + Text)\n# Detect if the incoming WhatsApp message is a voice note or a text message, extract and prepare the content for analysis.\n\nModules:\n\nWhatsApp Trigger – Starts when a WhatsApp message is received.\n\nSplit Out – Breaks down the message into components.\n\nSwitch (Rules) – Detects whether it's a voice message or a text.\n\nWhatsApp Business Cloud (media.mediaUrlGet) – Gets the voice file if it's a voice note.\n\nHTTP Request – Downloads the voice note.\n\nOpenAI (Transcribe Recording) – Transcribes the audio to text using Whisper.\n\nEdit Fields / Edit Fields1 (manual) – Manually adjusts the transcription or text input for consistency.\n\n",
			{ color: 6, position: [-620, -60], width: 1600, height: 1140 },
		),
	)
	.add(
		sticky(
			"## 🤖 Part 2: AI-Powered Proposal Drafting\n# Analyze the content of the message (voice or text), interpret the user's request, and choose the right service pack.\n\nModules:\n\nAI Agent (Tools Agent) – Interprets the message and decides which proposal to generate.\n\nMemory & Tools (Simple Memory / Calculator / Get Info) – Helps with contextual memory, value computation (like price or delivery time), and external data lookup (e.g., services, client info).\n\n",
			{ name: 'Sticky Note1', color: 6, position: [1000, -60], width: 540, height: 1140 },
		),
	)
	.add(
		sticky(
			'## 📤 Part 3: Proposal Generation & Delivery\n# Automatically create a tailored proposal in PDF format and send it via WhatsApp.\n\nModules:\n\nAPITemplate.io (create.pdf) – Generates the PDF proposal using dynamic data.\n\nWhatsApp Business Cloud2 (messages.send) – Sends the final proposal to the user through WhatsApp.',
			{ name: 'Sticky Note2', color: 4, position: [1560, -60], width: 480, height: 1140 },
		),
	)
	.add(
		sticky(
			"## 📘 Voice2Propal – Smart WhatsApp Proposal Generator (Voice & Text)\nModule-by-Module Setup Guide\n# This guide breaks down the automation flow used to transcribe WhatsApp voice messages (or read text messages), analyze the request, and return a personalized business proposal in PDF format — all automatically.\n\n# 🧩 What You’ll Need\n## To launch this automated proposal system, make sure you have the following tools and access:\n\n## ✅ WhatsApp Business Cloud API\n## (with a registered number + webhook configured)\n## ✅ OpenAI API Key\n## (for Whisper audio transcription and GPT-4/GPT-3.5 processing)\n## ✅ APITemplate.io account\n## (for generating dynamic PDFs from templates)\n## ✅ Airtable account (free plan is enough)\n## (used for storing pack info, services, client data)\n## ✅ n8n instance (cloud or self-hosted with HTTPS)\n## ✅ Basic n8n familiarity\n\n## ⏱️ Estimated setup time: 45–90 minutes\n\n## Created by Floyd Mahou\n\n# 🟫 Step 1 – Capture & Transcribe WhatsApp Messages\nModules:\n\n## WhatsApp Trigger – Listens for incoming WhatsApp messages.\n## Split Out – Breaks apart compound messages if necessary.\n## Switch (Rules) – Determines if message is a voice note or plain text.\n## WhatsApp Business Cloud (media.mediaUrlGet) – Retrieves media file URL from Meta API.\n## HTTP Request – Downloads the voice file.\n## OpenAI (Whisper) – Transcribes the audio into readable text.\n## Edit Fields / Edit Fields1 – Cleans or reformats transcription or direct text input.\n## What Happens:\n## Incoming WhatsApp messages are filtered: if it's a voice message, it's transcribed. If it's text, it's passed as-is. The result is a clean input for AI analysis in the next step.\n\n# 🟩 Step 2 – Analyze User Intent & Select Proposal Pack\nModules:\n\n## AI Agent (Tools Agent) – Central brain that analyzes user input and determines the right pack (using reasoning, keywords, etc.).\n## Memory – Temporarily holds key context like client name, request, or past answers.\n## Calculator – Computes dynamic values like duration or pricing (if applicable).\n## Get Info (search record) – Pulls pack or service data from Airtable (name, description, inclusions, price, etc.).\n## Key Feature:\n\n## 💡 Your AI agent doesn’t just respond — it reasons based on the user’s input. It matches the request to the right pack by analyzing keywords like “AI automation”, “invoice bot”, or “support chatbot”, then pulls the right fields from Airtable.\n\n# 🟥 Step 3 – Generate & Send Personalized Proposal\n# Modules:\n\n## APITemplate.io (create.pdf) – Builds a professional-looking proposal PDF from dynamic fields filled by the AI agent.\n## WhatsApp Business Cloud2 (messages.send) – Sends the final PDF to the user via WhatsApp.\n## Pro Tip (Optional Enhancement):\n## You could include a voice-generated summary (e.g. via ElevenLabs) to explain the PDF content in audio form, for accessibility or “wow” effect.\n\n# 🔐 Security Best Practices\n\n## Use environment variables for API keys and tokens.\n## Protect webhooks with signature verification or custom headers.\n## Limit access to only necessary scopes on each external app.\n## Add error branches or fallback modules in case:\n\n## Audio file is corrupted\n## No pack is matched\n## Airtable query fails\n\n# 📌 Additional Notes\n\n## The AI Agent can evolve by adding:\n## User memory (to personalize tone or recognize returning clients)\n## Upsell logic (if user needs >1 service)\n## Follow-up automation (after proposal is opened)",
			{ name: 'Sticky Note3', color: 3, position: [-620, 1120], width: 2680, height: 3600 },
		),
	);
