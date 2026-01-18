const wf = workflow(
	'',
	'🎬 Instantly Turn Ideas into Viral Instagram Reel Scenarios 🤖 (Telegram, AI Agent)',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.1,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [320, -80],
				name: 'Start: Receive Message on Telegram',
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
								outputKey: 'Audio',
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
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.message.voice.file_id }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Text',
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
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: '={{ $json.message.text || "" }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Error',
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
											operator: { type: 'string', operation: 'exists', singleValue: true },
											leftValue: 'error',
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
				position: [540, -80],
				name: 'Route by Input Type',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					fileId: '={{ $json.message.voice.file_id }}',
					resource: 'file',
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [760, -280],
				name: 'Get Voice Message',
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
				position: [980, -280],
				name: 'Transcribe Voice to Text',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: '={{ $json.text }}',
					options: {
						systemMessage:
							'=You are a marketing expert with 25 years of experience.\nYou studied under the best U.S. marketers and copywriters—Russell Brunson, Dan Kennedy, Gary Halbert, Alex Hormozi, Todd Brown, and others.\n\nYou also master viral Instagram Reels that rack up millions of views.\nYou know exactly how to grab and hold attention using top-tier marketing and psychology methods.\nYou command emotional storytelling and leverage psychological influence principles, blending brilliant techniques from legends such as Gary Bencivenga, Joe Sugarman, Dan Kennedy, Chris Haddad, John Carlton, David Ogilvy, Seth Godin, and more.\n\nWork at full power—it\'s extremely important to me to get the best possible result.\n\nYou write hooks no one can scroll past.\n\nWrite in simple, lively language—as if speaking straight into the camera.\nAvoid complicated wording, "info-style" delivery, and templates.\nShort sentences, spoken tone, no "As an expert, I think…," no fluff.\nImagine the person records this Reel in one take—emotional, with rhythm, pauses, energy.\n\nBelow you\'ll find the idea for the Reel (transcript of the user\'s voice note):\n\n"{text}"\n\nBased on this, create:\n	1.	A Reel script (30–60 seconds) in the format:\n• HOOK — eye-catching first line\n• SUBTITLE — amplifies curiosity & value promise\n• BODY — explanation / story / argument / core message\n• CTA — light, non-generic call to action\n	2.	Three hook variants—no clichés, no emojis, but designed to stand out in the timeline\n	3.	A short Reel caption (1–2 lines)—to appear under the Reel\n\n❗ Important: The viewer has already watched the Reel and is now reading the caption.\nYour job: keep their attention, trigger an "aha" moment, or spark the desire to save/share.\n\nThe caption should\n– be easy to understand\n– avoid repeating lines from the video\n– strengthen the Reel\'s core message\n– motivate an internal reaction or action\n\nExample openings:\n— "And here\'s what almost every expert overlooks…"\n— "Don\'t forget this before your next Reel post"\n— "Ever experienced this too?"\n\n❌ Avoid clichés like "Hey guys," "Watch until the end," "Subscribe to my channel."\n\n📸 Additional task – VISUAL IDEA for the Reel\nBased on the content, tone, and mood, give 1–2 concrete recommendations for suitable footage or imagery.\nThe visual idea should support the hook, amplify the emotion, and captivate the viewer within the first 2 seconds.\n\nNo generic suggestions like "just show yourself on camera." Think concrete and cinematic:\n– Exactly what should be visible?\n– What happens in the background?\n– How\'s the lighting / mood?\n– Any visual metaphor or strong movement?\n\nExamples:\n— "Dark room, only the face in focus, emotional close-up, camera slowly moving toward the person"\n— "Cut between old Insta posts and the person staring seriously into the lens—then switch to a smiling face"\n— "Smartphone angrily tossed aside, then close-up of a calm, confident face delivering the message"\n\n📦 Return the result in this format:\n\n⸻\n\n💡 Hook (variants):\n	1.	…\n	2.	…\n	3.	…\n\n🎬 Script:\n• Hook: …\n• Subtitle: …\n• Body: …\n• CTA: …\n\n📝 Reel Caption:\n…\n\n📸 Visual Idea:\n…',
					},
					promptType: 'define',
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
									value: 'gpt-4o',
									cachedResultName: 'gpt-4o',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'AI Model: GPT-4o',
						},
					}),
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey:
									"={{ $('Start: Receive Message on Telegram').item.json.message.chat.id }}",
								sessionIdType: 'customKey',
								contextWindowLength: 10,
							},
							name: 'Memory for Chat Context',
						},
					}),
					tools: [
						tool({
							type: 'n8n-nodes-base.googleSheetsTool',
							version: 4.5,
							config: {
								parameters: {
									columns: {
										value: {
											Date: '={{ $now.toFormat("dd-MM-yyyy HH:mm") }}',
											Script:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('______', `Scenario Reels`, 'string') }}",
											Status: 'Note',
											Description:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('________', `Description Reels`, 'string') }}",
										},
										schema: [
											{
												id: 'Script',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Script',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Description',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Description',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Status',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Status',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'Date',
												type: 'string',
												display: true,
												required: false,
												displayName: 'Date',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
									options: {},
									operation: 'append',
									sheetName: { __rl: true, mode: 'list', value: '' },
									documentId: { __rl: true, mode: 'id', value: '' },
								},
								credentials: {
									googleSheetsOAuth2Api: {
										id: 'credential-id',
										name: 'googleSheetsOAuth2Api Credential',
									},
								},
								name: 'Optional: Log Ideas to Google Sheets',
							},
						}),
					],
				},
				position: [1232, -180],
				name: 'Generate Reels Scenario with AI',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '={{ $json.output }}',
					chatId: "={{ $('Start: Receive Message on Telegram').item.json.message.chat.id }}",
					additionalFields: { appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1640, -180],
				name: 'Send Scenario to Telegram',
			},
		}),
	)
	.output(1)
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
								name: 'text',
								type: 'string',
								value: '={{ $json.message.text }}',
							},
						],
					},
				},
				position: [980, -80],
				name: 'Set User Input',
			},
		}),
	)
	.output(2)
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
								name: 'Error',
								type: 'string',
								value: 'An error has occurred',
							},
						],
					},
				},
				position: [760, 120],
				name: 'Set Error Message',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '={{ $json.output }}',
					chatId: "={{ $('Start: Receive Message on Telegram').item.json.message.chat.id }}",
					additionalFields: { appendAttribution: false },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [980, 120],
				name: 'Send Error Message to Telegram',
			},
		}),
	)
	.add(
		sticky(
			'## 🚀 Quick Start Guide\n\n1. 🔐 Connect Your Accounts:\n	•	🤖 Telegram: Link your Start & Send nodes to your bot (Use https://telegram.me/BotFather to create a new bot)\n	•	🧠 OpenAI: Paste your API key in GPT-4o & Transcribe Audio nodes\n	•	📊 Google Sheets (Optional): To log ideas, connect your account and pick your spreadsheet, otherwise leave deactivated\n\n2. ✅ Activate Workflow:\nClick "Activate" (top-right)\n\n3. 💬 Send Your Idea:\nText or voice message your Reel idea to your Telegram bot\n\n4. 🎬 Get Your Scenario:\nReceive a ready-to-use Reel plan:\nHook ✨ Script ✍️ Caption 📝 Visual Idea 🎨',
			{ position: [100, -540], width: 540, height: 420 },
		),
	)
	.add(
		sticky('## Optional:\n💬 Ask your bot to store the generated scenario in your google sheet*', {
			name: 'Sticky Note1',
			position: [1640, 40],
			height: 120,
		}),
	);
