const wf = workflow(
	'JdFtT41G2iqwGt1e',
	'🤖 AI content generation for Auto Service 🚘 Automate your social media📲!',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ triggerAtHour: 9 }] } },
				position: [1800, -220],
				name: 'Schedule Trigger',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: '=Use link as a main reference article source {{ $json.name }}! IMPORTANT! Actualize up to date information and facts check up, use Internet research with Tavily tool!',
					options: {
						systemMessage:
							'(!IMPORTANT!) Write short engaging posts under 1024  characters for Telegram. \n\nOverview\nYou are a brand agent for Autoservis, specializing in creating professional and educational posts about car repair. You write random and interesting daily tips, lifehacks, notes, actual news for 2025 year.\n\nGoals:\nAlways start by conducting real-time research using the Tavily tool to gather the most accurate and up-to-date information on the topic. The post should be written to engage the specified target audience.\n\nBased on your research, create a well-structured Telegram post that:\n\nBegins with a captivating hook\n\nMaintains a professional tone\n\nIs clear and easy to read\n\nIs educational and informative\n\nUses minimal emojis (only when very relevant)\n\nIncludes proper source attribution (e.g., "according to [Source]")\n\nContains relevant hashtags to improve visibility\n\nEnds with a clear call to action (e.g., ask for thoughts, feedback, or shares)\n\nOutput instructions:\nYour ONLY output should be the final Telegram post text.\n\nDo not include explanations, notes, or anything outside the post itself.\n\nExample workflow:\nReceive the topic (e.g., вЂњReturn on investment in warehouse automationвЂќ)\n\nUse Tavily to research and gather the latest information or case studies\n\nDraft the post using this research\n\nFormat it with references, clear structure, relevant hashtags, and a call to action\n\nAt the end of the post write\nService center address: 123 Main St, New York, NY, for appointments call (212) 555-1234',
					},
					promptType: 'define',
				},
				position: [2340, -180],
				name: 'GENERATE TEXT',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					text: 'Make it perfect.\nPhoto-realistic to Hyper-realistic style.\nWidescreen aspect ratio with the highest pixel resolution. Generate an extremely detailed and realistic image based on the provided reference description {{ $json.output }}. Include comprehensive visual details covering:\n\n- SubjectвЂ™s appearance: facial features, expressions, skin tone, hair style and texture, clothing fabric, color, and fit, posture, accessories.\n- Environment: specific real-world setting and background elements, natural lighting (direction, intensity, color temperature), and ambient mood.\n- Colors and textures: precise color palettes, authentic fabric and skin textures, natural reflections, and subtle visual cues enhancing lifelike clarity.\n\nExclude any abstract art styles, text, numbers, letters, logos, or non-photographic elements to ensure natural realism.\n\nThe prompt should specify image rendering in 16K photographic resolution with maximum clarity and realism.\n\nAdditionally, provide explicit, practical instructions on enhancing an existing photo to 16K resolution using advanced AI super-resolution upscaling techniques that:\n\n- Preserve fine details without blurriness or unnatural sharpening.\n- Maintain natural textures and lighting.\n- Minimize artifacts like noise, halos, or abnormal edges.\n- Deliver photo-realistic output with enhanced clarity.\n\nEnsure the background is clear, finely detailed, and naturally integrated with the subject to reinforce photographic accuracy.\n\nFocus solely on producing a precise, clear prompt and enhancement guidance centered on natural realism and photographic fidelity for ultra-high resolution images.\n\n',
					options: {
						systemMessage:
							'=Overview\nYou are an AI agent that converts Telegram posts into visual prompt descriptions for generating graphic marketing materials. These visuals are meant to accompany the Telegram post, effectively conveying the message in a visually appealing, brand-consistent style.\n\nObjective:\nAnalyze the provided Telegram post.\n\nExtract the core message, insight, or key takeaway.\n\nCraft a clear, compelling graphic prompt suitable for a text-to-image generator.\n\nThe final graphic should:\n\nVisually represent or enhance the main idea of the post\n\nBe appropriate for a professional Telegram feed\n\nAppear polished, modern, and engaging\n\nOutput Instructions:\nProvide only the final image prompt without quotation marks.\n\nDo not repeat or paraphrase the Telegram post.\n\nAvoid adding explanations or any additional textвЂ”output only the image prompt.\n\nDo not leave placeholders like вЂњHeader area reserved for customizable callout text.вЂќ\n\nInclude numeric data from the original post when relevant.\n\nStyle Guidelines:\nApproach this like a brand designer or marketing creative.\n\nVisual elements may include text, charts, icons, abstract shapes, overlays, modern illustrations, motion-inspired effects, bold typographic elements (described but not rendered), or metaphorical concepts.\n\nYou may suggest layout styles (e.g., вЂњsplit screen layout,вЂќ вЂњheader with bold title and subtle background illustrationвЂќ).\n\nKeep in mind the prompt will be used by AI image generation toolsвЂ”make it clear and effective.\n\nExample Prompt Format:\nA sleek flat-design graphic featuring a human brain intertwined with mechanical gears, symbolizing the integration of AI and automation.\nMinimalist background with soft gradients, clean sans-serif text areas.\n- - - Important! dont put text on image! - - -',
					},
					promptType: 'define',
				},
				position: [2680, 460],
				name: 'GENERATE PROMPT',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					model: 'gpt-image-1',
					prompt:
						'= IMPORTANT! DONT WRITE TEXT ON A PICTURE! Create perfect visual for\n{{ $json.output }}',
					options: {},
					resource: 'image',
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [3280, -140],
				name: 'OPENAI GENERATES IMAGE',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'choices[0].message.content' },
				position: [3640, -140],
				name: 'Split Out',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.twitter',
			version: 2,
			config: { parameters: { additionalFields: {} }, position: [4180, 460], name: 'X' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.facebookGraphApi',
			version: 1,
			config: {
				parameters: { options: {}, httpRequestMethod: 'POST' },
				position: [4180, -60],
				name: 'Facebook',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.linkedIn',
			version: 1,
			config: {
				parameters: {
					text: "={{ $json['choices[0].message.content'] }}",
					person: '[CONFIGURE_YOUR_LINKEDIN_PERSON_ID]',
					authentication: 'communityManagement',
					additionalFields: {},
				},
				position: [4180, 200],
				name: 'LinkedIn',
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
					chatId: '123456789',
					operation: 'sendPhoto',
					binaryData: true,
					additionalFields: { caption: "={{ $('GENERATE TEXT').item.json.output }}" },
					binaryPropertyName: "={{'data'}}",
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [4180, -320],
				name: 'Telegram',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [1800, 60], name: 'When clicking Execute workflow' },
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			config: {
				parameters: {
					event: '=rowAdded',
					options: {
						valueRender: 'UNFORMATTED_VALUE',
						columnsToWatch: ['Links for articles to refer'],
						dataLocationOnSheet: {
							values: { range: 'A2:A10', rangeDefinition: 'specifyRangeA1' },
						},
					},
					pollTimes: { item: [{ mode: 'everyX', unit: 'minutes', value: 1 }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/YOUR_AWS_SECRET_KEY_HERE-y-c/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'id',
						value: 'YOUR_AWS_SECRET_KEY_HERE-y-c',
					},
				},
				credentials: {
					googleSheetsTriggerOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsTriggerOAuth2Api Credential',
					},
				},
				position: [1800, 380],
				name: 'Google Sheets Trigger',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
			version: 1,
			config: {
				parameters: { model: 'pixtral-large-latest', options: {} },
				credentials: {
					mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
				},
				position: [4620, -220],
				name: 'Mistral Cloud Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
			version: 1,
			config: {
				parameters: { options: {} },
				credentials: {
					openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
				},
				position: [4880, -80],
				name: 'OpenRouter Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
			version: 1.3,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'claude-3-7-sonnet-20250219',
						cachedResultName: 'Claude 3.7 Sonnet',
					},
					options: {},
				},
				position: [4620, 40],
				name: 'Anthropic Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				position: [4980, -220],
				name: 'Google Gemini Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatXAiGrok',
			version: 1,
			config: { parameters: { options: {} }, position: [4780, 40], name: 'xAI Grok Chat Model' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatDeepSeek',
			version: 1,
			config: { parameters: { options: {} }, position: [4980, 40], name: 'DeepSeek Chat Model' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
			version: 1,
			config: {
				parameters: {
					model: 'https://huggingface.co/black-forest-labs/FLUX.1-dev',
					options: {},
				},
				credentials: {
					huggingFaceApi: { id: 'credential-id', name: 'huggingFaceApi Credential' },
				},
				position: [5160, -220],
				name: 'Hugging Face Inference Model',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.freepik.com/v1/ai/text-to-image/imagen3',
					method: 'POST',
					options: {},
					jsonBody:
						'{\n  "prompt": "Crazy dog in the space",\n  "num_images": 1,\n  "aspect_ratio": "square_1_1",\n  "styling": {\n    "style": "anime",\n    "effects": {\n      "color": "pastel",\n      "lightning": "warm",\n      "framing": "portrait"\n    }\n  },\n  "person_generation": "allow_all",\n  "safety_settings": "block_none"\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{
								name: 'x-freepik-api-key',
								value: 'FPSX38a53a81a693e71a0e9437a657de6342',
							},
						],
					},
				},
				position: [4540, 400],
				name: 'Freepik API',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.runware.ai/v1',
					method: 'POST',
					options: { redirect: { redirect: {} } },
					jsonBody:
						'[\n  {\n    "taskType": "authentication",\n    "apiKey": "<API_KEY>"\n  },\n  {\n    "taskType": "imageInference",\n    "taskUUID": "39d7207a-87ef-4c93-8082-1431f9c1dc97",\n    "positivePrompt": "a cat",\n    "width": 512,\n    "height": 512,\n    "model": "civitai:102438@133677",\n    "numberResults": 1\n  }\n]',
					sendBody: true,
					specifyBody: 'json',
				},
				position: [4540, 580],
				name: 'Runware API',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://clipdrop-api.co/text-to-image/v1',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					authentication: 'genericCredentialType',
					bodyParameters: { parameters: [{ name: 'prompt' }] },
					genericAuthType: 'httpBearerAuth',
				},
				credentials: {
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
				},
				position: [4760, 580],
				name: 'Clipdrop API',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOllama',
			version: 1,
			config: { parameters: { options: {} }, position: [4780, -220], name: 'Ollama Chat Model' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
			version: 1,
			config: {
				parameters: { options: {} },
				position: [5160, 40],
				name: 'Azure OpenAI Chat Model',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.apiTemplateIo',
			version: 1,
			config: {
				credentials: {
					apiTemplateIoApi: { id: 'credential-id', name: 'apiTemplateIoApi Credential' },
				},
				position: [5200, 580],
				name: 'APITemplate.io',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.ideogram.ai/v1/ideogram-v3/generate',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{
								name: 'prompt',
								value: 'A photo of a cat sleeping on a couch.',
							},
							{ name: 'rendering_speed', value: 'TURBO' },
						],
					},
					headerParameters: { parameters: [{ name: 'Api-Key', value: '<apiKey>' }] },
				},
				position: [4980, 580],
				name: 'Ideogram API',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.replicate.com/v1/models/ideogram-ai/ideogram-v2/predictions',
					method: 'POST',
					options: {},
					jsonBody:
						'{\n  "input": {\n    "prompt": "An illustration of a black running shoe with the text \\"Run AI with an API\\" written on the shoe. The shoe is placed on a blue background. The text is white and bold. The overall image has a modern and techy vibe.",\n    "aspect_ratio": "16:9"\n  }\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Authorization', value: 'Bearer $REPLICATE_API_TOKEN' },
							{ name: 'Prefer', value: 'wait' },
						],
					},
				},
				position: [4760, 400],
				name: 'Replicate API',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://LOCATION-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/LOCATION/YOUR_AWS_SECRET_KEY_HERE@002:predict',
					body: '0',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'raw',
					sendHeaders: true,
					rawContentType: 'application/json; charset=utf-8',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: 'Bearer $(gcloud auth print-access-token)',
							},
						],
					},
				},
				position: [4980, 400],
				name: 'Imagen Google API',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://uu149rez6gw9ehej.eu-west-1.aws.endpoints.huggingface.cloud/distilbert-sentiment',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'form-urlencoded',
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{
								name: '{"inputs": "Deploying my first endpoint was an amazing experience."}',
							},
						],
					},
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer <Token>' }],
					},
				},
				position: [5200, 400],
				name: 'HuggingFace API',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.dev.runwayml.com/v1/text_to_image',
					method: 'POST',
					options: {},
					jsonBody:
						'{\n  "promptText": "string",\n  "ratio": "1920:1080",\n  "seed": 4294967295,\n  "model": "gen4_image",\n  "referenceImages": [\n    {\n      "uri": "http://example.com",\n      "tag": "string"\n    }\n  ],\n  "contentModeration": {\n    "publicFigureThreshold": "auto"\n  }\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Authorization', value: 'Bearer {{ YOUR API KEY }}' },
							{ name: 'X-Runway-Version', value: '2024-11-06' },
						],
					},
				},
				position: [4980, 220],
				name: 'Runway Images',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.minimaxi.chat/v1/image_generation',
					method: 'POST',
					options: { redirect: { redirect: {} } },
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'model', value: 'image-01' },
							{
								name: 'prompt',
								value:
									'men Dressing in white t shirt, full-body stand front view image :25, outdoor, Venice beach sign, full-body image, Los Angeles, Fashion photography of 90s, documentary, Film grain, photorealistic',
							},
							{ name: 'aspect_ratio', value: '16:9' },
							{ name: 'response_format', value: 'url' },
							{ name: 'n', value: '3' },
							{ name: 'prompt_optimizer', value: 'true' },
						],
					},
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer {api_key}' }],
					},
				},
				position: [4540, 220],
				name: 'Minimax Images',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api-singapore.klingai.com/v1/images/text2image',
					method: 'POST',
					options: { redirect: { redirect: {} } },
					jsonBody:
						'{\n	"code": 0, //Error codesпј›Specific definitions can be found in Error codes\n  "message": "string", //Error information\n  "request_id": "string", //Request ID, generated by the system, is used to track requests and troubleshoot problems\n  "data":[\n    {\n      "task_id": "string", //Task ID, generated by the system\n      "task_status": "string", //Task status, Enum valuesпјљsubmittedгЂЃprocessingгЂЃsucceedгЂЃfailed\n      "task_status_msg": "string", //Task status information, displaying the failure reason when the task fails (such as triggering the content risk control of the platform, etc.)\n      "created_at": 1722769557708, //Task creation time, Unix timestamp, unit ms\n      "updated_at": 1722769557708, //Task update time, Unix timestamp, unit ms\n      "task_result":{\n        "images":[\n          {\n            "index": int, //Image NumberпјЊ0-9\n            "url": "string" //URL for generating imagesпјЊsuch asпјљhttps://h1.inkwai.com/bs2/upload-ylab-stunt/1fa0ac67d8ce6cd55b50d68b967b3a59.png(To ensure information security, generated images/videos will be cleared after 30 days. Please make sure to save them promptly.)\n          }\n      	]\n      }\n    }\n  ]\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
				},
				position: [4760, 220],
				name: 'Kling Images',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://cloud.leonardo.ai/api/rest/v1/generations/id',
					options: { redirect: { redirect: {} } },
					sendHeaders: true,
					headerParameters: { parameters: [{ name: 'accept', value: 'application/json' }] },
				},
				position: [5200, 220],
				name: 'Leonardo Images',
			},
		}),
	)
	.add(
		node({
			type: '@tavily/n8n-nodes-tavily.tavilyTool',
			version: 1,
			config: {
				parameters: {
					query:
						'={\n  "query": "{searchTerm}",\n  "topic": "general",\n  "search_depth": "advanced",\n  "chunks_per_source": 3,\n  "max_results": 1,\n  "time_range": null,\n  "days": 7,\n  "include_answer": true,\n  "include_raw_content": false,\n  "include_images": false,\n  "include_image_descriptions": false,\n  "include_domains": [],\n  "exclude_domains": []\n}',
					options: {},
					descriptionType: 'manual',
					toolDescription: 'Search in Tavily',
				},
				credentials: {
					tavilyApi: { id: 'credential-id', name: 'tavilyApi Credential' },
				},
				position: [2260, -280],
				name: 'Tavily Internet Search',
			},
		}),
	)
	.add(
		node({
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
				position: [2620, 600],
				name: 'OPENAI WRITES PROMPTS',
			},
		}),
	)
	.add(
		node({
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
				position: [2260, -40],
				name: 'OPENAI WRITES POSTS',
			},
		}),
	)
	.add(
		sticky(
			'![Source example](https://i.ibb.co/PZF4szJr/photo-2025-05-30-13-24-04.jpg#full-width)',
			{ color: 5, position: [340, -1340], width: 5760, height: 2920 },
		),
	)
	.add(
		sticky(
			'# [made with ❤️ by N8ner 👈 click! Feel free to message me!](https://community.n8n.io/u/n8ner/badges) ![](https://i.ibb.co/2YyTWq2v/circuit.jpg#full-width#full-width)',
			{ name: 'Sticky Note2', color: 5, position: [340, -500], width: 1260, height: 1260 },
		),
	)
	.add(
		sticky(
			'# Finish - Upload to Platforms![Guide](https://i.ibb.co/d41JsL8q/Screenshot-2025-05-30-122423-1.jpg#full-width#full-width)',
			{ name: 'Sticky Note3', color: 7, position: [3960, -520], width: 520, height: 1300 },
		),
	)
	.add(
		sticky('', { name: 'Sticky Note4', color: 7, position: [4120, 420], width: 210, height: 200 }),
	)
	.add(
		sticky('', { name: 'Sticky Note9', color: 7, position: [4120, 160], width: 210, height: 200 }),
	)
	.add(
		sticky('', { name: 'Sticky Note5', color: 7, position: [4120, -100], width: 210, height: 200 }),
	)
	.add(
		sticky('', { name: 'Sticky Note7', color: 7, position: [4120, -360], width: 210, height: 200 }),
	)
	.add(
		sticky(
			'# START - Choose a Trigger![Guide](https://i.ibb.co/d41JsL8q/Screenshot-2025-05-30-122423-1.jpg#full-width#full-width)',
			{ name: 'Sticky Note8', color: 7, position: [1600, -500], width: 500, height: 1260 },
		),
	)
	.add(sticky('', { name: 'Sticky Note10', color: 4, position: [1740, 320], height: 220 }))
	.add(sticky('', { name: 'Sticky Note11', color: 4, position: [1740, 20], height: 220 }))
	.add(sticky('', { name: 'Sticky Note12', color: 4, position: [1740, -280], height: 220 }))
	.add(
		sticky(
			'### Edit prompt and system message up for you, customize llm and search links, add your own prompts database ![](https://i.ibb.co/TxQrh405/erasebg-transformed-removebg-preview.png#full-width)',
			{ name: 'Sticky Note13', color: 7, position: [2160, -360], width: 760, height: 460 },
		),
	)
	.add(
		sticky(
			'### Edit prompt and system message up for you, customize llm and add own prompts database ![](https://i.ibb.co/TxQrh405/erasebg-transformed-removebg-preview.png#full-width)',
			{ name: 'Sticky Note14', color: 7, position: [2520, 300], width: 760, height: 420 },
		),
	)
	.add(
		sticky(
			'### Set up Ai model for generating images, customize prompt up for you ![](https://i.ibb.co/TxQrh405/erasebg-transformed-removebg-preview.png#full-width)',
			{ name: 'Sticky Note15', color: 7, position: [3120, -300], width: 760, height: 380 },
		),
	)
	.add(
		sticky(
			'# The template is set up for Auto Service daily content uploads, but the underlying logic is universal. You can easily adapt it for any niche by editing prompts, adding nodes, and creating or uploading a variety of content to any platform. You can use any LLM and generative AI of your choice. Personally, I prefer the smooth and effective results from ChatGPT 4.1 combined with GPT Image 1.  Enjoy and [message me](https://community.n8n.io/u/n8ner/badges) with your reviews for future improvements! ![](https://i.ibb.co/qLxMHbd5/customize-ride1.jpg#full-width#full-width )',
			{ name: 'Sticky Note1', color: 5, position: [4480, -520], width: 1620, height: 1300 },
		),
	);
