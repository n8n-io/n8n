const wf = workflow('iuPhSS8Dr2Dl7Hbo', 'VEO3 Video Generator TEMPLATE', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {
						path: 'veo3-video-generator',
						buttonLabel: 'Create Video',
						appendAttribution: false,
					},
					formTitle: 'VEO3 Video Generator',
					formFields: {
						values: [
							{
								fieldLabel: 'Video Content',
								placeholder: 'e.g. Magical waterfall in the rainforest',
								requiredField: true,
							},
							{
								fieldType: 'dropdown',
								fieldLabel: 'Format',
								fieldOptions: { values: [{ option: '16:9' }] },
								requiredField: true,
							},
							{
								fieldType: 'dropdown',
								fieldLabel: 'Duration',
								fieldOptions: { values: [{ option: '8s' }] },
								requiredField: true,
							},
						],
					},
					formDescription: 'Currently only 16:9 and 8s videos are supported via fal.ai!',
				},
				position: [-300, 150],
				name: 'VEO3 Generator Form',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "=Video Content: {{ $json['Video Content'] }}\nFormat: {{ $json.Format }}\nDuration: {{ $json['Duration'] }}",
					options: {
						systemMessage:
							'=You are an expert for VEO3 video prompts and video marketing. Create optimal parameters for high-quality video generation with Google\'s VEO3 model from user input, including a creative, appealing title.\n\nTITLE CREATION:\n- Factual and objective (5-80 characters)\n- Precisely describes the main content of the video\n- Factual and informative, without exaggeration\n- Uses neutral, descriptive language\n- Avoids emotional words like "epic", "magical", "incredible"\n- Professionally and seriously formulated\n\nTITLE CATEGORIES:\n- Action/Sport: "Skier on Alpine slope", "Winter sports in the mountains"\n- Dialog/Drama: "Woman at train station", "Waiting scene in vintage setting"\n- Nature/Landscape: "Waterfall in rainforest", "Nature shot with water drops"\n- Everyday/People: "Chef in kitchen", "Work scene while cooking"\n- Technology/Objects: "Icicles melting", "Close-up of ice"\n- Architecture: "Modern building architecture", "Concrete building with organic forms"\n\nVEO3 PROMPT STRUCTURE (use all relevant elements):\n\nMANDATORY ELEMENTS:\n- Subject: Main subject (person, object, animal, scenery)\n- Context: Background, setting, environment\n- Action: What happens, movements, actions\n\nOPTIONAL ELEMENTS (for better quality):\n- Style: Specific film styles (cinematic, film noir, documentary, 3D cartoon, realistic, action movie, etc.)\n- Camera Motion: dolly shot, tracking shot, aerial view, eye-level, top-down, low-angle, zoom in/out, pan shot, static shot\n- Composition: wide shot, close-up, extreme close-up, medium shot, over-the-shoulder, single shot, two shot\n- Ambiance: Color palette and lighting (warm golden tones, cool blue tones, natural sunlight, dramatic shadows, soft focus, shallow depth of field)\n- Audio: Dialogues (in quotation marks), Ambient Sounds, Music (VEO3 generates native audio!)\n\nTECHNICAL BEST PRACTICES:\n- Use descriptive adjectives and adverbs for clear images\n- For people: Specify facial details, emotions, clothing, body posture\n- For dialogues: Write exact words in quotation marks for perfect lip-sync\n- For realism: Mention physics, natural movements, realistic interactions\n- Camera work: Use professional film terminology\n- Lighting: Specify light sources and mood\n- Audio: Describe ambient sounds, music and spoken words\n\nASPECT RATIO INTELLIGENCE:\n- FAL.AI VEO3 currently supports ONLY 16:9 (Landscape) format\n- All videos are automatically created in 16:9 format\n- Optimize prompts for Landscape/Cinema presentation\n\nDURATION INTELLIGENCE:\n- FAL.AI VEO3 currently supports ONLY 8s duration\n- All videos are automatically created with 8s length\n- Optimize prompts for 8-second sequences\n\nAUDIO OPTIMIZATION (VEO3\'s strength!):\n- ALWAYS specify audio elements since VEO3 generates native audio\n- Dialogues: Exact words in quotation marks for perfect lip-sync\n- Ambient: Matching background sounds to the scene (wind, traffic, nature, etc.)\n- Music: Mood-appropriate description (energetic, melancholic, epic, upbeat, dramatic, etc.)\n- Sound Effects: Specific sounds (footsteps, doors, machines, etc.)\n\nSTYLE CATEGORIES (all optimized for 16:9 Landscape):\n- Cinematic: "Cinematic style", "film noir", "documentary style", "movie scene"\n- Animation: "3D cartoon style render", "animated style", "stylized animation"\n- Realistic: "Photorealistic", "documentary footage", "natural lighting"\n- Gaming: "Video game aesthetic", "third-person view", "FPS perspective"\n- Commercial: "Advertisement style", "product showcase", "commercial photography"\n- Action/Sport: "Dynamic wide shots", "landscape cinematography", "widescreen action"\n\nEXAMPLE PROMPTS (all optimized for 16:9 Landscape, 8s):\n\nAction/Sport:\nTitle: "Skier on Alpine slope"\nPrompt: "Wide cinematic tracking shot following a professional skier carving down a pristine alpine slope. Camera positioned parallel to slope, capturing skier\'s full body and dramatic powder sprays against mountain landscape. Skier approaches from distance, passes camera at mid-range and continues down slope. As he passes, he shouts: \'I LOVE SKIING!\' Audio captures swoosh of skis, wind rushing, clear English exclamation. Widescreen sports cinematography with motion blur, 8-second sequence showcasing pure skiing joy."\n\nDialog/Drama:\nTitle: "Woman waiting at train station"\nPrompt: "Wide cinematic shot of a vintage train station with woman in 1940s dress walking through the bustling scene. Camera dollies alongside in medium wide shot, showing full environment and character. Steam rises from locomotives in background. She checks pocket watch while walking, worry visible on her face. Warm golden lighting filters through tall station windows. She whispers: \'He promised to be here.\' Train announcements and steam hissing throughout. Film noir style, 8-second scene building dramatic tension."\n\nNature/Landscape:\nTitle: "Waterfall in rainforest"\nPrompt: "Sweeping aerial establishing shot of a majestic waterfall cascading through lush rainforest. Camera starts wide, slowly moving closer to reveal mist and spray details. Full landscape visible with dense canopy and multiple water levels. Dappled sunlight filters through trees creating dynamic lighting. Natural sounds of rushing water, birds chirping, leaves rustling build throughout 8-second sequence. Documentary style with rich green tones and cinematic widescreen composition."\n\nEveryday/People:\nTitle: "Chef preparing meal"\nPrompt: "Wide shot of a modern kitchen with chef enthusiastically preparing a meal. Camera circles around showing full cooking environment. Steam rises from multiple pans as chef juggles ingredients with theatrical flair. He declares with passion: \'Cooking is pure magic!\' Sounds of sizzling, chopping, and upbeat background music. Bright, colorful lighting with warm kitchen ambiance. 8-second sequence capturing culinary excitement and energy."\n\nTransform the user input into a factual title and professional VEO3 prompt with maximum visual and audio quality. Consider all prompt elements for best possible results.\n\nIMPORTANT:\n- Create FIRST an objective, factual title without exaggeration\n- All videos are automatically created in 16:9 Landscape format with 8s duration\n- Optimize prompts accordingly for widescreen presentation and 8-second sequences\n- Title should factually describe what is shown in the video\n- Avoid emotional words like "epic", "magical", "incredible", "spectacular"',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
						version: 1.3,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'claude-sonnet-4-20250514',
									cachedResultName: 'Claude 4 Sonnet',
								},
								options: {},
							},
							credentials: {
								anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
							},
							name: 'Anthropic Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								schemaType: 'manual',
								inputSchema:
									'{\n  "type": "object",\n  "properties": {\n    "title": {\n      "type": "string",\n      "description": "Creative, meaningful title for the video - short, concise and matching the content",\n      "minLength": 5,\n      "maxLength": 80\n    },\n    "prompt": {\n      "type": "string",\n      "description": "Detailed VEO3 prompt with Subject, Context, Action, Style, Camera Motion, Composition, Ambiance and Audio elements",\n      "minLength": 50,\n      "maxLength": 2000\n    },\n    "aspect_ratio": {\n      "type": "string",\n      "enum": ["16:9"],\n      "description": "Video aspect ratio - currently only 16:9 Landscape/Cinema supported"\n    },\n    "duration": {\n      "type": "string",\n      "enum": ["8s"],\n      "description": "Video duration in seconds - currently only 8s supported"\n    }\n  },\n  "required": ["title", "prompt", "aspect_ratio", "duration"],\n  "additionalProperties": false\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [-80, 150],
				name: 'Video Prompt Generator',
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
					url: 'https://queue.fal.run/fal-ai/veo3',
					method: 'POST',
					options: {
						timeout: 60000,
						redirect: { redirect: {} },
						response: { response: { responseFormat: 'json' } },
						allowUnauthorizedCerts: false,
					},
					jsonBody:
						'={\n  "prompt": "{{ $json.output.prompt }}",\n  "aspect_ratio": "{{ $json.output.aspect_ratio || \'16:9\' }}",\n  "duration": "{{ $json.output.duration || \'8s\' }}"\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Authorization', value: 'Key <YOUR-FAL.AI API KEY>' },
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
				},
				position: [296, 75],
				name: 'Create VEO3 Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 30 }, position: [516, 75], name: 'Wait 30 seconds' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://queue.fal.run/fal-ai/veo3/requests/{{ $('Create VEO3 Video').first().json.request_id }}/status",
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Key <YOUR-FAL.AI API KEY>' }],
					},
				},
				position: [736, 0],
				name: 'Check VEO3 Status',
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
								id: 'e83af8f6-f0db-47fd-b41a-44c07929b186',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.status }}',
								rightValue: 'COMPLETED',
							},
						],
					},
				},
				position: [956, 75],
				name: 'Video completed?',
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
					url: "=https://queue.fal.run/fal-ai/veo3/requests/{{ $('Create VEO3 Video').first().json.request_id }}",
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Key <YOUR-FAL.AI API KEY>' }],
					},
				},
				position: [1176, 75],
				name: 'Get VEO3 Video URL',
			},
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
				position: [1396, 75],
				name: 'Download VEO3 Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: {
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
				},
				position: [1616, 150],
				name: 'Merge',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: '={{ $json.output.title }}.mp4',
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: '1Q5slmjwk2tDrhN2BgQeZ6ITD-69dKYnV',
						cachedResultUrl:
							'https://drive.google.com/drive/folders/1Q5slmjwk2tDrhN2BgQeZ6ITD-69dKYnV',
						cachedResultName: 'VEO3_Videos',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [1836, 150],
				name: 'Save Video to Google Drive',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 1,
			config: {
				parameters: {
					options: {},
					operation: 'completion',
					completionTitle: 'Your video has been created!',
					completionMessage:
						'=Your video "{{ $(\'Merge\').first().json.output.title }}" has been successfully created!\nYou can access it here: {{ $json.webViewLink }}',
				},
				position: [2056, 150],
				name: 'Video Output',
			},
		}),
	)
	.add(
		sticky(
			"# Welcome to my VEO3 Video Generator Workflow!\n## This workflow has the following sequence:\n1. **VEO3 Generator Form** - Web form interface for users to input video content, format, and duration\n2. **Video Prompt Generator** - AI agent powered by Claude 4 Sonnet that:\n   - Analyzes user input for video content requirements\n   - Creates factual, professional video titles\n   - Generates detailed VEO3 prompts with subject, context, action, style, camera motion, composition, ambiance, and audio elements\n   - Optimizes prompts for 16:9 landscape format and 8-second duration\n3. **Create VEO3 Video** - Submits the optimized prompt to fal.ai VEO3 API for video generation\n4. **Wait 30 seconds** - Initial waiting period for video processing to begin\n5. **Check VEO3 Status** - Monitors the video generation status via fal.ai API\n6. **Video completed?** - Decision node that checks if video generation is finished\n   - If not completed: Returns to wait cycle\n   - If completed: Proceeds to video retrieval\n7. **Get VEO3 Video URL** - Retrieves the final video download URL from fal.ai\n8. **Download VEO3 Video** - Downloads the generated MP4 video file\n9. **Merge** - Combines video data with metadata for final processing\n10. **Save Video to Google Drive** - Uploads the video to specified Google Drive folder\n11. **Video Output** - Displays completion message with Google Drive link to user\n\n## The following accesses are required for the workflow:\n- **Anthropic API** (Claude 4 Sonnet): [Documentation](https://docs.n8n.io/integrations/builtin/credentials/anthropic/)\n- **Fal.ai API** (VEO3 Model): Create API key at [https://fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)\n- **Google Drive API**: [Documentation](https://docs.n8n.io/integrations/builtin/credentials/google/)\n\n## Workflow Features:\n- **User-friendly web form**: Simple interface for video content input\n- **AI-powered prompt optimization**: Claude 4 Sonnet creates professional VEO3 prompts\n- **Automatic video generation**: Leverages Google's VEO3 model via fal.ai\n- **Status monitoring**: Real-time tracking of video generation progress\n- **Google Drive integration**: Automatic upload and sharing of generated videos\n- **Structured output**: Consistent video titles and professional prompt formatting\n- **Audio optimization**: VEO3's native audio generation with ambient sounds and music\n\n## Current Limitations:\n- **Format**: Only 16:9 landscape videos supported\n- **Duration**: Only 8-second videos supported\n- **Processing time**: Videos typically take 60-120 seconds to generate\n\n## Use Cases:\n- **Content creation**: Generate videos for social media, websites, and presentations\n- **Marketing materials**: Create promotional videos and advertisements\n- **Educational content**: Produce instructional and explanatory videos\n- **Prototyping**: Rapid video concept development and testing\n- **Creative projects**: Artistic and experimental video generation\n- **Business presentations**: Professional video content for meetings and pitches\n\nYou can contact me via LinkedIn, if you have any questions: https://www.linkedin.com/in/friedemann-schuetz",
			{ position: [-1120, -420], width: 720, height: 1280 },
		),
	);
