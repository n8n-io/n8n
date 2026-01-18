const wf = workflow('aqLL3BAXqQIjeJDt', 'AI Automated TikTok/Youtube Shorts/Reels Generator', {
	timezone: 'America/Los_Angeles',
	callerPolicy: 'workflowsFromSameOwner',
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ triggerAtHour: 7 }] } },
				position: [-1540, 780],
				name: 'Once Per Day',
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
								id: '35659353-d8e2-4677-876b-401b549605a0',
								name: 'PiAPI Key',
								type: 'string',
								value: '',
							},
							{
								id: 'c4927dd6-c597-48fe-b7c1-bbffcf5ff02f',
								name: 'ElevenLabs API Key',
								type: 'string',
								value: '',
							},
							{
								id: 'f5e90c05-dd24-4918-9005-4c87a4fb344d',
								name: 'Creatomate API Key',
								type: 'string',
								value: '',
							},
							{
								id: 'd0ebba50-5a99-4090-adcb-d18aa0b21be2',
								name: 'Creatomate Template ID',
								type: 'string',
								value: '',
							},
						],
					},
				},
				position: [-1320, 780],
				name: 'Set API Keys',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: { returnFirstMatch: true },
					filtersUI: {
						values: [{ lookupValue: 'for production', lookupColumn: 'production' }],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1cjd8p_yx-M-3gWLEd5TargtoB35cW-3y66AOTNMQrrM/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1cjd8p_yx-M-3gWLEd5TargtoB35cW-3y66AOTNMQrrM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1cjd8p_yx-M-3gWLEd5TargtoB35cW-3y66AOTNMQrrM/edit?usp=drivesdk',
						cachedResultName: 'Sheet Template',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-1120, 780],
				name: 'Load Google Sheet',
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
						value: 'gpt-4o-mini',
						cachedResultName: 'GPT-4O-MINI',
					},
					options: {},
					messages: {
						values: [
							{
								role: 'system',
								content:
									'DO NOT include any quotation marks in your response. Do not put a quote at the beginning or the end of your response.\n\nYou are a prompt-generation AI specializing in crafting unhinged, entertaining TikTok captions for a "day in the life" POV story about job hunting or resume writing. Generate five concise, action-driven captions (5-10 words each) that follow a Problem > Action > Reward structure. The first caption should be a shocking or funny hook, and the last should conclude with a satisfying reward. Use emojis sparingly—only one per caption at most, and only when they add impact; skip them if they don’t enhance the message.\n\nGuidelines:\n\nPerspective: Always first-person POV, immersing the viewer in the story.\nTone: Channel Andrew Tate mixed with Charlie Sheen—cursing and sexual innuendos are fair game.\nContent: Focus on job seeking, hunting, or resume building, spotlighting AI as the game-changer.\nNarrative: Start with the grind of unemployment or a shitty job, pivot to using AI for resumes and cover letters, and end with scoring the dream gig.\nScenes: Highlight raw, emotional moments—skip the boring stuff.\nYour captions should be wild and entertaining, not polished or professional. The first caption is the hook—make it shocking, hilarious, or ballsy, something Andrew Tate would growl. Use emojis sparingly—max one per caption, only if it hits harder with it.\n\nYour response should be a list of 5 items separated by "\\n" (for example: "item1\\nitem2\\nitem3\\nitem4\\nitem5")',
							},
							{ content: '={{ $json.idea }}' },
						],
					},
					simplify: false,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-980, 780],
				name: 'Generate Video Captions',
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
						"// Get the text directly from the OpenAI response\nconst text = $input.first().json.choices[0].message.content;\n\n// Split the text on literal '\\\\n', trim, and filter empty lines\nconst lines = text.split('\\\\n').map(line => line.trim()).filter(line => line !== '');\n\n// Create an array of items for n8n\nconst items = lines.map(line => ({\n  json: {\n    response: { text: line }\n  }\n}));\n\n// Return the array of items\nreturn items;",
				},
				position: [-660, 700],
				name: 'Create List',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: '@n8n/n8n-nodes-langchain.openAi',
					version: 1.8,
					config: {
						parameters: {
							modelId: {
								__rl: true,
								mode: 'list',
								value: 'o3-mini',
								cachedResultName: 'O3-MINI',
							},
							options: {},
							messages: {
								values: [
									{
										content:
											"=You are an advanced, unhinged, hilariously entertaining prompt-generation AI specializing in expanding short POV image prompt ideas into detailed, hyper-realistic prompts optimized for Qubico/flux1-dev. Your task is to take a brief input tied to job seeking, job hunting, or resume building and morph it into a cinematic, immersive prompt locked in a first-person perspective, making the viewer feel they’re living the scene.\n\nNEVER include quotation marks or emojis in your response—flux API will choke on them, and that’s a hard no.\n\nThe topic of this narrative is: {{ $('Load Google Sheet').item.json.idea }}\n\nThe short prompt idea to expand for this image generation is: {{ $json.response.text }}\n\nONLY GENERATE ONE PROMPT PER IDEA—NO COMBINING. In at least one scene, weave in this environment descriptor: {{ $('Load Google Sheet').first().json.environment_prompt }}, but go wild with unhinged, edgy, funny twists elsewhere (skip the cringe or cheesy garbage). Most job hunting happens on laptops or desktops, so prioritize those over phones. If a phone sneaks in, it’s only showing job-related content like email, LinkedIn, a resume, or a job posting—never a photo or video app.\n\nEvery prompt has two parts:\n\nForeground: Kick off with First person view POV GoPro shot of... and show the viewer’s hands, limbs, or feet locked in a job-related action.\n\nBackground: Start with In the background,... and paint the scenery, blending the environment descriptor when required, plus sensory zingers.\n\nTop Rules:\n\nNO quotation marks or emojis—EVER. This is life or death for flux.\nStick to first-person POV—the viewer’s in the driver’s seat, not watching from the sidelines.\nShow a limb (hands, feet) doing something job-focused—typing, holding a resume, adjusting a tie.\nKeep it dynamic, like a GoPro clip, with motion and depth mimicking human vision.\nIf tech’s involved (phone, computer), it’s displaying job-hunting gold—email, job boards, resumes—not random trash.\nNo off-topic actions like recording videos or snapping pics—job hunting only, fam.\nExtra Vibes:\n\nFull-body awareness: Drop hints of physical feels—cramping fingers, racing pulse, slumping shoulders.\nSensory overload: Hit sight, touch, sound, smell, temperature for max realism (coffee whiffs, keyboard clacks).\nWorld grip: Limbs interact with the scene—tapping keys, handing over papers, stepping up.\nKeep it under 1000 characters, one slick sentence, no fluff or formatting.\nMake it entertaining, relatable, with an Andrew Tate viral edge for the down-and-out job hustlers.\nExamples:\n\nInput: Updating a LinkedIn profile after a long day\n\nEnvironment_prompt: Tired, cluttered apartment, laptop glow\n\nOutput: First person view POV GoPro shot of my hands hammering a laptop, cheeto-dusted fingers aching from the grind, the screen flashing my LinkedIn profile with a fresh connection ping; in the background, a trashed apartment lit by the laptop’s ghostly glow, pizza boxes toppling, traffic humming outside, stale takeout stench hitting my nose as my back screams from the hustle.\n\nInput: Handing over a resume at a job fair\n\nEnvironment_prompt: Hopeful, busy convention hall, suits everywhere\n\nOutput: First person view POV GoPro shot of my hand thrusting out a crisp resume, fingers twitching with nerves as it brushes another palm; in the background, a buzzing convention hall packed with suits, coffee fumes and shoe polish in the air, chatter drowning my pounding heart as I lock eyes with the recruiter.\n\nNO QUOTATION MARKS. NO EMOJIS. EVER.",
									},
								],
							},
							simplify: false,
						},
						credentials: {
							openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
						},
						position: [-540, 120],
						name: 'Generate Image Prompts',
					},
				}),
				node({
					type: '@n8n/n8n-nodes-langchain.openAi',
					version: 1.8,
					config: {
						parameters: {
							modelId: {
								__rl: true,
								mode: 'list',
								value: 'gpt-4o-mini',
								cachedResultName: 'GPT-4O-MINI',
							},
							options: {},
							messages: {
								values: [
									{
										role: 'system',
										content:
											'DO NOT include any quotation marks in your response. Do not put a quote at the beginning or the end of your response.\n\nYou are a prompt-generation AI specializing in crafting unhinged, entertaining TikTok captions for a "day in the life" POV story about job hunting or resume writing. Generate five concise, action-driven captions (5-10 words each) that follow a Problem > Action > Reward structure. The first caption should be a shocking or funny hook, and the last should conclude with a satisfying reward. Use emojis sparingly—only one per caption at most, and only when they add impact; skip them if they don’t enhance the message.\n\nGuidelines:\n\nPerspective: Always first-person POV, immersing the viewer in the story.\nTone: Channel Andrew Tate mixed with Charlie Sheen—cursing and sexual innuendos are fair game.\nContent: Focus on job seeking, hunting, or resume building, spotlighting AI as the game-changer.\nNarrative: Start with the grind of unemployment or a shitty job, pivot to using AI for resumes and cover letters, and end with scoring the dream gig.\nScenes: Highlight raw, emotional moments—skip the boring stuff.\nYour captions should be wild and entertaining, not polished or professional. The first caption is the hook—make it shocking, hilarious, or ballsy, something Andrew Tate would growl. Use emojis sparingly—max one per caption, only if it hits harder with it.\n\nYour response should be a list of 5 items separated by "\\n" (for example: "item1\\nitem2\\nitem3\\nitem4\\nitem5")',
									},
									{ content: '={{ $json.idea }}' },
								],
							},
							simplify: false,
						},
						credentials: {
							openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
						},
						position: [-980, 780],
						name: 'Generate Video Captions',
					},
				}),
			],
			{
				version: 2.2,
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
								id: '2681c0e9-aa45-4f0f-8933-6e6de324c7aa',
								operator: { type: 'array', operation: 'lengthGt', rightType: 'number' },
								leftValue: '={{$input.all()}}',
								rightValue: 1,
							},
						],
					},
				},
				name: 'Validate list formatting',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Get all input items (the 5 LLM responses)\nconst items = $input.all();\n\n// Calculate total prompt tokens and total completion tokens\nconst totalPromptTokens = items.reduce((sum, item) => sum + item.json.usage.prompt_tokens, 0);\nconst totalCompletionTokens = items.reduce((sum, item) => sum + item.json.usage.completion_tokens, 0);\n\n// Create new items with original data plus the totals\nconst outputItems = items.map(item => ({\n  json: {\n    ...item.json,                   // Spread the original item data\n    total_prompt_tokens: totalPromptTokens,     // Add total prompt tokens\n    total_completion_tokens: totalCompletionTokens // Add total completion tokens\n  }\n}));\n\n// Return the modified items\nreturn outputItems;',
				},
				position: [-240, 120],
				name: 'Calculate Token Usage',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.piapi.ai/api/v1/task',
					body: '={\n  "model": "Qubico/flux1-dev",\n  "task_type": "txt2img",\n  "input": {\n    "prompt": "{{ $(\'Generate Image Prompts\').item.json.choices[0].message.content }} realistic and casual as if taken by an iphone camera by a TikTok influencer",\n    "negative_prompt": "taking a photo of a room, recording a video of a room, photos app, video recorder, illegible text, blurry text, low quality text, DSLR, unnatural",\n    "width": 540,\n    "height": 960\n  }\n}',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'raw',
					sendHeaders: true,
					rawContentType: 'application/json',
					headerParameters: {
						parameters: [
							{
								name: 'X-API-Key',
								value: "={{ $('Set API Keys').item.json['PiAPI Key'] }}",
							},
						],
					},
				},
				position: [-60, 40],
				name: 'Generate Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 3 }, position: [80, 40], name: 'Wait 3min' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.piapi.ai/api/v1/task/{{ $json.data.task_id }}',
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [
							{
								name: 'X-API-Key',
								value: "={{ $('Set API Keys').item.json['PiAPI Key'] }}",
							},
						],
					},
				},
				position: [220, 40],
				name: 'Get image',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: { parameters: { unit: 'minutes' }, position: [540, -40], name: 'Wait 5min' },
				}),
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: 'https://api.piapi.ai/api/v1/task',
							body: '={\n  "model": "kling",\n  "task_type": "video_generation",\n  "input": {\n    "prompt": "{{ $json.data.input.prompt }}",\n    "negative_prompt": "blurry motion, distorted faces, unnatural lighting, over produced, bad quality",\n    "cfg_scale": 0.5,\n    "duration": 5,\n    "mode": "pro",\n    "image_url": "{{ $json.data.output.image_url }}",\n    "version": "1.6",\n    "camera_control": {\n      "type": "simple",\n      "config": {\n        "horizontal": 0,\n        "vertical": 0,\n        "pan": 0,\n        "tilt": 0,\n        "roll": 0,\n        "zoom": 5\n      }\n    }\n  },\n  "config": {}\n}',
							method: 'POST',
							options: {},
							sendBody: true,
							contentType: 'raw',
							sendHeaders: true,
							rawContentType: 'application/json',
							headerParameters: {
								parameters: [
									{
										name: 'X-API-Key',
										value: "={{ $('Set API Keys').item.json['PiAPI Key'] }}",
									},
								],
							},
						},
						position: [-420, 560],
						name: 'Image-to-Video',
					},
				}),
			],
			{
				version: 2.2,
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
								id: '567d1fc9-0638-4a44-b5f5-30a9a6683794',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.data.status }}',
								rightValue: 'failed',
							},
						],
					},
				},
				name: 'Check for failures',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { unit: 'minutes', amount: 10 },
				position: [-280, 560],
				name: 'Wait 10min',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.piapi.ai/api/v1/task/{{ $json.data.task_id }}',
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [
							{
								name: 'X-API-Key',
								value: "={{ $('Set API Keys').item.json['PiAPI Key'] }}",
							},
						],
					},
				},
				position: [-160, 560],
				name: 'Get Video',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: { parameters: { unit: 'minutes' }, position: [120, 520], name: 'Wait to retry' },
				}),
				node({
					type: 'n8n-nodes-base.merge',
					version: 3,
					config: {
						parameters: {
							mode: 'combine',
							options: {},
							combineBy: 'combineByPosition',
						},
						position: [300, 600],
						name: 'Match captions with videos',
					},
				}),
			],
			{
				version: 2.2,
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
								id: 'a920eb54-fc23-4b68-8f56-2eee907a5481',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.data.status }}',
								rightValue: 'failed',
							},
						],
					},
				},
				name: 'Fail check',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"return [\n  {\n    scene_titles: items.map(item => item.json.response.text),\n    video_urls: items.map(item => item.json.data.output.video_url),\n    input_tokens: $('Calculate Token Usage').first().json.total_prompt_tokens,\n    output_tokens: $('Calculate Token Usage').first().json.total_completion_tokens,\n    model: $('Generate Image Prompts').first().json.model\n  }\n];",
				},
				position: [460, 600],
				name: 'List Elements',
			},
		}),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							jsCode:
								"return [\n  {\n    scene_titles: items.map(item => item.json.response.text),\n    video_urls: items.map(item => item.json.data.output.video_url),\n    input_tokens: $('Calculate Token Usage').first().json.total_prompt_tokens,\n    output_tokens: $('Calculate Token Usage').first().json.total_completion_tokens,\n    model: $('Generate Image Prompts').first().json.model\n  }\n];",
						},
						position: [460, 600],
						name: 'List Elements',
					},
				}),
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							jsCode:
								"return [\n  {\n    sound_urls: items.map(item => $('Upload Voice Audio').first().json.webContentLink)\n  }\n];",
						},
						position: [460, 820],
						name: 'List Elements1',
					},
				}),
			],
			{
				version: 3,
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
				},
				name: 'Pair Videos with Audio',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.creatomate.com/v1/renders',
					body: '={\n  "template_id": "{{ $(\'Set API Keys\').item.json[\'Creatomate Template ID\'] }}",\n  "modifications": {\n    \n    "Video-1.source": "{{ $json.video_urls[0] }}",\n    "Video-2.source": "{{ $json.video_urls[1] }}",\n    "Video-3.source": "{{ $json.video_urls[2] }}",\n    "Video-4.source": "{{ $json.video_urls[3] }}",\n    "Video-5.source": "{{ $json.video_urls[4] }}",\n\n    "Audio-1.source": "{{ $json.sound_urls[0] }}",\n\n    "Text-1.text": "{{ $json.scene_titles[0] }}",\n    "Text-2.text": "{{ $json.scene_titles[1] }}",\n    "Text-3.text": "{{ $json.scene_titles[2] }}",\n    "Text-4.text": "{{ $json.scene_titles[3] }}",\n    "Text-5.text": "{{ $json.scene_titles[4] }}"\n  }\n}',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'raw',
					sendHeaders: true,
					rawContentType: 'application/json',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: "=Bearer {{ $('Set API Keys').item.json['Creatomate API Key'] }}",
							},
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
				},
				position: [860, 700],
				name: 'Render Final Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 3 }, position: [980, 700], name: 'Wait1' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://api.creatomate.com/v1/renders/{{ $('Render Final Video').item.json.id }}",
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: "=Bearer {{ $('Set API Keys').item.json['Creatomate API Key'] }}",
							},
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
				},
				position: [1100, 700],
				name: 'Get Final Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.url }}',
					options: { response: { response: { responseFormat: 'file' } } },
				},
				position: [1220, 700],
				name: 'Get Raw File',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "=POV-{{ $('Render Final Video').item.json.id }}.mp4",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: '1w1EQ8xyth6w7AbX2wpDI3vInfYeRy8vH',
						cachedResultUrl:
							'https://drive.google.com/drive/folders/1w1EQ8xyth6w7AbX2wpDI3vInfYeRy8vH',
						cachedResultName: 'Resume Studio',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [1360, 700],
				name: 'Upload Final Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
					options: {},
					operation: 'share',
					permissionsUi: {
						permissionsValues: { role: 'writer', type: 'anyone', allowFileDiscovery: true },
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [1500, 700],
				name: 'Set Permissions',
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
							id: "={{ $('Load Google Sheet').first().json.id }}",
							width: "={{ $('Get Raw File').item.json.width }}",
							height: "={{ $('Get Raw File').item.json.height }}",
							model1: "={{ $('Generate Video Captions').item.json.model }}",
							model2: "={{ $('Pair Videos with Audio').item.json.model }}",
							model3: "={{ $('Generate Script').item.json.model }}",
							duration: "={{ $('Get Raw File').item.json.duration }}",
							fluxCost: '0.075',
							frameRate: "={{ $('Get Raw File').item.json.frame_rate }}",
							klingCost: '2.3',
							production: 'done',
							publishing: 'for publishing',
							final_output: "={{ $('Upload Final Video').item.json.webContentLink }}",
							'prompt1 input tokens':
								"={{ $('Generate Video Captions').item.json.usage.prompt_tokens }}",
							'prompt2 input tokens': "={{ $('Pair Videos with Audio').item.json.input_tokens }}",
							'prompt3 input tokens': "={{ $('Generate Script').item.json.usage.prompt_tokens }}",
							'prompt1 output tokens':
								"={{ $('Generate Video Captions').item.json.usage.completion_tokens }}",
							'prompt2 output tokens': "={{ $('Pair Videos with Audio').item.json.output_tokens }}",
							'prompt3 output tokens':
								"={{ $('Generate Script').item.json.usage.completion_tokens }}",
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
								removed: false,
								required: false,
								displayName: 'caption',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'production',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'production',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'environment_prompt',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'environment_prompt',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'publishing',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'publishing',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'final_output',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'final_output',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'width',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'width',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'height',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'height',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'duration',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'duration',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'frameRate',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'frameRate',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'model1',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'model1',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'prompt1 input tokens',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'prompt1 input tokens',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'prompt1 output tokens',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'prompt1 output tokens',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'model1 cost',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'model1 cost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'model2',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'model2',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'prompt2 input tokens',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'prompt2 input tokens',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'prompt2 output tokens',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'prompt2 output tokens',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'model2 cost',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'model2 cost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'model3',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'model3',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'prompt3 input tokens',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'prompt3 input tokens',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'prompt3 output tokens',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'prompt3 output tokens',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'model3 cost',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'model3 cost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'cmCost',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'cmCost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'upgradeCmCost',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'upgradeCmCost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'fluxCost',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'fluxCost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'klingCost',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'klingCost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'totalCost',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'totalCost',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'datePosted',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'datePosted',
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
						matchingColumns: ['id'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1cjd8p_yx-M-3gWLEd5TargtoB35cW-3y66AOTNMQrrM/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1cjd8p_yx-M-3gWLEd5TargtoB35cW-3y66AOTNMQrrM',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1cjd8p_yx-M-3gWLEd5TargtoB35cW-3y66AOTNMQrrM/edit?usp=drivesdk',
						cachedResultName: 'Sheet Template',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1660, 700],
				name: 'Update Google Sheet',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.discord',
			version: 2,
			config: {
				parameters: {
					content: '=A new Resume Studio POV video has been created: {{ $json.final_output }}',
					options: {},
					authentication: 'webhook',
				},
				credentials: {
					discordWebhookApi: { id: 'credential-id', name: 'discordWebhookApi Credential' },
				},
				position: [1840, 700],
				name: 'Notify me on Discord',
			},
		}),
	)
	// Disconnected: Generate voice
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.elevenlabs.io/v1/text-to-speech/onwK4e9ZLuTAKqWW03F9',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{
								name: 'text',
								value: '={{ $json.choices[0].message.content }}',
							},
						],
					},
					headerParameters: {
						parameters: [
							{
								name: 'xi-api-key',
								value: "={{ $('Set API Keys').item.json['ElevenLabs API Key'] }}",
							},
						],
					},
				},
				position: [-60, 1020],
				name: 'Generate voice',
			},
		}),
	)
	// Disconnected: Generate Script
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4o-mini',
						cachedResultName: 'GPT-4O-MINI',
					},
					options: {},
					messages: {
						values: [
							{
								role: 'system',
								content:
									"=You are an unhinged and hilarious TikTok influencer who's like a mix of Andrew Tate and Charlie Sheen. The user is going to provide you with a topic, and then 5 different parts of a story. Your task is to narrate the story as this hilarious character, who isn't afraid to be edgy or curse or use sexual innuendos. However keep each of the 5 talking points brief, as you only have about 5 seconds to speak during each. The entire length of your narration should be around 15 seconds.\n\nEach line item of the users message represents 1 5 second clip, so your response needs to be able to quickly and easily be spoken in those time constraints. Don't say extra things you don't need to. Just quickly tell the story, in order, and make it unhinged, funny, entertaining, and potentially controversially viral. Don't worry about offendeding anyone. Andrew Tate style it.\n\nDo not include any emojis, as your response will be converted from text to speech, so anything but text and punctuation isn't neccesary. Also, don't make your jokes overly corny, speak in a witty, edgy, funny way, but no corny dad jokes or anything cringe.",
							},
							{
								content: "={{ $('Generate Video Captions').item.json.choices[0].message.content }}",
							},
						],
					},
					simplify: false,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-420, 1020],
				name: 'Generate Script',
			},
		}),
	)
	// Disconnected: Upload Voice Audio
	.add(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $('Load Google Sheet').item.json.id }}-voiceover.mp3",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: '1w1EQ8xyth6w7AbX2wpDI3vInfYeRy8vH',
						cachedResultUrl:
							'https://drive.google.com/drive/folders/1w1EQ8xyth6w7AbX2wpDI3vInfYeRy8vH',
						cachedResultName: 'Resume Studio',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [140, 1020],
				name: 'Upload Voice Audio',
			},
		}),
	)
	// Disconnected: Set Access Permissions
	.add(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
					options: {},
					operation: 'share',
					permissionsUi: {
						permissionsValues: { role: 'writer', type: 'anyone', allowFileDiscovery: true },
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [320, 1020],
				name: 'Set Access Permissions',
			},
		}),
	)
	.add(
		sticky(
			'## 2. 🖼️Generate images with Flux using [PiAPI](https://piapi.ai/?via=n8n) \n### (total cost: $0.0948 approx. as of 3/9/25)\n1. OpenAI is used to generate 5 Flux image prompts based on the 5 captions generated. Edit this node to see/edit the prompt instructions. \n2. Next we use some custom javascript to total up how many tokens were used for each 5 generations so we can track our costs later.\n3. Then we generate an image with Flux using the [PiAPI service](https://piapi.ai/?via=n8n), waiting to check for failures and retrying if there are any.\n\nYou can change the image model used by editing the Generate Image node API call.\nFlux models available (as of 3/9/25):\n- Qubico/flux1-dev ($0.015) - Currently set\n- Qubico/flux1-schnell ($0.0015)\n- Qubico/flux1-advanced ($0.02)\n\nFor full list of API settings, see the [Flux API Documentation](https://piapi.ai/docs/flux-api/text-to-image?via=n8n)\n',
			{ name: 'Sticky Note1', color: 5, position: [-560, -200], width: 1260, height: 460 },
		),
	)
	.add(
		sticky(
			"## 3. 🎬Generate videos with Kling using [PiAPI](https://piapi.ai/?via=n8n)\n### (total cost: $2.30 approx. as of 3/9/25)\n1. We use image-to-video with Kling using [PiAPI](https://piapi.ai/?via=n8n) to generate a video from each image.\n2. Then we wait to check for failures, and repeat the generations the failed if there are any.\n\nYou can edit the video model used in the Image-to-Video node. For testing, I'd recommend switching from pro to std for lower quality and cheaper price.\nKling models available (as of 3/9/25):\n- std (Standard) $0.26 per 5 second video\n- pro (Professional) $0.46 per 5 second video - Currently set\n\nFor full list of API settings, see the [Kling API Documentation](https://piapi.ai/docs/kling-api/create-task?via=n8n)\n",
			{ color: 6, position: [-460, 280], width: 1040, height: 500 },
		),
	)
	.add(
		sticky(
			'## 4. 🔉Generate voice overs with [Eleven Labs](https://try.elevenlabs.io/n8n)\n1. OpenAI API is used to generate a funny script that relates to the captions. Open this node to see/edit the prompt instructions. \n2. Then we use the [Eleven Labs API](https://try.elevenlabs.io/n8n) to generate the voiceover and upload it to our Google Drive so it can be accessed in the next step.\n\nTo replace the voice, find the voice ID of the voice you want to use in [Eleven Labs](https://try.elevenlabs.io/n8n), then change the URL in the Generate Voice node to: https://api.elevenlabs.io/v1/text-to-speech/{voice ID here}\n\nFor full list of API settings, see the [Eleven Labs API Documentation](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)\n',
			{ name: 'Sticky Note2', color: 4, position: [-460, 800], width: 1040, height: 400 },
		),
	)
	.add(
		sticky(
			"## 5. 📥Complete video with [Creatomate](https://creatomate.com/)\n### (total cost: $0.38 approx. with the Essential plan credits | Free trial credits available)\n1. First, the list of videos/captions is combined with the generated voice over into a single item containing all 3 elements.\n2. Those are then passed over to the Creatomate Template ID you specified, replacing the template captions/video/audio with your generated ones.\n3. When the video is finished rendering, it's then uploaded to Google Drive and the permissions set so it can be accessed with a link.\n4. Then we update the original Google Sheet template with the information from our generation, including tokens to calculate cost, then mark this idea as completed.\n5. Finally, we send a notification to via [webhook to the Discord server](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks) when the video is ready to be downloaded and used!\n\n",
			{ name: 'Sticky Note3', color: 3, position: [620, 480], width: 1360, height: 380 },
		),
	)
	.add(
		sticky(
			"# 🤖 AI-Powered Short-Form Video Generator with OpenAI, Flux, Kling, and ElevenLabs\n\n## 📃Before you get started, you'll need:\n- [n8n installation](https://n8n.partnerlinks.io/n8nTTVideoGenTemplate) (tested on version 1.81.4)\n- [OpenAI API Key](https://platform.openai.com/api-keys) (free trial credits available)\n- [PiAPI](https://piapi.ai/?via=n8n) (free trial credits available)\n- [Eleven Labs](https://try.elevenlabs.io/n8n) (free account)\n- [Creatomate API Key](https://creatomate.com/) (free trial credits available)\n- Google Sheets API enabled in [Google Cloud Console](https://console.cloud.google.com/apis/api/sheets.googleapis.com/overview)\n- Google Drive API enabled in [Google Cloud Console](https://console.cloud.google.com/apis/api/drive.googleapis.com/overview)\n- OAuth 2.0 Client ID and Client Secret from your [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)\n",
			{ name: 'Sticky Note4', position: [-1260, -160], width: 620, height: 420 },
		),
	)
	.add(
		sticky(
			'## 1. 🗨️Generate video captions from ideas in a Google Sheet\n\n1. Setup your API keys for [PiAPI](https://piapi.ai/?via=n8n), [Eleven Labs](https://try.elevenlabs.io/n8n), and [Creatomate](https://creatomate.com/).\n- Once logged in to your Creatomate account, create a new video template and click "source code" in the top right. [Paste this JSON code](https://pastebin.com/c7aMTeLK). This will be your example template for this workflow.\n- In your Creatomate template, click the "Use Template" button in the top right and then click "API Integration" and you\'ll see your template_id. Set this value as your Creatomate Template ID in the Set API Keys node\n\n2. The next node will load a Google Sheet, you can copy the [Google Sheet Template](https://docs.google.com/spreadsheets/d/1cjd8p_yx-M-3gWLEd5TargtoB35cW-3y66AOTNMQrrM/edit?usp=sharing), simply choose File > Make a copy. Then in the Google Sheets node, connect to your copied sheet template.\n\n3. Next, we generate 5 captions for our video idea with OpenAI. You can edit this node to see the prompt and change it to your needs.\n\n4. In the final two nodes, we use custom javascript code to turn the OpenAI response into a list. Then, it validates to make sure the list was formed correctly (incase of an OpenAI failure to follow instructions)\n',
			{ name: 'Sticky Note5', color: 7, position: [-1420, 340], width: 920, height: 700 },
		),
	)
	.add(
		sticky('## DO THIS FIRST\n', {
			name: 'Sticky Note6',
			color: 3,
			position: [-1380, 720],
			width: 220,
			height: 220,
		}),
	);
