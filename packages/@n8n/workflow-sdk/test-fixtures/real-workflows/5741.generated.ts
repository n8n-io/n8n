const wf = workflow('FqIyXIEKFojlkN9k', 'FalAI_SeeDanceV1.0_Eng_Template', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-340, -220], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: { returnFirstMatch: false },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1FuDdvkzq5TZ3Evs92BxUxD4qOK0EDLAzB-SayKwpAdw/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1FuDdvkzq5TZ3Evs92BxUxD4qOK0EDLAzB-SayKwpAdw',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1FuDdvkzq5TZ3Evs92BxUxD4qOK0EDLAzB-SayKwpAdw/edit?usp=drivesdk',
						cachedResultName: 'n8n_Longform_Video',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-200, -220],
				name: 'Get Data',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '=Instructions:\n\nCreate a captivating, vivid, and detailed short video story based on the idea provided below. The story should feel immersive, emotional, and cinematic — suitable for visual storytelling.\nPlease ensure the following:\n\nInclude a rich, visually descriptive setting (lighting, weather, architecture, colors).\n\nDescribe the main characters clearly: their appearance, mood, clothing, and motivations.\n\nBuild a sense of mood, tension, or emotional arc.\n\nKeep the tone aligned with the theme of the original idea.\n\nFormat your output as long-form narrative text.\n\nIdea: {{ $json.story }}',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
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
									value: 'gpt-4o-mini',
									cachedResultName: 'gpt-4o-mini',
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
						version: 1.2,
						config: {
							parameters: {
								schemaType: 'manual',
								inputSchema:
									'{\n    "type": "object",\n    "properties": {\n        "story": {\n            "type": "string",\n            "description": "the detailed story"\n        }\n    },\n    "required": [\n        "story"\n    ]\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [-60, -220],
				name: 'Generate Full Narrative from Prompt',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "=<Instructions>\n\nBreak down the following story into a script (for short video) with exacly {{ $('Get Data').item.json.number_of_scene }} scenes.\n\n</Instructions>\n\n<Story>\n{{ $json.output.story }}\n</Story>",
					options: {},
					promptType: 'define',
					hasOutputParser: true,
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
							name: 'OpenAI Chat Model2',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								schemaType: 'manual',
								inputSchema:
									'{\n    "type": "object",\n    "properties": {\n        "scenes": {\n            "type": "array",\n            "description": "the scenes",\n            "items": {\n                "type": "string"\n            }\n        }\n    },\n    "required": [\n        "scenes"\n    ]\n}',
							},
							name: 'Structured Output Parser1',
						},
					}),
				},
				position: [260, -220],
				name: 'Break Narrative into {{n}} Scenes',
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
						'const scenes = $json.output?.scenes || [];\n\nreturn [\n  {\n    sceneCount: scenes.length,\n    scenes: scenes\n  }\n];',
				},
				position: [600, -220],
				name: 'Verify number of scene',
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
								id: '5e3573c7-f98e-4d2a-a58e-ae75b76eb0a6',
								operator: { type: 'number', operation: 'lt' },
								leftValue: '={{ $json.sceneCount }}',
								rightValue: "={{ $('Get Data').item.json.number_of_scene }}",
							},
						],
					},
				},
				position: [760, -220],
				name: 'Scene count',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'scenes' },
				position: [940, -180],
				name: 'Split Out',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "=Prompt Template: Generate Detailed Scene (5s Clip)\n\nInstructions:\nCreate a detailed visual breakdown of the following scene.\nUse the full story context to ensure continuity, tone, and emotional flow.\n\nFor this scene, include:\n\n1. Characters in the Scene:\n- List all characters present\n- Describe their age, attire, appearance, posture, emotion, and current action\n\n2. Scene Background & Environment:\n- Describe the setting in detail (lighting, background elements, color palette, time of day)\n- Mention any objects in the environment that affect mood or action\n\n3. Camera Direction:\n- Describe camera angle, motion (e.g. dolly, pan, zoom), perspective, or transitions during the 5s scene\n\n4. Object & Character Movement:\n- Describe how characters or objects move within this 5-second clip\n- Use dynamic motion where appropriate\n\n5. Sound Effects & Ambience:\n- Describe background sound, music, or specific SFX\n- Include emotional tone and pacing of sound\n\nScene Input:\n{{ $json.scenes }}\n\n\nFull Story Reference:\n{{ $('Generate Full Narrative from Prompt').item.json.output.story }}\n\nOutput Format Example:\n\nCharacters:\n- Anya (17): Wears a tattered blue coat. Snow clings to her hair. She breathes heavily, face flushed from the cold. Her eyes are locked ahead, determined.\n- The Old Man (60s): Frail, cloaked in furs, holding a lantern that flickers with a weak flame.\n\nScene Background: A narrow trail carved through pine trees covered in frost. The sky is turning orange. In the distance, the silhouette of a crumbling tower. Mist coils low to the ground.\n\nCamera Movement: Slow push-in from behind Anya’s shoulder, transitioning to a side dolly as she steps forward and the tower comes into view.\n\nMovement in Scene: Snowflakes fall steadily. Anya trudges forward. The Old Man stops, raises his lantern slightly, casting light across the branches. A raven flutters from a tree.\n\nSound Design:\n- Soft wind whistling through trees\n- Crunching snow with each step\n- Distant echo of a bell\n- Faint strings rise in tension as the tower is revealed",
					options: {},
					promptType: 'define',
					hasOutputParser: true,
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
							name: 'OpenAI Chat Model1',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								schemaType: 'manual',
								inputSchema:
									'{\n    "type": "object",\n    "properties": {\n        "characters": {\n            "type": "array",\n            "description": "the list of characters in the scene",\n            "items": {\n                "type": "object",\n                "properties": {\n                    "name": {\n                        "type": "string",\n                        "description": "the name of the character"\n                    },\n                    "description": {\n                        "type": "string",\n                        "description": "the detailed description of the character (visual outlook)"\n                    }\n                },\n                "required": [\n                    "name",\n                    "description"\n                ]\n            }\n        },\n        "scene_description": {\n            "type": "string",\n            "description": "the detailed description of the scene"\n        },\n        "camera_movement": {\n            "type": "string",\n            "description": "the description of the camera movement (if any)"\n        },\n        "object_movements": {\n            "type": "string",\n            "description": "the detailed description of the movement of the objects on the screen"\n        },\n        "sound_effects": {\n            "type": "string",\n            "description": "the sound effects the viewer can hear during the scene"\n        }\n    },\n    "required": [\n        "characters",\n        "scene_description",\n        "camera_movement",\n        "object_movements",\n        "sound_effects"\n    ]\n}',
							},
							name: 'Structured Output Parser2',
						},
					}),
				},
				position: [-300, 40],
				name: 'Describe Each Scene for Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://queue.fal.run/fal-ai/{{ $('Get Data').item.json.model }}",
					method: '=POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'prompt',
								value:
									"=<Characters>\n{{ $json.output.characters.map(character => `<Character>\n  <Name>${character.name}</Name>\n  <Description>${character.description}</Description>\n</Character>`).join('\\n') }}\n</Characters>\n\n<SceneDescription>\n{{ $json.output.scene_description }}\n</SceneDescription>\n\n<CameraMovements>\n{{ $json.output.camera_movement }}\n</CameraMovements>\n\n<ObjectMovements>\n{{ $json.output.object_movements }}\n</ObjectMovements>",
							},
							{
								name: 'aspect_ratio',
								value: "={{ $('Get Data').item.json.aspect_ratio }}",
							},
							{
								name: 'resolution',
								value: "={{ $('Get Data').item.json.resolution }}",
							},
							{
								name: 'duration',
								value: "={{ $('Get Data').item.json.duration }}",
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [20, 40],
				name: 'Call Fal.ai API (Seedance)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [200, 40], name: 'Loop Over Items' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/mmaudio-v2',
					method: 'POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'video_url', value: '={{ $json.video.url }}' },
							{
								name: 'prompt',
								value: "={{ $('Describe Each Scene for Video').item.json.output.sound_effects }}",
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-540, 340],
				name: 'Start adding audio to the video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-540, 520], name: 'Loop Over Items1' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: { options: {}, aggregate: 'aggregateAllItemData' },
				position: [200, 500],
				name: 'Aggregate videos with audio',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/ffmpeg-api/compose',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "tracks": [\n    {\n      "id": "1",\n      "type": "video",\n      "keyframes": {{ JSON.stringify($json.data.map((item, index) => ({ url: item.video.url, timestamp: index * 6000, duration: 6000 }))) }}\n    }\n  ]\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [400, 320],
				name: 'Start merging videos',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { amount: 1 },
				position: [620, 320],
				name: 'Wait for the merge to complete',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $('Start merging videos').item.json.status_url }}",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [780, 320],
				name: 'Get merge videos status',
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
								outputKey: 'COMPLETED',
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
											id: '6fc5bea4-1567-474b-bfca-5394eb303217',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'COMPLETED',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'IN_PROGRESS',
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
											id: '0882f634-2472-4d24-a1c3-a39f0cd94855',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.status }}',
											rightValue: 'IN_PROGRESS',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'IN_QUEUE',
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
											id: 'e6c8b207-13ac-4537-8c5c-677039bc2fef',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.status }}',
											rightValue: 'IN_QUEUE',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [960, 320],
				name: 'Merge videos status',
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
					url: "={{ $('Start merging videos').item.json.response_url }}",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [400, 480],
				name: 'Get merged video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.video_url }}',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [600, 540],
				name: 'Get the  video1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.youTube',
			version: 1,
			config: {
				parameters: {
					title: "={{ $('Get Data').item.json.story }}",
					options: {},
					resource: 'video',
					operation: 'upload',
					categoryId: '28',
					regionCode: 'TH',
				},
				credentials: {
					youTubeOAuth2Api: { id: 'credential-id', name: 'youTubeOAuth2Api Credential' },
				},
				position: [780, 540],
				name: 'YouTube',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { amount: 1 },
				position: [-320, 320],
				name: 'Wait for adding the audio',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $('Start adding audio to the video').item.json.status_url }}",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-320, 460],
				name: 'Get audio status',
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
								outputKey: 'COMPLETED',
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
											id: '6fc5bea4-1567-474b-bfca-5394eb303217',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'COMPLETED',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'IN_PROGRESS',
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
											id: '0882f634-2472-4d24-a1c3-a39f0cd94855',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.status }}',
											rightValue: 'IN_PROGRESS',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'IN_QUEUE',
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
											id: 'e6c8b207-13ac-4537-8c5c-677039bc2fef',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.status }}',
											rightValue: 'IN_QUEUE',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [-120, 460],
				name: 'Audio status',
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
					url: "={{ $('Start adding audio to the video').item.json.response_url }}",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-120, 320],
				name: 'Get video with audio',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [380, 80], name: 'Wait for the video' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $('Loop Over Items').item.json.status_url }}",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [540, 80],
				name: 'Get the video status',
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
								outputKey: 'COMPLETED',
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
											id: '6fc5bea4-1567-474b-bfca-5394eb303217',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.status }}',
											rightValue: 'COMPLETED',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'IN_PROGRESS',
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
											id: '0882f634-2472-4d24-a1c3-a39f0cd94855',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.status }}',
											rightValue: 'IN_PROGRESS',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'IN_QUEUE',
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
											id: 'e6c8b207-13ac-4537-8c5c-677039bc2fef',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.status }}',
											rightValue: 'IN_QUEUE',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [700, 80],
				name: 'Video status',
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
					url: "={{ $('Loop Over Items').item.json.response_url }}",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [920, 60],
				name: 'Get the  video',
			},
		}),
	)
	.add(
		sticky(
			"### 🟨 Zone 1: Prompt Input & Story-to-Scenes\n\n1. **When clicking 'Execute workflow**\n2. **Get Data (Google Sheets)**\n3. **Generate Full Narrative from Prompt**\n4. **Break Narrative into {{n}} Scenes**\n5. **Verify number of scene**\n",
			{ position: [-720, -240], width: 1840, height: 240 },
		),
	)
	.add(
		sticky(
			'### 🟫 Zone 2: Create Scene Prompts & Generate Video\n\n1. **Split Out**\n2. **Describe Each Scene for Video**\n3. **Call Fal.ai API (Seedance)**\n4. **Loop Over Items**\n5. **Wait for the video / Get the video status / Video status**\n',
			{ name: 'Sticky Note1', color: 2, position: [-720, 20], width: 1840, height: 240 },
		),
	)
	.add(
		sticky(
			'### 🟥 Zone 3: Add Audio to Video with Fal AI\n1. **Start adding audio to the video**\n2. **Loop Over Items1**\n',
			{ name: 'Sticky Note2', color: 3, position: [-720, 280], width: 780, height: 400 },
		),
	)
	.add(
		sticky(
			'### 🟩 Zone 4: Merge Videos & Download Final Output\n\n1. **Aggregate videos with audio**\n2. **Start merging videos ffmpeg**\n3. **Wait for the merge to complete**\n4. **Get merged video**\n',
			{ name: 'Sticky Note3', color: 4, position: [80, 280], width: 1040, height: 400 },
		),
	);
