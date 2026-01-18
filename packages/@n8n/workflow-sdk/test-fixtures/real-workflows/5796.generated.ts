const wf = workflow(
	'I0Tzx8whIWYdQJVn',
	'Generate Avatar Videos from Latest AI News using Dumpling AI and HeyGen',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{}] } }, position: [-840, -95] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://app.dumplingai.com/api/v1/search-news',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "query": "AI Agent",\n  "language": "en",\n  "dateRange": "pastHour",\n  "page": "1"\n}\n',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-620, -95],
				name: 'Dumpling AI: Search AI News',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'news' },
				position: [-400, -95],
				name: 'Split: Individual News Items',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.limit',
			version: 1,
			config: {
				parameters: { maxItems: 4 },
				position: [-180, -95],
				name: 'Limit: Top 4 News Results',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://app.dumplingai.com/api/v1/scrape',
					method: 'POST',
					options: {},
					jsonBody: '={\n  "url": "{{ $json.link }}",\n  "cleaned": "true"\n}\n',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [40, -95],
				name: 'Dumpling AI: Scrape Article Content',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					options: {},
					fieldsToAggregate: { fieldToAggregate: [{ fieldToAggregate: 'content' }] },
				},
				position: [260, -95],
				name: ' Combine: Merge Scraped News Content',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: "=Here is the topic:{{ $json.content }}\n\n\nHere is the news article:{{ $('Dumpling AI: Search AI News').item.json.searchParameters.q }}\n",
					options: {
						systemMessage:
							'=You are a creative content writer. I will give you a news article and the intended topic or angle I want to focus on. Your job is to turn that into a short, engaging script suitable for a 30 to 60-second video. Write in a natural, conversational tone that sounds like someone talking to a general audience. Keep it simple, clear, and focused on the most interesting or important angle based on the topic I provide. Avoid technical jargon. The goal is to grab attention and make the message easy to understand and relatable. Very important: Output the final script as a single line only — no new lines, no paragraph breaks, no titles or formatting. Just plain text in one continuous sentence.',
					},
					promptType: 'define',
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
							name: ' GPT-4o Model',
						},
					}),
				},
				position: [480, -95],
				name: 'GPT-4o Agent: Write Video Script',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.heygen.com/v2/video/generate',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "video_inputs": [\n    {\n      "character": {\n        "type": "avatar",\n        "avatar_id": "",\n        "avatar_style": "normal"\n      },\n      "voice": {\n        "type": "text",\n        "input_text": "{{ $json.output }}",\n        "voice_id": "",\n        "speed": 1.1\n      }\n    }\n  ],\n  "dimension": {\n    "width": 1280,\n    "height": 720\n  }\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					headerParameters: { parameters: [{ name: 'accept', value: 'application/json' }] },
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [856, -95],
				name: ' HeyGen: Generate Avatar Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [1076, -95], name: 'Wait: For HeyGen to Process' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.heygen.com/v1/video_status.get',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [{ name: 'video_id', value: '={{ $json.data.video_id }}' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1296, -95],
				name: 'HeyGen: Check Video Status',
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
								id: 'fbed8c0e-f2ad-4519-9eb9-1423731654ea',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.data.status }}',
								rightValue: 'completed',
							},
						],
					},
				},
				position: [1516, -170],
				name: 'IF: Video Completed?',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: { 'Video link': '={{ $json.data.video_url }}' },
						schema: [
							{
								id: 'Video link',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Video link',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Video link'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1AUADRf5MafbEazIZKuEBuDb7ETBEpCI0WSEnxFDJqn4/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1AUADRf5MafbEazIZKuEBuDb7ETBEpCI0WSEnxFDJqn4/edit?usp=drivesdk',
						cachedResultName: 'Videos',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1736, -220],
				name: 'Google Sheets: Log Video URL',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { amount: 20 },
				position: [1736, 5],
				name: ' Wait: Retry if Not Complete',
			},
		}),
	)
	.add(
		sticky(
			'### 🎥 Workflow Overview: Auto-Generate AI News Avatar Videos\n\nThis workflow runs every hour and creates an avatar-style video summarizing \nthe latest AI-related news.\n\n**Here’s what it does:**\n- Searches for recent AI Agent news using Dumpling AI\n- Scrapes the content from the top 4 articles\n- Merges article content into one body of text\n- Uses GPT-4o to generate a short, casual video script\n- Sends the script to HeyGen to create an avatar video\n- Waits for the video to finish rendering\n- Logs the video link in a Google Sheet\n\n🛠 Tools Used:\n- Dumpling AI (News search + scraping)\n- OpenAI GPT-4o (Script writing)\n- HeyGen (Video generation)\n- Google Sheets (Tracking links)\n\n📌 Credentials Required:\n- Dumpling AI API (via HTTP Header credentials)\n- HeyGen API key (via Bearer YOUR_TOKEN_HERE credential)\n- Google Sheets + OpenAI account\n\nCustomize the topic (e.g., change "AI Agent" to something else), avatar, voice, \nor video style to suit your brand.\n',
			{ name: 'Sticky Note2', position: [-840, -700], width: 800, height: 660 },
		),
	);
