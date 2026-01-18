const wf = workflow(
	'c1RYY5JDniAWe4Lm',
	'💥 Create AI Viral Videos using NanoBanana 2 PRO & VEO3.1 and Publish via Blotato -vide',
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
				position: [784, 192],
				name: 'Telegram Trigger: Receive Video Idea',
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
								id: 'af62651a-3fc8-419d-908b-6514f6f4bcb3',
								name: 'YOUR_BOT_TOKEN',
								type: 'string',
								value: 'YOUR_BOT_TOKEN',
							},
							{
								id: '588b2c82-50af-41f1-bce2-0f7e627162b0',
								name: 'fal_api_key',
								type: 'string',
								value: 'YOUR_fal_api_key',
							},
							{
								id: 'bdb28513-38da-4a61-bffd-aa0f8a165579',
								name: 'CAPTION',
								type: 'string',
								value: "={{ $('Telegram Trigger: Receive Video Idea').item.json.message.caption }}",
							},
						],
					},
				},
				position: [992, 192],
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
					url: "=https://api.telegram.org/bot{{ $json.YOUR_BOT_TOKEN }}/getFile?file_id={{ $('Telegram Trigger: Receive Video Idea').item.json.message.photo[ $('Telegram Trigger: Receive Video Idea').item.json.message.photo.length - 1].file_id }}",
					options: {},
				},
				position: [1216, 192],
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
						"=https://api.telegram.org/file/bot{{ $('Set: Bot Token (Placeholder)').first().json.YOUR_BOT_TOKEN }}/{{ $json.result.file_path }}",
					operation: 'analyze',
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1424, 192],
				name: 'OpenAI Vision: Analyze Reference Image',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: "=Your task is to create an image prompt following the system guidelines.  \nEnsure that the reference image is represented as **accurately as possible**, including all text elements.  \n\nUse the following inputs:  \n\n- **User’s description:**  \n{{ $('Set: Bot Token (Placeholder)').first().json.CAPTION }}\n\n- **Reference image description:**  \n{{ $json.content }}\n",
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
				position: [1648, 192],
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
					url: 'https://queue.fal.run/fal-ai/nano-banana-pro/edit',
					method: 'POST',
					options: { response: { response: { responseFormat: 'json' } } },
					jsonBody:
						'={\n  "prompt": "{{ $json.output.image_prompt.replace(/\\"/g, \'\\\\\\"\').replace(/\\n/g, \'\\\\n\') }}",\n  "image_urls": [\n     "https://api.telegram.org/file/bot{{ $(\'Set: Bot Token (Placeholder)\').first().json.YOUR_BOT_TOKEN }}/{{ $(\'Telegram API: Get File URL\').first().json.result.file_path }}"\n  ],\n  "resolution": "1K",\n  "aspect_ratio": "9:16",\n  "output_format": "png"\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Content-Type', value: 'application/json' },
							{
								name: 'Authorization',
								value: "={{ 'Key ' + $('Set: Bot Token (Placeholder)').first().json.fal_api_key }}",
							},
						],
					},
				},
				position: [1984, 192],
				name: 'NanoBanana: Create Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 2 }, position: [2192, 192], name: 'Wait for Image Edit' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.response_url }}', options: {} },
				position: [2400, 192],
				name: 'Download Edited Image',
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
				position: [800, 640],
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
					text: "=Create a UGC-style video prompt using both the reference image and the user description.  \n\n**Inputs**  \n- User description (optional):  \n  `{{ $('Telegram Trigger: Receive Video Idea').item.json.message.caption }}`  \n- Reference image analysis (stay strictly faithful to what’s visible):  \n  `{{ $('OpenAI Vision: Analyze Reference Image').item.json.content }}`  \n\n**Rules**  \n- Keep the style casual, authentic, and realistic. Avoid studio-like or cinematic language.  \n- Default model: `veo3.1` (unless otherwise specified).  \n- Output only **one JSON object** with the key: `video_prompt`.  \n",
					options: {
						systemMessage:
							'=system_prompt:\n  ## SYSTEM PROMPT: Structured Video Ad Prompt Generator\n  A - Ask:\n    Generate a structured video ad prompt for cinematic generation, strictly based on the master schema provided in: {{ $json.json_master }}.\n    The final result must be a JSON object with exactly 3 top-level keys: `prompt`, `caption`, `title` and `hashtags`.\n\n  G - Guidance:\n    role: Creative Director\n    output_count: 1\n    character_limit: None\n    constraints:\n      - The output must be valid JSON.\n      - The `prompt` field must contain a **single-line JSON string** that follows the exact structure of {{ $json.json_master }} with all fields preserved.\n      - The `hashtags` field must contain array of 8-10 tags.\n      - The `caption` field should contain a short, descriptive and unique title (max 15 words).\n      - The `title` field should contain a short title.\n      - Do not include any explanations, markdown, or extra text — only the JSON object.\n      - Escape all inner quotes in the `prompt` string so it is valid as a stringified JSON inside another JSON.\n    tool_usage:\n      - Ensure consistent alignment across all fields (camera, lighting, motion, etc.).\n      - Maintain full structure even for optional fields (use "none", "", or [] as needed).\n\n  N - Notation:\n    format: JSON\n    expected_output:\n      {\n        "prompt": "{...stringified JSON of the full prompt...}",\n        "caption": "A unique short descriptive",\n        "title": "A unique short title",\n        "hashtags": "tags"\n      }\n\n    Return JSON with: prompt (150-200 word cinematic Veo 3.1 description), caption (50-100 word social media text with emojis), hashtags (array of 8-10 tags)',
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
								jsonSchemaExample:
									'{\n  "prompt": "string",\n  "caption": "string",\n  "title": "string", \n  "hashtags": "string"\n}\n',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [1008, 640],
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
						'// Parse responses into { title, prompt, caption, hashtags[], hashtags_string }\nreturn $input.all().map(item => {\n  const data = item.json || {};\n\n  let title = "";\n  let prompt = "";\n  let caption = "";\n  let hashtagsArr = [];\n\n  // 1) NOUVEAU FORMAT : { output: { title, prompt, caption, hashtags } }\n  if (data.output) {\n    const o = data.output || {};\n    title = o.title ?? "";\n    prompt = o.prompt ?? "";\n    caption = o.caption ?? "";\n\n    const rawHashtags = o.hashtags ?? [];\n    if (Array.isArray(rawHashtags)) {\n      hashtagsArr = rawHashtags;\n    } else if (typeof rawHashtags === "string") {\n      try {\n        const parsedTags = JSON.parse(rawHashtags);\n        if (Array.isArray(parsedTags)) {\n          hashtagsArr = parsedTags;\n        } else {\n          hashtagsArr = rawHashtags.split(/[,\\s]+/).filter(Boolean);\n        }\n      } catch {\n        hashtagsArr = rawHashtags.split(/[,\\s]+/).filter(Boolean);\n      }\n    }\n  }\n\n  // 2) ANCIEN FORMAT OpenAI (fallback)\n  if (!title && !prompt && !caption && hashtagsArr.length === 0) {\n    let content =\n      data?.choices?.[0]?.message?.content ??\n      data?.message?.content ??\n      data?.content ??\n      null;\n\n    if (content && typeof content === "object") {\n      title = content.title ?? "";\n      prompt = content.prompt ?? "";\n      caption = content.caption ?? "";\n\n      if (Array.isArray(content.hashtags)) {\n        hashtagsArr = content.hashtags;\n      } else if (typeof content.hashtags === "string") {\n        hashtagsArr = content.hashtags.split(/[,\\s]+/).filter(Boolean);\n      }\n    }\n    else if (typeof content === "string" && content.trim()) {\n      try {\n        const parsed = JSON.parse(content);\n        title = parsed.title ?? "";\n        prompt = parsed.prompt ?? "";\n        caption = parsed.caption ?? "";\n\n        if (Array.isArray(parsed.hashtags)) {\n          hashtagsArr = parsed.hashtags;\n        } else if (typeof parsed.hashtags === "string") {\n          hashtagsArr = parsed.hashtags.split(/[,\\s]+/).filter(Boolean);\n        }\n      } catch {\n        title = "";\n        prompt = "";\n        caption = "";\n        hashtagsArr = [];\n      }\n    }\n  }\n\n  // 3) Normalisation des hashtags\n  const norm = Array.from(\n    new Set(\n      (hashtagsArr || [])\n        .map(h => (h ?? "").toString().trim())\n        .filter(Boolean)\n        .map(h => (h.startsWith("#") ? h : `#${h}`))\n    )\n  );\n\n  const hashtags_string = norm.join(" ");\n\n  return {\n    json: {\n      title,\n      prompt,\n      caption,\n      hashtags: norm,\n      hashtags_string\n    }\n  };\n});\n',
				},
				position: [1360, 640],
				name: 'Parse GPT Response',
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
								id: 'id-1',
								name: 'veo_prompt',
								type: 'string',
								value:
									'={{ $json.prompt }} consistent character throughout, photorealistic quality, professional cinematography, 8 seconds duration, 9:16 aspect ratio, 24fps',
							},
						],
					},
					includeOtherFields: true,
				},
				position: [1568, 640],
				name: 'Optimize Prompt for Veo',
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
						"const prompt = $input.item.json.veo_prompt || $input.item.json.prompt;\n\n// Nouvelle source d'image : sortie de \"Download Edited Image\"\nconst imageUrl = $('Download Edited Image').first().json.images[0].url;\n\nif (!prompt || prompt.length < 10) {\n  throw new Error('Prompt required');\n}\n\nif (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {\n  throw new Error('A valid image URL from Download Edited Image is required');\n}\n\n// VEO attend un tableau d'URLs, même si on n'en a qu'une\nconst imageUrls = [imageUrl];\n\nreturn {\n  json: {\n    veo_request_body: {\n      prompt: prompt,\n      image_urls: imageUrls,\n      duration: 8,\n      aspect_ratio: \"9:16\"\n    },\n    ...($input.item.json)\n  }\n};\n",
				},
				position: [1776, 640],
				name: 'Prepare Veo Request Body',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://fal.run/fal-ai/veo3.1/reference-to-video',
					method: 'POST',
					options: {
						timeout: 600000,
						response: { response: { responseFormat: 'json' } },
					},
					jsonBody: '={{ JSON.stringify($json.veo_request_body) }}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: "={{ 'Key ' + $('Set: Bot Token (Placeholder)').first().json.fal_api_key }}",
							},
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
				},
				position: [1984, 640],
				name: 'Veo Generation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 2 }, position: [2192, 640] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.video.url }}',
					options: { response: { response: { responseFormat: 'file' } } },
				},
				position: [2400, 640],
				name: 'Download Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					chatId: "={{ $('Telegram Trigger: Receive Video Idea').first().json.message.chat.id }}",
					operation: 'sendVideo',
					binaryData: true,
					additionalFields: { caption: '=Your video is ready! 🎥  {{ $json.video.url }}' },
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [800, 1152],
				name: 'Send Video to Telegram',
			},
		}),
	)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					mediaUrl: "={{ $('Download Video').item.json.video.url }}",
					resource: 'media',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1136, 1152],
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
						value: '2079',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/2079',
						cachedResultName: 'elitecybzcs',
					},
					postContentText: "={{ $('Parse GPT Response').first().json.caption }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1552, 1056],
				name: 'Tiktok',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: {
				parameters: { mode: 'chooseBranch', numberInputs: 6 },
				position: [2144, 1072],
				name: 'Merge1',
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
					chatId: "={{ $('Telegram Trigger: Receive Video Idea').first().json.message.chat.id }}",
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [2368, 1136],
				name: 'Send a text message',
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
					postContentText: "={{ $('Parse GPT Response').first().json.caption }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1712, 1056],
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
					postContentText: "={{ $('Parse GPT Response').first().json.caption }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1872, 1056],
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
						value: '1687',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1687',
						cachedResultName: 'acces.a.vie',
					},
					postContentText: "={{ $('Parse GPT Response').first().json.caption }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1552, 1216],
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
					postContentText: "={{ $('Parse GPT Response').first().json.caption }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1712, 1216],
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
					postContentText: "={{ $('Parse GPT Response').first().json.caption }}",
					postContentMediaUrls: '={{ $json.url }}',
					postCreateYoutubeOptionTitle: "={{ $('Parse GPT Response').first().json.title }}",
					postCreateYoutubeOptionPrivacyStatus: 'private',
					postCreateYoutubeOptionShouldNotifySubscribers: false,
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1872, 1216],
				name: 'Youtube',
			},
		}),
	)
	.add(
		sticky('# 📑 STEP 2 — Generate Video with VEO3.1', {
			name: 'Sticky Note2',
			color: 7,
			position: [720, 544],
			width: 1852,
			height: 428,
		}),
	)
	.add(
		sticky('# 📑 STEP 1 — Create Image with NanoBanana 2 PRO\n', {
			color: 7,
			position: [720, 96],
			width: 1856,
			height: 432,
		}),
	)
	.add(
		sticky('# 📑 STEP 3  —  Publish with Blotato', {
			name: 'Step 5 - Publishing',
			color: 5,
			position: [720, 992],
			width: 1852,
			height: 404,
		}),
	)
	.add(
		sticky(
			'# 🚀 AI Viral Video Workflow — NanoBanana 2 PRO × VEO3.1 × Blotato (By Dr. Firas)\n\n[![AI Voice Agent Preview](https://www.dr-firas.com/nanobanana2.png)](https://youtu.be/nlwpbXQqNQ4)\n\n##  📘 Documentation  \nAccess detailed setup instructions, API config, platform connection guides, and workflow customization tips:\n\n📎 [Open the full documentation on Notion](https://automatisation.notion.site/NonoBanan-PRO-2-2b53d6550fd981a5acbecf7cf50aeb3c?source=copy_link)\n\nThis workflow converts a simple Telegram message into a **ready-to-publish AI viral video**, fully automated.\n\n## 🔥 What this workflow does\n### 1️⃣ Image Creation (NanoBanana 2 PRO)\n- User sends on Telegram:\n  - A reference image  \n  - A short text idea  \n### 2️⃣ Video Generation (VEO3.1)\n- An AI Agent builds a structured video prompt  \n- Optimizes it for **VEO3.1**  \n- Generates a vertical 9:16 video (8 seconds)  \n- Sends the final video to Telegram\n### 3️⃣ Multi-Platform Publishing (Blotato)\n- Uploads the video to Blotato  \n- Auto-publishes to\n\n## ⚙️ Requirements\n1. ✅ **Create a [Blotato](https://blotato.com/?ref=firas) account** (Pro plan required for API access)  \n2. 🔑 **Generate your Blotato API Key** via: `Settings > API > Generate API Key`  \n3. 📦 **Enable “Verified Community Nodes”** in the n8n admin settings  \n4. 🧩 **Install the Blotato** verified community node in n8n  \n5. 🛠 **Create a Blotato API credential** inside your n8n credentials tab  ',
			{ name: 'Sticky Note5', position: [48, 96], width: 652, height: 1300 },
		),
	);
