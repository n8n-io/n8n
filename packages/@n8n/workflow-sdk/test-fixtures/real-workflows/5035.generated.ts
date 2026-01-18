const wf = workflow(
	'eFkkWqS5KdrxZ43P',
	'Automate video creation with Veo3 and auto-post to Instagram, TikTok via Blotato - vide',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{}] } },
				position: [500, 560],
				name: 'Trigger: Run Daily Script Generator',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: 'Give me an idea about [a Yeti speaking to a camera and doing a Vlog through his selfie stick]. ',
					options: {
						systemMessage:
							'=You are an AI designed to generate 1 immersive, realistic idea based on a user-provided topic. Your output must be formatted as a JSON array (single line) and follow all the rules below exactly.\n\nRULES:\n\nOnly return 1 idea at a time.\n\nThe user will provide a key topic (e.g. “urban farming,” “arctic survival,” “street food in Vietnam”).\n\nThe Idea must:\n\nBe under 13 words.\n\nDescribe an interesting and viral-worthy moment, action, or event related to the provided topic.\n\nCan be as surreal as you can get, doesn\'t have to be real-world!\n\nInvolves a character.\n\nThe Caption must be:\n\nShort, punchy, and viral-friendly.\n\nInclude one relevant emoji.\n\nInclude exactly 12 hashtags in this order:\n** 4 topic-relevant hashtags\n** 4 all-time most popular hashtags\n** 4 currently trending hashtags (based on live research)\n\nAll hashtags must be lowercase.\n\nSet Status to "for production" (always).\n\nThe Environment must:\n\nBe under 20 words.\n\nMatch the action in the Idea exactly.\n\nClearly describe:\n\nWhere the event is happening (e.g. rooftop, jungle trail, city alley, frozen lake)\n\nKey visuals or background details (e.g. smoke rising, neon lights, fog, birds overhead)\n\nMain participants (e.g. farmer, cook, mechanic, rescue team, animal)\n\nStyle of scene (e.g. cinematic realism, handheld docu-style, aerial tracking shot, macro close-up)\n\nOk with fictional settings\n\nOUTPUT FORMAT (single-line JSON array):\n\n\n[\n  {\n    "Caption": "Short viral title with emoji #4_topic_hashtags #4_all_time_popular_hashtags #4_trending_hashtags",\n    "Idea": "Short idea under 13 words",\n    "Environment": "Brief vivid setting under 20 words matching the action",\n    "Status": "for production"\n  }\n]\n',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1,
							config: { name: 'Tool: Inject Creativity' },
						}),
					],
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample:
									'[\n  {\n    "Caption": "Diver Removes Nets Off Whale 🐋 #whalerescue #marinelife #oceanrescue #seahelpers #love #nature #instagood #explore #viral #savenature #oceanguardians #cleanoceans",\n    "Idea": "Diver carefully cuts tangled net from distressed whale in open sea",\n    "Environment": "Open ocean, sunlight beams through water, diver and whale, cinematic realism",\n    "Status": "for production"\n  }\n]\n',
							},
							name: 'Parser: Extract JSON from Idea',
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
									value: 'gpt-4.1',
									cachedResultName: 'gpt-4.1',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'LLM: Generate Idea & Caption (GPT-4.1)',
						},
					}),
				},
				position: [660, 560],
				name: 'AI Agent: Generate Video Concept',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							id: '==ROW()-1',
							idea: '={{ $json.output[0].Idea }}',
							caption: '={{ $json.output[0].Caption }}',
							production: '={{ $json.output[0].Status }}',
							environment_prompt: '={{ $json.output[0].Environment }}',
						},
						schema: [
							{
								id: 'id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'id',
								defaultMatch: true,
								canBeUsedToMatch: true,
							},
							{
								id: 'idea',
								type: 'string',
								display: true,
								required: false,
								displayName: 'idea',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'caption',
								type: 'string',
								display: true,
								required: false,
								displayName: 'caption',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'production',
								type: 'string',
								display: true,
								required: false,
								displayName: 'production',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'environment_prompt',
								type: 'string',
								display: true,
								required: false,
								displayName: 'environment_prompt',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'final_output',
								type: 'string',
								display: true,
								required: false,
								displayName: 'final_output',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['id'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1020, 560],
				name: 'Google Sheets: Save Script Idea',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '=Give me a Veo3 prompt for this idea:\n{{ $json.idea }}\n\nThis is the environment:\n{{ $json.environment_prompt }}\n\n',
					options: {
						systemMessage:
							'=SYSTEM PROMPT FOR GOOGLE VEO3 PROMPT AGENT\n\nYou are an AI agent that writes hyper-realistic, cinematic video prompts for Google VEO3. Each prompt should describe a short, vivid selfie-style video clip featuring one unnamed character speaking or acting in a specific moment. The final video should look like found footage or documentary-style film — grounded, realistic, and immersive.\n\nREQUIRED STRUCTURE (FILL IN THE BRACKETS BELOW):\n\n[Scene paragraph prompt here]\n\nMain character: [description of character]\nThey say: [insert one line of dialogue, fits the scene and mood].\nThey [describe a physical action or subtle camera movement, e.g. pans the camera, shifts position, glances around].\nTime of Day: [day / night / dusk / etc.]\nLens: [describe lens]\nAudio: (implied) [ambient sounds, e.g. lion growls, wind, distant traffic, birdsong]\nBackground: [brief restatement of what is visible behind them]\n\nRULES FOR PROMPT GENERATION\n\nSingle paragraph only, 750–1500 characters. No line breaks or headings.\n\nOnly one human character. Never give them a name.\n\nInclude one spoken line of dialogue and describe how it’s delivered.\n\nCharacter must do something physical, even if subtle (e.g. glance, smirk, pan camera).\n\nUse selfie-style framing. Always describe the lens, stock, and camera behavior.\n\nScene must feel real and cinematic — like a short clip someone might record on a stylized camera.\n\nAlways include the five key technical elements: Time of Day, Lens, Film Stock, Audio, and Background.\n\nDO NOT DO THIS:\n\nDon’t name the character.\n\nDon’t include more than one character.\n\nDon’t describe subtitles or on-screen text.\n\nDon’t break the paragraph or use formatting.\n\nDon’t write vague or abstract scenes — always keep them grounded in physical detail.',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1,
							config: { name: 'Tool: Build Prompt Structure' },
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
									value: 'gpt-4.1',
									cachedResultName: 'gpt-4.1',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'LLM: Format Prompt for Veo3 (GPT-4.1)',
						},
					}),
				},
				position: [1180, 560],
				name: 'AI Agent: Create Veo3-Compatible Prompt',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/veo3',
					body: '={ "prompt": "{{ $json.output }}" }\n',
					method: 'POST',
					options: { batching: { batch: { batchSize: 1, batchInterval: 2000 } } },
					sendBody: true,
					contentType: 'raw',
					authentication: 'genericCredentialType',
					rawContentType: 'application/json',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [520, 1100],
				name: 'Call Veo3 API to Generate Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [740, 1100], name: 'Wait for Veo3 Processing (5 mins)' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://queue.fal.run/fal-ai/veo3/requests/{{ $json.request_id }}',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1020, 1100],
				name: 'Retrieve Final Video URL from Veo3',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							idea: "={{ $('Google Sheets: Save Script Idea').first().json.idea }}",
							production: 'done',
							final_output: '={{ $json.video.url }}',
						},
						schema: [
							{
								id: 'id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'id',
								defaultMatch: true,
								canBeUsedToMatch: true,
							},
							{
								id: 'idea',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'idea',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'caption',
								type: 'string',
								display: true,
								required: false,
								displayName: 'caption',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'production',
								type: 'string',
								display: true,
								required: false,
								displayName: 'production',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'environment_prompt',
								type: 'string',
								display: true,
								required: false,
								displayName: 'environment_prompt',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'final_output',
								type: 'string',
								display: true,
								required: false,
								displayName: 'final_output',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
								display: true,
								removed: true,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['idea'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1340, 1100],
				name: 'Google Sheets: Log Final Video Output',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: {},
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [520, 1440],
				name: 'Get my video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					mode: 'raw',
					options: {},
					jsonOutput:
						'{\n  "instagram_id": "1111",\n  "youtube_id": "1111",\n  "threads_id": "1111",\n  "tiktok_id": "1111",\n  "facebook_id": "1111",\n  "facebook_page_id": "1111",\n  "twitter_id": "1111",\n  "linkedin_id": "1111",\n  "pinterest_id": "1111",\n  "pinterest_board_id": "1111",\n  "bluesky_id": "1111"\n}\n',
				},
				position: [420, 1680],
				name: 'Assign Social Media IDs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/media',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{
								name: 'url',
								value: "={{ $('Get my video').item.json['final_output'] }}",
							},
						],
					},
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_HERE' }],
					},
				},
				position: [640, 1680],
				name: 'Upload Video to Blotato',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.instagram_id }}",\n    "target": {\n      "targetType": "instagram"\n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "instagram",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_HERE' }],
					},
				},
				position: [920, 1440],
				name: 'INSTAGRAM',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.youtube_id }}",\n    "target": {\n      "targetType": "youtube",\n      "title": "{{ $(\'Get my video\').item.json.Titre }}",\n      "privacyStatus": "unlisted",\n      "shouldNotifySubscribers": "false"\n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "youtube",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_HERE' }],
					},
				},
				position: [1140, 1440],
				name: 'YOUTUBE',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.tiktok_id }}",\n    "target": {\n      "targetType": "tiktok",\n      "isYourBrand": "false", \n      "disabledDuet": "false",\n      "privacyLevel": "PUBLIC_TO_EVERYONE",\n      "isAiGenerated": "true",\n      "disabledStitch": "false",\n      "disabledComments": "false",\n      "isBrandedContent": "false"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "tiktok",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: '=YOUR_API_HERE' }],
					},
				},
				position: [1340, 1440],
				name: 'TIKTOK',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.facebook_id }}",\n    "target": {\n      "targetType": "facebook",\n      "pageId": "{{ $(\'Assign Social Media IDs\').item.json.facebook_page_id }}"\n\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "facebook",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: '=YOUR_API_HERE' }],
					},
				},
				position: [920, 1680],
				name: 'FACEBOOK',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.threads_id }}",\n    "target": {\n      "targetType": "threads"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "threads",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_HERE' }],
					},
				},
				position: [1140, 1680],
				name: 'THREADS',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.twitter_id }}",\n    "target": {\n      "targetType": "twitter"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "twitter",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_HERE' }],
					},
				},
				position: [1340, 1680],
				name: 'TWETTER',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.linkedin_id }}",\n    "target": {\n      "targetType": "linkedin"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "linkedin",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  }\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_HERE' }],
					},
				},
				position: [920, 1920],
				name: 'LINKEDIN',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'= {\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.bluesky_id }}",\n    "target": {\n      "targetType": "bluesky"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "bluesky",\n      "mediaUrls": [\n        "https://pbs.twimg.com/media/GE8MgIiWEAAfsK3.jpg"\n      ]\n    }\n  }\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_HERE' }],
					},
				},
				position: [1140, 1920],
				name: 'BLUESKY',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.pinterest_id }}",\n    "target": {\n      "targetType": "pinterest",\n      "boardId": "{{ $(\'Assign Social Media IDs\').item.json.pinterest_board_id }}"      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "pinterest",\n      "mediaUrls": [\n        "https://pbs.twimg.com/media/GE8MgIiWEAAfsK3.jpg"\n      ]\n    }\n  }\n}\n\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API_HERE' }],
					},
				},
				position: [1340, 1920],
				name: 'PINTEREST',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							STATUS: 'Publish',
							row_number: "={{ $('Get my video').item.json.row_number }}",
						},
						schema: [
							{
								id: 'PROMPT',
								type: 'string',
								display: true,
								required: false,
								displayName: 'PROMPT',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'DESCRIPTION',
								type: 'string',
								display: true,
								required: false,
								displayName: 'DESCRIPTION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL VIDEO',
								type: 'string',
								display: true,
								required: false,
								displayName: 'URL VIDEO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Titre',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Titre',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'STATUS',
								type: 'string',
								display: true,
								required: false,
								displayName: 'STATUS',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
								display: true,
								removed: false,
								readOnly: true,
								required: false,
								displayName: 'row_number',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['row_number'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [640, 1920],
			},
		}),
	)
	.add(
		sticky('# ✅ STEP 1 — Generate Script & Prompt with AI', {
			position: [340, 480],
			width: 1200,
			height: 500,
		}),
	)
	.add(
		sticky('# ✅ STEP 2 — Create Video Using Veo3\n\n', {
			name: 'Sticky Note1',
			color: 3,
			position: [340, 1020],
			width: 1200,
			height: 280,
		}),
	)
	.add(
		sticky('# ✅ STEP 3 — Publish Video to Social Media\n', {
			name: 'Sticky Note2',
			color: 4,
			position: [340, 1340],
			width: 1200,
			height: 760,
		}),
	);
