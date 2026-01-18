const wf = workflow(
	'z8nPpsFFe7kDBQUm',
	'💥 Generate AI viral videos with NanoBanana & VEO3, shared on socials via Blotato - vide',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [-208, -752],
				name: 'Telegram Trigger: Receive Video Idea',
			},
		}),
	)
	.output(0)
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
								id: 'af62651a-3fc8-419d-908b-6514f6f4bcb3',
								name: 'YOUR_BOT_TOKEN',
								type: 'string',
								value: '',
							},
						],
					},
				},
				position: [480, -752],
				name: 'Set: Bot Token (Placeholder)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://api.telegram.org/bot{{ $json.YOUR_BOT_TOKEN }}/getFile?file_id={{ $('Telegram Trigger: Receive Video Idea').item.json.message.photo[3].file_id }}",
					options: {},
				},
				position: [672, -752],
				name: 'Telegram API: Get File URL',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					text: '=You are an image analysis assistant.\n\nYour task is to analyze the given image and output results **only in YAML format**. Do not add explanations, comments, or extra text outside YAML.\n\nRules:\n\n- If the image depicts a **product**, return:\n    \n    ```yaml\n    brand_name: (brand if visible or inferable)\n    color_scheme:\n      - hex: (hex code of each prominent color)\n        name: (descriptive name of the color)\n    font_style: (serif/sans-serif, bold/thin, etc.)\n    visual_description: (1–2 sentences summarizing what is seen, ignoring the background)\n    \n    ```\n    \n- If the image depicts a **character**, return:\n    \n    ```yaml\n    character_name: (name if visible or inferable, else "unknown")\n    color_scheme:\n      - hex: (hex code of each prominent color on the character)\n        name: (descriptive name of the color)\n    outfit_style: (clothing style, accessories, or notable features)\n    visual_description: (1–2 sentences summarizing what the character looks like, ignoring the background)\n    \n    ```\n    \n- If the image depicts **both**, return **both sections** in YAML.\n\nOnly output valid YAML. No explanations.',
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'chatgpt-4o-latest',
						cachedResultName: 'CHATGPT-4O-LATEST',
					},
					options: {},
					resource: 'image',
					imageUrls:
						"=https://api.telegram.org/file/bot{{ $('Set: Bot Token (Placeholder)').item.json.YOUR_BOT_TOKEN }}/{{ $json.result.file_path }}",
					operation: 'analyze',
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1088, -752],
				name: 'OpenAI Vision: Analyze Reference Image',
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
							'IMAGE NAME':
								"={{ $('Telegram Trigger: Receive Video Idea').item.json.message.photo[2].file_unique_id }}",
							'IMAGE DESCRIPTION': '={{ $json.content }}',
						},
						schema: [
							{
								id: 'IMAGE NAME',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'IMAGE NAME',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE URL',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'IMAGE URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE DESCRIPTION',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'IMAGE DESCRIPTION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CAPTION',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'CAPTION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'STATUS',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'STATUS',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['IMAGE NAME'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1328, -752],
				name: 'Google Sheets: Update Image Description',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: "=Your task is to create an image prompt following the system guidelines.  \nEnsure that the reference image is represented as **accurately as possible**, including all text elements.  \n\nUse the following inputs:  \n\n- **User’s description:**  \n{{ $json.CAPTION }}\n\n- **Reference image description:**  \n{{ $json['IMAGE DESCRIPTION'] }}\n",
					options: {
						systemMessage:
							'=ROLE: UGC Image Prompt Builder  \n\nGOAL:  \nGenerate one concise, natural, and realistic image prompt (≤120 words) from a given product or reference image. The prompt must simulate authentic UGC (user-generated content) photography.  \n\nRULES:  \n- Always output **one JSON object only** with the key:  \n  - `image_prompt`: (string with full description)  \n- Do **not** add commentary, metadata, or extra keys. JSON only.  \n\nSTYLE GUIDELINES:  \n- Tone: casual, unstaged, lifelike, handheld snapshot.  \n- Camera cues: include at least 2–3 (e.g., phone snapshot, handheld framing, off-center composition, natural indoor light, soft shadows, slight motion blur, auto exposure, unpolished look, mild grain).  \n- Realism: embrace imperfections (wrinkles, stray hairs, skin texture, clutter, smudges).  \n- Packaging/Text: preserve exactly as visible. Never invent claims, numbers, or badges.  \n- Diversity: if people appear but are unspecified, vary gender/ethnicity naturally; default age range = 21–38.  \n- Setting: default to real-world everyday spaces (home, street, store, gym, office).  \n\nSAFETY:  \n- No copyrighted character names.  \n- No dialogue or scripts. Only describe scenes.  \n\nOUTPUT CONTRACT:  \n- JSON only, no prose outside.  \n- Max 120 words in `image_prompt`.  \n- Must cover: subject, action, mood, setting, style/camera, colors, and text accuracy.  \n\nCHECKLIST BEFORE OUTPUT:  \n- Natural handheld tone?  \n- At least 2 camera cues included?  \n- Product text preserved exactly?  \n- Only JSON returned?  \n\n---  \n\n### Example  \n\nGood Example :  \n```json\n{ "image_prompt": "a young adult casually holding a skincare tube near a bathroom mirror; action: dabs small amount on the back of the hand; mood: easy morning; setting: small apartment bathroom with towel on rack and toothbrush cup; style/camera: phone snapshot, handheld framing, off-center composition, natural window light, slight motion blur, mild grain; colors: soft whites and mint label; text accuracy: keep every word on the tube exactly as visible, no added claims" }\n',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'LLM: OpenAI Chat',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: { jsonSchemaExample: '{\n	"image_prompt": "string"\n}' },
							name: 'LLM: Structured Output Parser',
						},
					}),
				},
				position: [1552, -752],
				name: 'Generate Image Prompt',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/nano-banana/edit',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n	"prompt": "{{ $json.output.image_prompt.replace(/\\"/g, \'\\\\\\"\').replace(/\\n/g, \'\\\\n\') }}",\n"image_urls": ["{{ $(\'Google Drive: Upload Image\').item.json.webContentLink }}"]\n\n}\n\n',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1888, -752],
				name: 'NanoBanana: Create Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 20 }, position: [2096, -752], name: 'Wait for Image Edit' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.response_url }}',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2096, -528],
				name: 'Download Edited Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
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
				position: [32, -192],
				name: 'Google Sheets: Read Video Parameters (CONFIG)',
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
								id: 'cc2e0500-57b1-4615-82cb-1c950e5f2ec4',
								name: 'json_master',
								type: 'string',
								value:
									'={\n  "description": "Brief narrative description of the scene, focusing on key visual storytelling and product transformation.",\n  "style": "cinematic | photorealistic | stylized | gritty | elegant",\n  "camera": {\n    "type": "fixed | dolly | Steadicam | crane combo",\n    "movement": "describe any camera moves like slow push-in, pan, orbit",\n    "lens": "optional lens type or focal length for cinematic effect"\n  },\n  "lighting": {\n    "type": "natural | dramatic | high-contrast",\n    "sources": "key lighting sources (sunset, halogen, ambient glow...)",\n    "FX": "optional VFX elements like fog, reflections, flares"\n  },\n  "environment": {\n    "location": "describe location or room (kitchen, desert, basketball court...)",\n    "set_pieces": [\n      "list of key background or prop elements",\n      "e.g. hardwood floors, chain-link fence, velvet surface"\n    ],\n    "mood": "describe the ambient atmosphere (moody, clean, epic...)"\n  },\n  "elements": [\n    "main physical items involved (product box, accessories, vehicles...)",\n    "include brand visibility (logos, packaging, texture...)"\n  ],\n  "subject": {\n    "character": {\n      "description": "optional – physical description, outfit",\n      "pose": "optional – position or gesture",\n      "lip_sync_line": "optional – spoken line if there’s a voiceover"\n    },\n    "product": {\n      "brand": "Brand name",\n      "model": "Product model or name",\n      "action": "description of product transformation or assembly"\n    }\n  },\n  "motion": {\n    "type": "e.g. transformation, explosion, vortex",\n    "details": "step-by-step visual flow of how elements move or evolve"\n  },\n  "VFX": {\n    "transformation": "optional – describe style (neon trails, motion blur...)",\n    "impact": "optional – e.g. shockwave, glow, distortion",\n    "particles": "optional – embers, sparks, thread strands...",\n    "environment": "optional – VFX affecting the scene (ripples, wind...)"\n  },\n  "audio": {\n    "music": "optional – cinematic score, trap beat, ambient tone",\n    "sfx": [\n      "list of sound effects (zip, pop, woosh...)"\n    ],\n    "ambience": "optional – background soundscape (traffic, wind...)",\n    "voiceover": {\n      "delivery": "tone and style (confident, whisper, deep...)",\n      "line": "text spoken if applicable"\n    }\n  },\n  "ending": "Final shot description – what is seen or felt at the end (freeze frame, logo pulse, glow...)",\n  "text": "none | overlay | tagline | logo pulse at end only",\n  "format": "16:9 | 4k | vertical",\n  "keywords": [\n    "brand",\n    "scene style",\n    "motion type",\n    "camera style",\n    "sound mood",\n    "target theme"\n  ]\n}\n',
							},
						],
					},
				},
				position: [240, -192],
				name: 'Set Master Prompt',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "=Create a UGC-style video prompt using both the reference image and the user description.  \n\n**Inputs**  \n- User description (optional):  \n  `{{ $('Telegram Trigger: Receive Video Idea').item.json.message.caption }}`  \n- Reference image analysis (stay strictly faithful to what’s visible):  \n  `{{ $('Google Sheets: Update Image Description').item.json['IMAGE DESCRIPTION'] }}`  \n\n**Rules**  \n- Keep the style casual, authentic, and realistic. Avoid studio-like or cinematic language.  \n- Default model: `veo3_fast` (unless otherwise specified).  \n- Output only **one JSON object** with the key: `video_prompt`.  \n",
					options: {
						systemMessage:
							'=system_prompt:\n  ## SYSTEM PROMPT: Structured Video Ad Prompt Generator\n  A - Ask:\n    Generate a structured video ad prompt for cinematic generation, strictly based on the master schema provided in: {{ $json.json_master }}.\n    The final result must be a JSON object with exactly two top-level keys: `title` and `final_prompt`.\n\n  G - Guidance:\n    role: Creative Director\n    output_count: 1\n    character_limit: None\n    constraints:\n      - The output must be valid JSON.\n      - The `title` field should contain a short, descriptive and unique title (max 15 words).\n      - The `final_prompt` field must contain a **single-line JSON string** that follows the exact structure of {{ $json.json_master }} with all fields preserved.\n      - Do not include any explanations, markdown, or extra text — only the JSON object.\n      - Escape all inner quotes in the `final_prompt` string so it is valid as a stringified JSON inside another JSON.\n    tool_usage:\n      - Ensure consistent alignment across all fields (camera, lighting, motion, etc.).\n      - Maintain full structure even for optional fields (use "none", "", or [] as needed).\n\n  N - Notation:\n    format: JSON\n    expected_output:\n      {\n        "title": "A unique short title for the scene",\n        "final_prompt": "{...stringified JSON of the full prompt...}"\n      }\n\n',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1,
							config: { name: 'Think' },
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: {
								jsonSchemaExample: '{\n  "title": "string",\n  "final_prompt": "string"\n}\n',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [560, -192],
				name: 'AI Agent: Generate Video Script',
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
						'const structuredPrompt = $input.first().json.output.final_prompt;\nreturn {\n  json: {\n    prompt: JSON.stringify(structuredPrompt), // this escapes it correctly!\n    model: "veo3_fast",\n    aspectRatio: "16:9"\n  }\n};\n',
				},
				position: [-160, 16],
				name: 'Format Prompt',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/veo/generate',
					body: '={\n  "prompt": {{ $json.prompt }},\n  "model": "{{ $(\'Google Sheets: Read Video Parameters (CONFIG)\').item.json.model }}",\n  "aspectRatio": "{{ $json.aspectRatio }}",\n  "imageUrls": [\n    "{{ $(\'Download Edited Image\').item.json.images[0].url }}"\n  ]\n}',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'raw',
					authentication: 'genericCredentialType',
					rawContentType: 'application/json',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-160, 320],
				name: 'Generate Video with VEO3',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 20 }, position: [48, 320], name: 'Wait for VEO3 Rendering' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/veo/record-info',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [
							{
								name: 'taskId',
								value: "={{ $('Generate Video with VEO3').item.json.data.taskId }}",
							},
						],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [256, 320],
				name: 'Download Video from VEO3',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4o',
						cachedResultName: 'GPT-4O',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									"=You are rewriting a TikTok video script, caption, and overlay —\nnot inventing a new one. You must follow this format and obey\nthese rules strictly.\n---\n### CONTEXT:\nHere is the content idea to use:{{ $('Telegram Trigger: Receive Video Idea').item.json.message.caption }}\n\nand the Title is : {{ $('AI Agent: Generate Video Script').item.json.output.title }}\n\n\nWrite the caption text using the topic.\n\n---\n- MUST be under 200 characters (yes \"Characters\" not wordcount)\nthis is an absolute MUST, no more than 200 characters!!! \n\n### FINAL OUTPUT FORMAT (no markdown formatting):\n\nDO NOT return any explanations. Only return the Caption Text\n",
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [416, 320],
				name: 'Rewrite Caption with GPT-4o',
			},
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
							STATUS: 'CREATE',
							'IMAGE NAME':
								"={{ $('Telegram Trigger: Receive Video Idea').item.json.message.photo[2].file_unique_id }}",
							'TITRE VIDEO': "={{ $('AI Agent: Generate Video Script').item.json.output.title }}",
							'CAPTION VIDEO': '={{ $json.message.content }}',
							'URL VIDEO FINAL':
								"={{ $('Download Video from VEO3').item.json.data.response.resultUrls[0] }}",
						},
						schema: [
							{
								id: 'IMAGE NAME',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'IMAGE NAME',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE URL',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'IMAGE URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE DESCRIPTION',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'IMAGE DESCRIPTION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CAPTION',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'CAPTION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL VIDEO FINAL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'URL VIDEO FINAL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'TITRE VIDEO',
								type: 'string',
								display: true,
								required: false,
								displayName: 'TITRE VIDEO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CAPTION VIDEO',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'CAPTION VIDEO',
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
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['IMAGE NAME'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [720, 320],
				name: 'Save Caption Video to Google Sheets',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: "=Url VIDEO : {{ $('Download Video from VEO3').item.json.data.response.resultUrls[0] }}",
					chatId: "={{ $('Telegram Trigger: Receive Video Idea').item.json.message.chat.id }}",
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1008, -176],
				name: 'Send Video URL via Telegram',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					file: "={{ $('Save Caption Video to Google Sheets').item.json['URL VIDEO FINAL'] }}",
					chatId: '={{ $json.result.chat.id }}',
					operation: 'sendVideo',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1024, 64],
				name: 'Send Final Video Preview',
			},
		}),
	)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					mediaUrl: "={{ $('Download Video from VEO3').item.json.data.response.resultUrls[0] }}",
					resource: 'media',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1024, 320],
				name: 'Upload Video to BLOTATO',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'tiktok',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '9332',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/9332',
						cachedResultName: 'docteur.firas',
					},
					postContentText:
						"={{ $('Save Caption Video to Google Sheets').item.json['CAPTION VIDEO'] }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1280, -64],
				name: 'Tiktok',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { parameters: { mode: 'chooseBranch', numberInputs: 9 }, position: [1936, 16] },
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
							STATUS: 'Published',
							'IMAGE NAME':
								"={{ $('Telegram Trigger: Receive Video Idea').item.json.message.photo[2].file_unique_id }}",
						},
						schema: [
							{
								id: 'IMAGE NAME',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'IMAGE NAME',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE URL',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'IMAGE URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE DESCRIPTION',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'IMAGE DESCRIPTION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CAPTION',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'CAPTION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL VIDEO FINAL',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'URL VIDEO FINAL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'TITRE VIDEO',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'TITRE VIDEO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CAPTION VIDEO',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'CAPTION VIDEO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'STATUS',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'STATUS',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['IMAGE NAME'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2112, 128],
				name: 'Update Status to "DONE"',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: 'Published',
					chatId: "={{ $('Telegram Trigger: Receive Video Idea').item.json.message.chat.id }}",
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [2112, 336],
				name: 'Telegram: Send notification',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'linkedin',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '1446',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1446',
						cachedResultName: 'Samuel Amalric',
					},
					postContentText:
						"={{ $('Save Caption Video to Google Sheets').item.json['CAPTION VIDEO'] }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1472, -64],
				name: 'Linkedin',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'facebook',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '1759',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1759',
						cachedResultName: 'Firass Ben',
					},
					facebookPageId: {
						__rl: true,
						mode: 'list',
						value: '101603614680195',
						cachedResultUrl:
							'https://backend.blotato.com/v2/accounts/1759/subaccounts/101603614680195',
						cachedResultName: 'Dr. Firas',
					},
					postContentText:
						"={{ $('Save Caption Video to Google Sheets').item.json['CAPTION VIDEO'] }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1648, -64],
				name: 'Facebook',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					accountId: {
						__rl: true,
						mode: 'list',
						value: '11892',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/11892',
						cachedResultName: 'doc.firass',
					},
					postContentText:
						"={{ $('Save Caption Video to Google Sheets').item.json['CAPTION VIDEO'] }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1280, 112],
				name: 'Instagram',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'twitter',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '1289',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1289',
						cachedResultName: 'Docteur_Firas',
					},
					postContentText:
						"={{ $('Save Caption Video to Google Sheets').item.json['CAPTION VIDEO'] }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1472, 112],
				name: 'Twitter (X)',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'youtube',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '8047',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/8047',
						cachedResultName: 'DR FIRASS (Dr. Firas)',
					},
					postContentText:
						"={{ $('Save Caption Video to Google Sheets').item.json['CAPTION VIDEO'] }}",
					postContentMediaUrls: '={{ $json.url }}',
					postCreateYoutubeOptionTitle:
						"={{ $('Save Caption Video to Google Sheets').item.json['TITRE VIDEO'] }}",
					postCreateYoutubeOptionPrivacyStatus: 'private',
					postCreateYoutubeOptionShouldNotifySubscribers: false,
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1648, 112],
				name: 'Youtube',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'threads',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '2280',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/2280',
						cachedResultName: 'doc.firass',
					},
					postContentText:
						"={{ $('Save Caption Video to Google Sheets').item.json['CAPTION VIDEO'] }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1280, 320],
				name: 'Threads',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'bluesky',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '6012',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/6012',
						cachedResultName: 'formationinternet.bsky.social',
					},
					postContentText:
						"={{ $('Save Caption Video to Google Sheets').item.json['CAPTION VIDEO'] }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1472, 320],
				name: 'Bluesky',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'pinterest',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '363',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/363',
						cachedResultName: 'formationinternet2022',
					},
					postContentText:
						"={{ $('Save Caption Video to Google Sheets').item.json['CAPTION VIDEO'] }}",
					pinterestBoardId: { __rl: true, mode: 'id', value: '1146658823815436667' },
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1648, 320],
				name: 'Pinterest',
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
					fileId: '={{ $json.message.photo[2].file_id }}',
					resource: 'file',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [224, -880],
				name: 'Telegram: Get Image File',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $('Telegram Trigger: Receive Video Idea').item.json.message.photo[2].file_unique_id }}",
					driveId: { __rl: true, mode: 'id', value: '=' },
					options: {},
					folderId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [240, -688],
				name: 'Google Drive: Upload Image',
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
							STATUS: 'EN COURS',
							CAPTION: "={{ $('Telegram Trigger: Receive Video Idea').item.json.message.caption }}",
							'IMAGE URL': '={{ $json.webContentLink }}',
							'IMAGE NAME':
								"={{ $('Telegram Trigger: Receive Video Idea').item.json.message.photo[2].file_unique_id }}",
						},
						schema: [
							{
								id: 'IMAGE NAME',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'IMAGE NAME',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE URL',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'IMAGE URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE DESCRIPTION',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'IMAGE DESCRIPTION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'CAPTION',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'CAPTION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'STATUS',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'STATUS',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['IMAGE NAME'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [240, -512],
				name: 'Google Sheets: Log Image & Caption',
			},
		}),
	)
	.add(
		sticky('# 📑 STEP 5 — Auto-Post to All Platforms\n\n', {
			name: 'Sticky Note3',
			color: 4,
			position: [960, -304],
			width: 1344,
			height: 832,
		}),
	)
	.add(
		sticky('# 📑 STEP 3 — Generate Video Ad Script', {
			name: 'Sticky Note2',
			position: [-272, -304],
			width: 1180,
			height: 460,
		}),
	)
	.add(
		sticky('# 📑 STEP 4 — Generate Video with VEO3', {
			name: 'Sticky Note4',
			position: [-272, 208],
			width: 1180,
			height: 320,
		}),
	)
	.add(
		sticky('# 📑 STEP 1 — Collect Idea & Image', {
			position: [-272, -944],
			width: 1184,
			height: 592,
		}),
	)
	.add(
		sticky('# 📑 STEP 2 — Create Image with NanoBanana\n', {
			name: 'Sticky Note1',
			position: [960, -944],
			width: 1328,
			height: 592,
		}),
	)
	.add(
		sticky(
			'# 🎬 Generate AI viral videos with NanoBanana & VEO3, shared on socials via Blotato (By Dr. Firas)\n\n\n# 🎥 Full Tutorial :\n[![AI Voice Agent Preview](https://www.dr-firas.com/nanobanana.png)](https://youtu.be/nlwpbXQqNQ4)\n\n---\n\n# 📘 Documentation  \nAccess detailed setup instructions, API config, platform connection guides, and workflow customization tips:\n\n📎 [Open the full documentation on Notion](https://automatisation.notion.site/NonoBanan-2643d6550fd98041aef5dcbe8ab0f7a1?source=copy_link)\n\n---\n\n# ⚙️ Requirements\n\n1. ✅ **Create a [Blotato](https://blotato.com/?ref=firas) account** (Pro plan required for API access)  \n2. 🔑 **Generate your Blotato API Key** via: `Settings > API > Generate API Key`  \n3. 📦 **Enable “Verified Community Nodes”** in the n8n admin settings  \n4. 🧩 **Install the Blotato** verified community node in n8n  \n5. 🛠 **Create a Blotato API credential** inside your n8n credentials tab  \n6. 📄 **Duplicate this [Google Sheet template](https://docs.google.com/spreadsheets/d/1FutmZHblwnk36fp59fnePjONzuJBdndqZOCuRoGWSmY/edit?usp=sharing)**  \n7. ☁️ **Make sure your Google Drive folder is PUBLIC** (anyone with the link can access)  \n8. 📌 **Complete the 3 brown sticky note steps** inside the workflow editor\n\n',
			{ name: 'Sticky Note5', color: 6, position: [-992, -944], width: 700, height: 1476 },
		),
	);
