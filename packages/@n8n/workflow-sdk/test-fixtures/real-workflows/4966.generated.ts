const wf = workflow('e0BX3fhHvcBuQTBU', 'whats app agent community', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.whatsAppTrigger',
			version: 1,
			config: {
				parameters: { options: {}, updates: ['messages'] },
				credentials: {
					whatsAppTriggerApi: { id: 'credential-id', name: 'whatsAppTriggerApi Credential' },
				},
				position: [380, 440],
				name: 'when message received',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDocs',
			version: 2,
			config: {
				parameters: {
					operation: 'get',
					documentURL: '=1Uv1WYCcXNlp-jaeJ7-3MNxWYfPj-wcYnJv4_colXSvk',
				},
				position: [600, 440],
				name: "company's knowledge",
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aiTransform',
			version: 1,
			config: {
				parameters: {
					jsCode:
						'const googleDocs = $input.all().map((item) => item.json);\nconst whatsappMessages = $("when message received")\n  .all()\n  .map((item) => item.json);\n\nconst date = new Date();\nconst formattedDate = `${date.getMonth() + 1} ${date.getDate()}, ${date.getFullYear()}`;\n\nconst docText = googleDocs[0].content.split("\\n").join(" ");\n\nconst body = whatsappMessages[0].messages[0].text.body;\n\nconst finalPrompt = `Today\'s date is: ${formattedDate}\\n\\n${docText}\\n\\nUser\'s question:\\n${body}`;\n\nreturn { finalPrompt };\n',
					instructions:
						"Write code to:\n• Get today’s date formatted “Month Day, Year”\n• Extract the Google Doc’s plain text by joining its body.content textRuns\n• Extract the WhatsApp message from messages[0].text.body\n• Build a field finalPrompt exactly as:\n\nvbnet\nCopy\nEdit\nToday's date is: [date]\n\n[doc text]\n\nUser's question:\n[body]\n• Return finalPrompt only.",
					codeGeneratedForPrompt:
						"Write code to:\n• Get today’s date formatted “Month Day, Year”\n• Extract the Google Doc’s plain text by joining its body.content textRuns\n• Extract the WhatsApp message from messages[0].text.body\n• Build a field finalPrompt exactly as:\n\nvbnet\nCopy\nEdit\nToday's date is: [date]\n\n[doc text]\n\nUser's question:\n[body]\n• Return finalPrompt only.",
				},
				position: [820, 440],
				name: 'Prepare Prompt',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '={{ $json.finalPrompt }}\n\n\n',
					options: {
						systemMessage:
							'You are [Company]’s support assistant for Black Ball Sporting Club.\n• Do NOT include any preamble such as “Based on the document you provided” or “Okay, [Name].” Just jump straight to the answer.\n* don\'t ever start your response with"based on the document you provided" , or "According to the document", don\'t mention any documents at all , also don\'t mention today\'s date unless you asked\n',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: "={{ $('when message received').item.json.contacts[0].wa_id }}",
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: {
								options: {},
								modelName: 'models/gemini-2.5-flash-preview-04-17-thinking',
							},
							name: 'Google Gemini Chat Model',
						},
					}),
				},
				position: [1040, 440],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.dateTime',
			version: 2,
			config: { parameters: { options: {} }, position: [1420, 440], name: 'Date & Time' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							User: "={{ $('when message received').item.json.messages[0].from }}",
							Message: "={{ $('when message received').item.json.messages[0].text.body }}",
							Response: "={{ $('AI Agent').item.json.output }}",
							Timestamp: '={{ $json.currentDate }}',
						},
						schema: [
							{
								id: 'Timestamp',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Timestamp',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'User',
								type: 'string',
								display: true,
								required: false,
								displayName: 'User',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Message',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Message',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Response',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Response',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 5',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 5',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 6',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 6',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 7',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 7',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 8',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 8',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 9',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 9',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 10',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 10',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 11',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 11',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 12',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 12',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 13',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 13',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 14',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 14',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 15',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 15',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 16',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 16',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 17',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 17',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 18',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 18',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 19',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 19',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 20',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 20',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 21',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 21',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 22',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 22',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 23',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 23',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 24',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 24',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 25',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 25',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Column 26',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Column 26',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Timestamp'],
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
							'https://docs.google.com/spreadsheets/d/1Ub8QIhGPOm1G4ylaM48iMAous1zvBO3YDl-38AKDuFw/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1Ub8QIhGPOm1G4ylaM48iMAous1zvBO3YDl-38AKDuFw',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1Ub8QIhGPOm1G4ylaM48iMAous1zvBO3YDl-38AKDuFw/edit?usp=drivesdk',
						cachedResultName: 'Chat Logs',
					},
				},
				position: [1640, 440],
				name: 'Google Sheets',
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
						"// within24h?  – run once per item\n// Meta (WhatsApp) timestamp arrives as seconds since epoch\nconst lastTs = Number($('when message received').first().json.messages[0].timestamp) * 1000;   // → ms\nconst withinWindow = Date.now() - lastTs < 24 * 60 * 60 * 1000;\n\nreturn [{ json: { withinWindow, answer: $json.answer, userId: $json.userId } }];",
				},
				position: [1860, 440],
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
				position: [2080, 440],
				name: 'If',
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
						"// cleanAnswer – run once per item\nlet txt = $('AI Agent').first().json.output || '';\n\n// 1. Remove bold / italic / strike markers\ntxt = txt.replace(/[*_~]+/g, '');\n\n// 2. Convert [Texto](https://url) → Texto https://url\ntxt = txt.replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)/g, '$1 $2');\n\n// 3. Collapse 3+ blank lines\ntxt = txt.replace(/\\n{3,}/g, '\\n\\n').trim();\n\n// 4. Remove the unwanted source-reference preamble\ntxt = txt.replace(/^.*?based on the document you provided[,:]?\\s*/i, '');\n\nreturn [{ json: { answer: txt } }];\n",
				},
				position: [2300, 340],
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
					phoneNumberId: '=641448739058783',
					additionalFields: {},
					recipientPhoneNumber: "={{ $('when message received').item.json.contacts[0].wa_id }}",
				},
				position: [2520, 340],
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
					phoneNumberId: '641448739058783',
					recipientPhoneNumber: "={{ $('when message received').item.json.contacts[0].wa_id }}",
				},
				position: [2300, 540],
				name: 'Send Pre-approved Template Message to Reopen the Conversation',
			},
		}),
	)
	.add(
		sticky(
			"**Smart WhatsApp AI Assistant Using Google Docs**\n\n📌 What it does:\nAnswers WhatsApp questions instantly using internal document knowledge. No training needed — just update the doc.\n\n📄 Reads a live Google Doc\n💬 Receives WhatsApp messages\n🧠 Crafts AI prompt using today's date + message + doc\n⚡ Uses OpenAI/Gemini to generate a response\n📤 Sends reply back over WhatsApp\n\n🧰 Prerequisites:\n- WhatsApp Business Cloud API account\n- Google Doc with your business content\n- OpenAI or Gemini API \nkey\n- you can setup the postgress memory using the following link:\nhttps://www.youtube.com/watch?v=JjBofKJnYIU\n\n\n🛠 Setup:\n1. Paste your Google Doc ID in the Docs node\n2. Connect WhatsApp Cloud API (Meta)\n3. Map the message field\n4. Connect OpenAI or Gemini\n5. Publish and test with a live message\n\nYou’re done!\n🤝 Need Help Setting It Up?\nIf you'd like help connecting your WhatsApp Business API, setting up Google Docs access, or customizing this AI assistant for your business or clients…\n\n📩 I offer setup, branding, and customization services:\nWhatsApp Cloud API setup & verification\n\nGoogle OAuth & Doc structure guidance\n\nAI model configuration (OpenAI / Gemini)\n\nBranding & prompt tone customization\n\nLogging, reporting, and escalation logic\n\nJust send a message via:\n\nEmail: tharwat.elsayed2000@gmail.com\n\nWhatsApp: +201061803236",
			{ height: 1420 },
		),
	);
