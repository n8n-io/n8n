const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.jotFormTrigger',
			version: 1,
			config: {
				parameters: { form: '252801824783057' },
				credentials: {
					jotFormApi: { id: 'credential-id', name: 'jotFormApi Credential' },
				},
				position: [-1024, 256],
				name: 'JotForm Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: {
							'Full Name': "={{ $json['Full Name'].first }} {{ $json['Full Name'].last }}",
							'client type': "={{ $json['I am a...'] }}",
							'Phone Number': "={{ $json['Phone Number'].full }}",
							'Brief Message': "={{ $json['Brief Message'] }}",
							'Email Address': "={{ $json['Email Address'] }}",
							'Legal Service of Interest': "={{ $json['Legal Service of Interest'] }}",
							'How Did You Hear About Us?': "={{ $json['How Did You Hear About Us?'] }}",
						},
						schema: [
							{
								id: 'Full Name',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Full Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Email Address',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Email Address',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Phone Number',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Phone Number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'client type',
								type: 'string',
								display: true,
								required: false,
								displayName: 'client type',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Legal Service of Interest',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Legal Service of Interest',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Brief Message',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Brief Message',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'How Did You Hear About Us?',
								type: 'string',
								display: true,
								required: false,
								displayName: 'How Did You Hear About Us?',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Email Address'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1invngp2z_3ZMe_Qcs5XioDkAs50DSXT-Pl4ibPLXyA0/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1invngp2z_3ZMe_Qcs5XioDkAs50DSXT-Pl4ibPLXyA0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1invngp2z_3ZMe_Qcs5XioDkAs50DSXT-Pl4ibPLXyA0/edit?usp=drivesdk',
						cachedResultName: 'Law Client Enquiries',
					},
					authentication: 'serviceAccount',
				},
				credentials: {
					googleApi: { id: 'credential-id', name: 'googleApi Credential' },
				},
				position: [-800, 256],
				name: 'Append or update row in sheet',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '=<prompt>\n    <persona>\n        <name>Alex</name>\n        <role>Expert, friendly, and efficient legal intake assistant</role>\n        <company>VTR Law Firm</company>\n    </persona>\n\n    <client_info>\n        <name>{{ $json["Full Name"] }}</name>\n        <service_interest>{{ $json["Legal Service of Interest"] }}</service_interest>\n        <message>{{ $json["Brief Message"] }}</message>\n    </client_info>\n\n    <task>\n        Draft a concise, professional, and welcoming WhatsApp message to the potential client using their submitted information.\n    </task>\n\n    <instructions>\n        <message_structure>\n            <item>Greet the client by their first name.</item>\n            <item>Thank them for contacting VTR Law Firm regarding their interest in the specified service.</item>\n            <item>Briefly acknowledge their message to show you\'ve read it.</item>\n            <item>Inform them that the next step is a *complimentary consultation* to discuss their matter in more detail.</item>\n            <item>Provide a clear call to action to schedule the meeting using this link: https://calendly.com/vtr-law-firm/consultation</item>\n            <item>Sign off professionally with your name and the firm\'s name.</item>\n        </message_structure>\n    </instructions>\n\n    <output_constraints>\n        <rule>The output must be formatted as a single, average-sized WhatsApp message.</rule>\n        <rule>Use asterisks (*) for bolding key phrases.</rule>\n        <rule>Do not include the client\'s phone number or email address in your response.</rule>\n        <rule>Generate only the WhatsApp message text itself.</rule>\n    </output_constraints>\n\n    <example>\n        <description>Based on the instructions and sample data, the generated message should look like this.</description>\n        <output_message>\nHi Abhi,\n\nThank you for contacting VTR Law Firm about your query related to Business Law. I\'ve reviewed the message you sent regarding the situation with your partner.\n\nThe best next step is to schedule a *complimentary, no-obligation consultation* with one of our legal experts to discuss this in more detail.\n\nYou can schedule a call with our legal executive by replying your available times\n\nWe look forward to speaking with you.\n\nBest regards,\nAlex | VTR Law Firm\n        </output_message>\n    </example>\n</prompt>',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {} },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model',
						},
					}),
				},
				position: [-528, 256],
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
					phoneNumberId: '838262432698376',
					additionalFields: {},
					recipientPhoneNumber:
						"={{ $('Append or update row in sheet').item.json['Phone Number'] }}",
				},
				credentials: {
					whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
				},
				position: [-144, 256],
				name: 'Send message',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.whatsAppTrigger',
			version: 1,
			config: {
				parameters: {
					options: { messageStatusUpdates: ['delivered'] },
					updates: ['messages'],
				},
				credentials: {
					whatsAppTriggerApi: { id: 'credential-id', name: 'whatsAppTriggerApi Credential' },
				},
				position: [240, 320],
				name: 'WhatsApp Trigger',
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
								id: 'c2380501-f59a-4075-b335-8ae3b7f64788',
								operator: { type: 'string', operation: 'empty', singleValue: true },
								leftValue: '={{ $json.messages[0].text.body }}',
								rightValue: '',
							},
						],
					},
				},
				position: [496, 320],
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '=<prompt>\n    <persona>\n        <name>Alex</name>\n        <role>Professional and friendly legal scheduling assistant</role>\n        <company>VTR Law Associates</company>\n    </persona>\n\n    <context>\n        <timestamp>\n            The current date and time is {{ $now.toFormat("DDDD, HH:mm:ss ZZZZ") }}. You must use this information only to correctly interpret relative time requests from the user (like "tomorrow," "next Tuesday," or "in two hours").\n        </timestamp>\n    </context>\n\n    <instructions>\n        <task>\n            When a user wants to schedule a legal consultation, follow these steps precisely. Use the provided tools and context to answer the user\'s question.\n        </task>\n        \n        <procedure>\n            <step n="1">\n                <description>Find User Details: First, use the \'Know about the user enquiry\' tool to find the user\'s requirement details, such as their email address and the reason for their legal enquiry.</description>\n                <tool>Know about the user enquiry</tool>\n            </step>\n            \n            <step n="2">\n                <description>Gather Missing Details: Ask the user for their preferred date and time for the consultation. If you could not find the user\'s email address in the previous step, politely ask for it now for the calendar invitation.</description>\n            </step>\n            \n            <step n="3">\n                <description>Check Availability: Use the \'GET MANY EVENTS OF DAY THE USER ASKED\' tool to check for existing events on the user\'s requested date.</description>\n                <tool>GET MANY EVENTS OF DAY THE USER ASKED</tool>\n            </step>\n            \n            <step n="4">\n                <description>Handle the Outcome based on availability:</description>\n                <condition case="time available">\n                    <action>Use the \'Create an event\' tool. Set the event title to "Legal Consultation - VTR Law Associates" and add the user\'s email as an attendee.</action>\n                    <action>Confirm with the user that the consultation is successfully booked.</action>\n                    <tool>Create an event</tool>\n                </condition>\n                <condition case="time unavailable">\n                    <action>Do not create an event.</action>\n                    <action>Inform the user that the requested time is booked and suggest specific alternative times based on the availability you found.</action>\n                </condition>\n            </step>\n        </procedure>\n        \n        <general_instruction>Handle greetings naturally without needing the context.</general_instruction>\n    </instructions>\n\n    <user_input>\n        <message>{{ $json.messages[0].text.body }}</message>\n    </user_input>\n\n    <output_format>\n        <style>WhatsApp</style>\n        <rules>\n            <rule>Use italics for emphasis.</rule>\n            <rule>Use bold for key points.</rule>\n            <rule>Use bullet lists (•) for lists.</rule>\n            <rule>Keep responses short, clear, and conversational.</rule>\n            <rule>Avoid markdown headers or code blocks.</rule>\n        </rules>\n    </output_format>\n\n    <constraints>\n        <fallback>\n            If the answer cannot be found in the context, reply: "I\'m sorry, my primary role is to schedule consultations. I don\'t have the information to answer that question."\n        </fallback>\n    </constraints>\n</prompt>',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					tools: [
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
									additionalFields: {
										summary:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Summary', ``, 'string') }}",
										attendees: [
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('attendees0_Attendees', ``, 'string') }}",
										],
										description:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Description', ``, 'string') }}",
										sendUpdates: 'all',
										guestsCanInviteOthers: true,
									},
								},
								credentials: {
									googleCalendarOAuth2Api: {
										id: 'credential-id',
										name: 'googleCalendarOAuth2Api Credential',
									},
								},
								name: 'Create an event',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleSheetsTool',
							version: 4.7,
							config: {
								parameters: {
									options: {},
									filtersUI: { values: [{ lookupColumn: 'Phone Number' }] },
									sheetName: {
										__rl: true,
										mode: 'list',
										value: 'gid=0',
										cachedResultUrl:
											'https://docs.google.com/spreadsheets/d/1invngp2z_3ZMe_Qcs5XioDkAs50DSXT-Pl4ibPLXyA0/edit#gid=0',
										cachedResultName: 'Sheet1',
									},
									documentId: {
										__rl: true,
										mode: 'list',
										value: '1invngp2z_3ZMe_Qcs5XioDkAs50DSXT-Pl4ibPLXyA0',
										cachedResultUrl:
											'https://docs.google.com/spreadsheets/d/1invngp2z_3ZMe_Qcs5XioDkAs50DSXT-Pl4ibPLXyA0/edit?usp=drivesdk',
										cachedResultName: 'Law Client Enquiries',
									},
									authentication: 'serviceAccount',
								},
								credentials: {
									googleApi: { id: 'credential-id', name: 'googleApi Credential' },
								},
								name: 'Know about the user enquiry',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									options: {},
									timeMax:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Before', ``, 'string') }}",
									timeMin:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('After', ``, 'string') }}",
									calendar: {
										__rl: true,
										mode: 'list',
										value: 'user@example.com',
										cachedResultName: 'user@example.com',
									},
									operation: 'getAll',
									returnAll: true,
								},
								credentials: {
									googleCalendarOAuth2Api: {
										id: 'credential-id',
										name: 'googleCalendarOAuth2Api Credential',
									},
								},
								name: 'GET MANY EVENTS OF DAY THE USER ASKED',
							},
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: "={{ $('If').item.json.contacts[0].wa_id }}",
								sessionIdType: 'customKey',
							},
							credentials: {
								postgres: { id: 'credential-id', name: 'postgres Credential' },
							},
							name: 'Postgres Chat Memory',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {} },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Google Gemini Chat Model1',
						},
					}),
				},
				position: [912, 336],
				name: 'AI Agent1',
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
					phoneNumberId: '838262432698376',
					additionalFields: {},
					recipientPhoneNumber: "={{ $('WhatsApp Trigger').item.json.contacts[0].wa_id }}",
				},
				credentials: {
					whatsAppApi: { id: 'credential-id', name: 'whatsAppApi Credential' },
				},
				position: [1424, 336],
				name: 'Send message1',
			},
		}),
	)
	.add(
		sticky(
			'## Part A: New Lead Intake & Welcome Message\n\nThis flow triggers when a potential client fills out your JotForm. It saves their data and sends an immediate welcome message.\n\n* **1. JotForm Trigger** 📥\n    * **Function**: This node is the starting point. It actively listens for new submissions on your specific JotForm. When someone hits \'submit\', this node wakes up and grabs all the information they entered.\n\n* **2. Append or update row in sheet** 📝\n    * **Function**: This node acts as your record-keeper. It takes the data from the JotForm and adds it as a new row in your "Law Client Enquiries" Google Sheet. If an entry with the same email already exists, it simply updates that row with the new information.\n\n* **3. AI Agent** 🤖\n    * **Function**: This is the message writer. It takes the client\'s name and service of interest from the previous step and uses a pre-written prompt to craft a personalized, professional welcome message.\n\n* **4. Google Gemini Chat Model** 🧠\n    * **Function**: This is the "brain" that powers the AI Agent. The agent sends its prompt and the client\'s info to this model, and Gemini generates the actual text for the WhatsApp message.\n\n* **5. Send message (WhatsApp)** 📲\n    * **Function**: This node sends the final message. It takes the text generated by the AI and delivers it as a WhatsApp message to the phone number the client provided in the form.\n\n***\n\n',
			{ position: [-1072, -352], width: 1136, height: 1056 },
		),
	)
	.add(
		sticky(
			'\n## Part B: AI-Powered Appointment Scheduling\n\nThis flow activates when the client replies to the welcome message. An AI agent then chats with them to book a consultation.\n\n* **1. WhatsApp Trigger** 💬\n    * **Function**: This node listens for incoming WhatsApp messages. When a client replies to your business number, it kicks off the scheduling conversation.\n\n* **2. If** 🤔\n    * **Function**: A simple checkpoint. It checks if the incoming message has text. If it\'s an empty message or just a delivery receipt, the workflow stops. If there is text, it proceeds.\n\n* **3. AI Agent1** 👩‍💼\n    * **Function**: This is your AI scheduling assistant, "Alex". It manages the back-and-forth conversation with the client to find a suitable meeting time. It uses a set of "tools" to perform actions like checking your calendar.\n\n* **4. Postgres Chat Memory** 💾\n    * **Function**: This node gives the AI a memory. It saves the conversation history for each client, so if the chat is long, the AI can remember what was discussed previously.\n\n* **5. The AI\'s Tools (What it can do)** 🛠️\n    * **Know about the user enquiry (Sheets Tool)**: Allows the AI to look up the client\'s original submission details from the Google Sheet using their phone number.\n    * **GET MANY EVENTS... (Calendar Tool)**: Allows the AI to check your Google Calendar for existing appointments on a date the client requests.\n    * **Create an event (Calendar Tool)**: Allows the AI to book the appointment directly on your Google Calendar once a time is confirmed.\n\n* **6. Send message1 (WhatsApp)** 🗣️\n    * **Function**: This node sends the AI\'s conversational replies back to the client. This could be a confirmation ("You\'re all booked!"), a question ("Is 3 PM tomorrow okay?"), or a suggestion for an alternative time.',
			{ name: 'Sticky Note1', position: [192, -336], width: 1456, height: 1056 },
		),
	);
