const wf = workflow(
	'GWiHdxtRvqh14vln',
	'💥 Create viral Ads with NanoBanana & Seedance, publish on socials via upload-post - version II - vide',
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
				position: [592, 64],
				name: 'Trigger: Receive Idea via Telegram',
			},
		}),
	)
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
				position: [816, 64],
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
					name: "={{ $('Trigger: Receive Idea via Telegram').item.json.message.photo[2].file_unique_id }}",
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
				position: [1040, 64],
				name: 'Google Drive: Upload Image',
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
						"const text = $('Trigger: Receive Idea via Telegram').first().json.message.caption;\nconst parts = text.split(';').map(part => part.trim());\nreturn {\nimagePrompt: parts[0],\ntextOverlay: parts[1],\nvideoPrompt: parts[2],\nmusicPrompt: parts[3]\n};\n",
				},
				position: [1312, 64],
				name: 'Parse Idea Into Prompts',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '=Your task is to create an image prompt following the system guidelines.  \nEnsure that the reference image is represented as **accurately as possible**, including all text elements.  \n\nUse the following inputs:  \n\n- **User’s description:**  \n{{ $json.imagePrompt }}\n',
					options: {
						systemMessage:
							'=You are a helpful assistantROLE: UGC Image Prompt Builder  \n\nGOAL:  \nGenerate one concise, natural, and realistic image prompt (≤120 words) from a given product or reference image. The prompt must simulate authentic UGC (user-generated content) photography.  \n\nRULES:  \nYou must always create a professional background for the product image. You must never return the image with a plain white or empty background. The background must always enhance and highlight the product in the photo.\n\n- Always output **one JSON object only** with the key:  \n  - `image_prompt`: (string with full description)  \n- Do **not** add commentary, metadata, or extra keys. JSON only.  \n- User node think to be creative\n\nSTYLE GUIDELINES:  \n- Tone: casual, unstaged, lifelike, handheld snapshot.  \n- Camera cues: include at least 2–3 (e.g., phone snapshot, handheld framing, off-center composition, natural indoor light, soft shadows, slight motion blur, auto exposure, unpolished look, mild grain).  \n- Realism: embrace imperfections (wrinkles, stray hairs, skin texture, clutter, smudges).  \n- Packaging/Text: preserve exactly as visible. Never invent claims, numbers, or badges.  \n- Diversity: if people appear but are unspecified, vary gender/ethnicity naturally; default age range = 21–38.  \n- Setting: default to real-world everyday spaces (home, street, store, gym, office).  \n- User node think to be creative\nYou must always create a professional background for the product image. You must never return the image with a plain white or empty background. The background must always enhance and highlight the product in the photo.\n\nSAFETY:  \n- No copyrighted character names.  \n- No dialogue or scripts. Only describe scenes.  \n\nOUTPUT CONTRACT:  \n- JSON only, no prose outside.  \n- Max 120 words in `image_prompt`.  \n- Must cover: subject, action, mood, setting, background, style/camera, colors, and text accuracy.  \n\nCHECKLIST BEFORE OUTPUT:  \n- Natural handheld tone?  \n- At least 2 camera cues included?  \n- Product text preserved exactly?  \n- Only JSON returned?  \n\n---  \n\n### Example  \n\nGood Example :  \n```json\n{ "image_prompt": "a young adult casually holding a skincare tube near a bathroom mirror; action: dabs small amount on the back of the hand; mood: easy morning; setting: small apartment bathroom with towel on rack and toothbrush cup; background: professional-looking bathroom scene that enhances the product, never plain white or empty, always styled to highlight the tube naturally; style/camera: phone snapshot, handheld framing, off-center composition, natural window light, slight motion blur, mild grain; colors: soft whites and mint label; text accuracy: keep every word on the tube exactly as visible, no added claims" }\n',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1.1,
							config: { name: 'Think' },
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
									value: 'gpt-5-mini',
									cachedResultName: 'gpt-5-mini',
								},
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
							parameters: { jsonSchemaExample: '{\n	"image_prompt": "string"\n}' },
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [1664, 64],
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
						'={\n	"prompt": "{{ $json.output.image_prompt.replace(/\\"/g, \'\\\\\\"\').replace(/\\n/g, \'\\\\n\') }}",\n"image_urls": ["{{ $(\'Google Drive: Upload Image\').item.json.webContentLink }}"]\n\n} ',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2048, 64],
				name: 'NanoBanana: Create Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { unit: 'minutes', amount: 2 },
				position: [2256, 64],
				name: 'Wait for Image Edit',
			},
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
				position: [2240, 352],
				name: 'Download Edited Image',
			},
		}),
	)
	.output(0)
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
									"=You are rewriting a TikTok video script, caption, and overlay —\nnot inventing a new one. You must follow this format and obey\nthese rules strictly.\n---\n### CONTEXT:\nHere is the content idea to use:{{ $('Parse Idea Into Prompts').item.json.imagePrompt }}\n\nTitle is : {{ $('Parse Idea Into Prompts').item.json.textOverlay }}\n\n\n\nWrite the caption text using the topic.\n\n---\n- MUST be under 200 characters (yes \"Characters\" not wordcount)\nthis is an absolute MUST, no more than 200 characters!!! \n\n### FINAL OUTPUT FORMAT (no markdown formatting):\n\nDO NOT return any explanations. Only return the Caption Text",
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [608, 352],
				name: 'Rewrite Caption (TikTok/Instagram)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-upload-post.uploadPost',
			version: 1,
			config: {
				parameters: {
					user: 'DRFIRAS',
					title: "={{ $('Parse Idea Into Prompts').item.json.textOverlay }}",
					photos: "={{ $('Download Edited Image').item.json.images[0].url }}",
					caption: '={{ $json.message.content }}',
					platform: ['instagram', 'x'],
				},
				credentials: {
					uploadPostApi: { id: 'credential-id', name: 'uploadPostApi Credential' },
				},
				position: [960, 352],
				name: 'Upload Post',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/createTask',
					body: '={\n  "model": "bytedance/v1-pro-image-to-video",\n  "input": {\n    "prompt": "{{ $(\'Parse Idea Into Prompts\').item.json.videoPrompt }}",\n    "image_url": "{{ $json.images[0].url }}",\n    "resolution": "720p",\n    "duration": "10",\n    "aspect_ratio": "16:9",\n    "camera_fixed": false,\n    "seed": -1,\n    "enable_safety_checker": true\n  }\n}\n',
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
				position: [608, 688],
				name: 'Seedance: Generate Video from Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { unit: 'minutes', amount: 4 },
				position: [816, 688],
				name: 'Wait for Rendering',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.kie.ai/api/v1/jobs/recordInfo?taskId={{ $json.data.taskId }}',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1024, 688],
				name: 'Download Video from Seedance',
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
								id: '04c7d6bf-430a-4423-bd36-d76f8a6ff1c9',
								name: 'url_video',
								type: 'string',
								value:
									'={{ ($json.data.resultJson.match(/https:\\/\\/tempfile\\.aiquickdraw\\.com\\/f\\/[^"]+\\.mp4/) || [])[0] }}\n',
							},
						],
					},
				},
				position: [1232, 688],
				name: 'Set: Video URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/generate',
					body: '={\n  "model": "V3_5",\n  "callBackUrl": "https://YOUR_DOMAIN.com/api/kie-callback",\n  "customMode": true,\n  "instrumental": true,\n  "input": {\n    "prompt": "{{ $(\'Parse Idea Into Prompts\').item.json.musicPrompt }}",\n    "style": "Classical",\n    "title": "Peaceful Piano Meditation",\n    "styleWeight": 0.65,\n    "weirdnessConstraint": 0.65,\n    "audioWeight": 0.65\n  }\n}',
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
				position: [1696, 688],
				name: 'Wait: Music Rendering1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { unit: 'minutes' },
				position: [1904, 688],
				name: 'Wait: Music Rendering',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/generate/record-info',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [{ name: 'taskId', value: '={{ $json.data.taskId }}' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2112, 688],
				name: 'Download Music File',
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
								id: '8f12fa54-c5e8-4836-871c-c29faee02cd8',
								name: 'url_audio',
								type: 'string',
								value: '={{ $json.data.response.sunoData[0].audioUrl }}',
							},
						],
					},
				},
				position: [2320, 688],
				name: 'Set: Audio URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/ffmpeg-api/merge-audio-video',
					body: '={\n"video_url": "{{ $(\'Set: Video URL\').item.json.url_video.trim() }}",\n  "audio_url": "{{ $json.url_audio.trim() }}",\n  "start_offset": 0\n}',
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
				position: [624, 1008],
				name: 'Merge Audio + Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { unit: 'minutes', amount: 3 },
				position: [832, 1008],
				name: 'Wait: Merge Process',
			},
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
				position: [1040, 1008],
				name: 'Check Merge Status',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.video.url }}', options: {} },
				position: [1248, 1008],
				name: 'Download Final Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $('Trigger: Receive Idea via Telegram').item.json.message.photo[2].file_unique_id }}",
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
				position: [2304, 1008],
				name: 'Upload Final Video to Google Drive',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
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
				position: [608, 1424],
				name: 'Read Brand Settings',
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
						'const allRows = $input.all();\nreturn [{\njson: {\nproductName: allRows[0].json.col_2,\nproductCategory: allRows[1].json.col_2,\nmainOffer: allRows[2].json.col_2,\nkeyFeature1: allRows[3].json.col_2,\nkeyFeature2: allRows[4].json.col_2,\nwebsiteURL: allRows[5].json.col_2\n}\n}];',
				},
				position: [816, 1424],
				name: 'Extract Brand Info',
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
									'=You are an expert ad copywriter for social media campaigns.\nYour task: Create compelling ad copy following this exact\nstructure:\n🚨 [Attention-grabbing headline with product benefit]\n✔ [Primary offer/benefit]\n✔ [Key product feature/quality]\n✔ [Trust/credibility element]\n[Call to action] → [website/link]\n# Input Variables:\nProduct Name: {{ $json.productName }}\nProduct Category: {{ $json.productCategory }}\nMain Offer: {{ $json.mainOffer }}\nKey Feature 1: {{ $json.keyFeature1 }}\nKey Feature 2: {{ $json.keyFeature2 }}\nWebsite URL: {{ $json.websiteURL }}\nRules:\n- Keep headline under 35 characters\n- Each checkmark line under 40 characters\n- Use power words that create urgency\n- Include specific product benefits, not generic claims\n- CTA must be action-oriented (Shop Now, Get Yours, Claim Offer,\netc.)\n- Output ONLY the ad copy text, no explanations\n- No quotes around the text\n- Maintain the emoji structure exactly as shown',
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1024, 1424],
				name: 'Message a model',
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
							STATUS: 'CREATE',
							'ADS TEXT': '={{ $json.message.content }}',
							'ID IMAGE':
								"={{ $('Trigger: Receive Idea via Telegram').first().json.message.photo[2].file_unique_id }}",
							'URL IMAGE': "={{ $('Download Edited Image').first().json.images[0].url }}",
							'URL VIDEO': "={{ $('Set: Video URL').first().json.url_video }}",
							'URL FINAL VIDEO': "={{ $('Download Final Video').first().json.video.url }}",
						},
						schema: [
							{
								id: 'ID IMAGE',
								type: 'string',
								display: true,
								required: false,
								displayName: 'ID IMAGE',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL IMAGE',
								type: 'string',
								display: true,
								required: false,
								displayName: 'URL IMAGE',
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
								id: 'URL FINAL VIDEO',
								type: 'string',
								display: true,
								required: false,
								displayName: 'URL FINAL VIDEO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ADS TEXT',
								type: 'string',
								display: true,
								required: false,
								displayName: 'ADS TEXT',
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
						matchingColumns: [],
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
				position: [1344, 1424],
				name: 'Save Ad Data to Google Sheets',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: "=Url VIDEO :   {{ $json['URL FINAL VIDEO'] }}",
					chatId: "={{ $('Trigger: Receive Idea via Telegram').first().json.message.chat.id }}",
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1552, 1424],
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
					file: "={{ $('Save Ad Data to Google Sheets').item.json['URL FINAL VIDEO'] }}",
					chatId: "={{ $('Trigger: Receive Idea via Telegram').first().json.message.chat.id }}",
					operation: 'sendVideo',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [1760, 1424],
				name: 'Send a video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-upload-post.uploadPost',
			version: 1,
			config: {
				parameters: {
					user: 'DRFIRAS',
					title: "={{ $('Parse Idea Into Prompts').first().json.textOverlay }}",
					video: "={{ $('Upload Final Video to Google Drive').first().json.webContentLink }}",
					caption: "={{ $('Message a model').item.json.message.content }}",
					platform: ['facebook', 'youtube', 'x'],
					operation: 'uploadVideo',
					facebookPageId: '101603614680195',
					youtubeDescription: "={{ $('Message a model').item.json.message.content }}",
					youtubePrivacyStatus: 'private',
					facebookVideoDescription: "={{ $('Message a model').item.json.message.content }}",
				},
				credentials: {
					uploadPostApi: { id: 'credential-id', name: 'uploadPostApi Credential' },
				},
				position: [1968, 1424],
				name: 'Post Video on Social Media (FB, TikTok, YT)',
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
							STATUS: 'Published',
							'ID IMAGE':
								"={{ $('Trigger: Receive Idea via Telegram').first().json.message.photo[2].file_unique_id }}",
						},
						schema: [
							{
								id: 'ID IMAGE',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'ID IMAGE',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL IMAGE',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'URL IMAGE',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL VIDEO',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'URL VIDEO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL FINAL VIDEO',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'URL FINAL VIDEO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'ADS TEXT',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'ADS TEXT',
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
								type: 'number',
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
						matchingColumns: ['ID IMAGE'],
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
				position: [2176, 1424],
				name: 'Save Publishing Status to Google Sheets',
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
					chatId: "={{ $('Trigger: Receive Idea via Telegram').first().json.message.chat.id }}",
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [2352, 1424],
				name: 'Telegram: Send notification',
			},
		}),
	)
	.add(
		sticky('# 🟢 Step 1 — Input', {
			name: 'Sticky Note5',
			position: [528, -32],
			width: 1020,
			height: 288,
		}),
	)
	.add(
		sticky('# 🟢 Step 2 — Generate Product Image', {
			name: 'Sticky Note6',
			position: [1584, -32],
			width: 908,
			height: 576,
		}),
	)
	.add(
		sticky('# 🟢 Step 3 — Publish Product Image on Instagram & X', {
			name: 'Sticky Note7',
			color: 5,
			position: [528, 272],
			width: 1020,
			height: 272,
		}),
	)
	.add(
		sticky('# 🟢 Step 4 — Generate Product Video with Seedance', {
			name: 'Sticky Note4',
			position: [528, 576],
			width: 1020,
			height: 320,
		}),
	)
	.add(
		sticky('# 🟢 Step 5 — Generate Background Music with Suno', {
			position: [1584, 576],
			width: 908,
			height: 320,
		}),
	)
	.add(
		sticky('# 🟢 Step 6 — Merge Video & Audio into Final Ad', {
			name: 'Sticky Note8',
			position: [528, 928],
			width: 1964,
			height: 320,
		}),
	)
	.add(
		sticky('# 🟢 Step 7 — Publish Final Ad on Social Media', {
			name: 'Sticky Note9',
			color: 5,
			position: [528, 1296],
			width: 1964,
			height: 336,
		}),
	)
	.add(
		sticky(
			'# 💥 Create Viral Ads with NanoBanana & Seedance — Publish on Socials via Upload-Post (By Dr. Firas)\n\n---\n\n## 🎥 Full Tutorial  \n\n## [Video Tutorial](https://youtu.be/4ec9WDCz9CY)  \n@[youtube](4ec9WDCz9CY)\n\n---\n\n## 📘 Documentation  \nAccédez aux instructions détaillées, guides API, connexions de plateformes et personnalisation du workflow :  \n\n📎 [Open full documentation on Notion](https://automatisation.notion.site/Create-viral-Ads-with-NanoBanana-Seedance-publish-on-socials-via-upload-post-2683d6550fd980ffa23ee340fdb3285e?source=copy_link)\n\n---\n\n## ⚙️ Requirements\n\n1. ✅ **Create an [Upload-Post](https://www.upload-post.com/) account** (Pro plan required for API access)  \n2. 🔑 **Generate your Upload-Post API Key** inside your dashboard (`Settings > API Keys`)  \n3. 📦 **Have n8n installed** (latest version recommended)  \n4. 🧩 **Install the Upload-Post node** in n8n ([integration here](https://n8n.io/integrations/upload-post/))  \n5. 🛠 **Create Upload-Post API credentials** inside your n8n credentials tab  \n6. 📄 **Prepare your video asset** generated with **NanoBanana** + enhanced by **Seedance**  \n7. ☁️ **Ensure video source is accessible** (public Drive, S3, or binary data in n8n)  \n8. 📌 **Follow the official [Upload-Post documentation](https://www.upload-post.com/)** for parameters and setup  \n9. 📊 **Duplicate this Google Sheet template** to log your ads:  \n   [Google Sheets à copier](https://docs.google.com/spreadsheets/d/1TCebBvfgvVJyxYXeOiFVpg0RJGP38CpLKNxcOiRwbfQ/edit?usp=sharing)\n\n---\n\n## 📝 Workflow Steps in n8n\n\n1. **Trigger / Start Node**  \n   Example: new video in Google Drive, or manual execution.  \n\n2. **Content Creation**  \n   - NanoBanana generates the creative (image/video/voice).  \n   - Seedance adds effects, transitions, and ad-style polish.  \n\n3. **Upload-Post Node / HTTP Request**  \n   Configure Upload-Post to send the final video to TikTok, Instagram, YouTube, etc.  \n\n---\n\n### ⚡ Example Configuration (HTTP Request Node)\n\n**Method:** `POST`  \n**URL:** `https://api.upload-post.com/api/upload`  \n**Headers:**  \n',
			{ name: 'Sticky Note10', color: 6, position: [-192, -32], width: 700, height: 1652 },
		),
	);
