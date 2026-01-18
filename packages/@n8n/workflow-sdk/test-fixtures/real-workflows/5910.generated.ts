const wf = workflow('', 'Veo3 Instagram Agent Workflow', { executionOrder: 'v1' })
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [-180, -20],
				name: 'When chat message received',
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
						value: 'gpt-4',
						cachedResultName: 'GPT-4',
					},
					options: {},
					messages: {
						values: [
							{ content: '={{ $json.chatInput }}' },
							{
								role: 'system',
								content:
									'You are a creative video prompt generator for short-form reels (e.g., Instagram, TikTok). Based on:\n\nThe chat input of the user\n\nYour task is to craft an elaborate, visually descriptive video generation prompt suitable for input into the Seedance/Veo3 API.\n\n🛑 Do not include any extra explanation, formatting, or commentary. Your entire output must be the exact prompt to pass into the video generator.\n\nThe prompt should:\n– Be under 100 words\n– Describe the visual elements, tone, and motion clearly\n– Reflect the thematic visual in a coherent manner\n\nExample of your expected output format:\n\n“A close-up slow-motion shot of a glass perfume bottle as morning sunlight filters through mist. The background shows soft-focus wildflowers, matching the theme of natural beauty and calm. Overlay text: ‘Nature’s Elegance. Reinvented.’ Trend-inspired styling based on the ‘quiet luxury’ aesthetic. For Instagram.”',
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [40, -20],
				name: 'AI Video Prompt Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.wavespeed.ai/api/v3/google/veo3-fast',
					method: 'POST',
					options: { redirect: { redirect: {} } },
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'aspect_ratio', value: '9:16' },
							{ name: 'duration', value: '8' },
							{ name: 'enable_prompt_expansion', value: 'true' },
							{ name: 'generate_audio', value: 'true' },
							{ name: 'prompt', value: '={{ $json.message.content }}' },
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [400, -20],
				name: 'Veo3 Video Generator',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 30 }, position: [620, -20], name: '30 Wait' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.wavespeed.ai/api/v3/predictions/{{ $json.data.id }}/result',
					options: { redirect: { redirect: {} } },
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [840, -20],
				name: 'HTTP Get Request',
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
								id: '57f70829-d058-494e-b438-7ce9dc8a6384',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.data.status }}',
								rightValue: 'processing',
							},
						],
					},
				},
				position: [1060, -20],
				name: 'If',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 30 }, position: [1020, 180], name: 'Wait 30 Secs' },
		}),
	)
	.output(1)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'chatgpt-4o-latest',
						cachedResultName: 'CHATGPT-4O-LATEST',
					},
					options: {},
					messages: {
						values: [
							{
								content:
									"=Based on this video generation prompt, create an impactful accompanying caption for the Instagram Post: {{ $('AI Video Prompt Agent').item.json.message.content }}",
							},
							{
								role: 'system',
								content:
									"You're an Instagram Caption copywriter. You'll receive a set of video prompt message that is used for generating an Instagram short reel video. Your job is to write an effective accompanying caption. Language style should be playful and impactful.",
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1280, -20],
				name: 'Caption Agent',
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
							Status: 'Ready to Post',
							Caption: '={{ $json.message.content }}',
							'Video URL (google drive)': "={{ $('If').item.json.data.outputs[0] }}",
							'Video Description / Prompt':
								"={{ $('AI Video Prompt Agent').item.json.message.content }}",
						},
						schema: [
							{
								id: 'Video Description / Prompt',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Video Description / Prompt',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Video URL (google drive)',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Video URL (google drive)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Caption',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Caption',
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
						],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'append',
					sheetName: '',
					documentId: '',
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1680, -20],
				name: 'Google Sheet Ready To Post',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: { mode: 'raw', options: {}, jsonOutput: '{}' },
				position: [1860, -20],
				name: 'Edit Fields',
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
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'url',
								value:
									"={{ $('Google Sheet Ready To Post').item.json['Video URL (google drive)'] }}",
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2060, -20],
				name: 'Upload Bloatato',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "target": {\n      "targetType": "instagram"\n    },\n    "content": {\n      "text": {{ $(\'Google Sheet Ready To Post\').item.json.Caption.toJsonString() }},\n      "platform": "instagram",\n      "mediaUrls": ["{{ $json.url }}"]\n    },\n    "accountId": "{{ YOUR_INSTAGRAM_ID }}"\n  }\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2260, -20],
				name: 'Publish to IG',
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
							Status: 'Posted',
							'Video URL (google drive)':
								"={{ $('Google Sheet Ready To Post').item.json['Video URL (google drive)'] }}",
						},
						schema: [
							{
								id: 'Video Description / Prompt',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Video Description / Prompt',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Video URL (google drive)',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Video URL (google drive)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Caption',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Caption',
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
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Video URL (google drive)'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: '',
					documentId: '',
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2500, -20],
				name: 'Google Sheets1',
			},
		}),
	)
	.add(sticky('Chat Trigger', { position: [-300, -260], width: 300, height: 820 }))
	.add(
		sticky('Video Prompt Agent', {
			name: 'Sticky Note1',
			color: 4,
			position: [20, -260],
			width: 300,
			height: 820,
		}),
	)
	.add(
		sticky('Video Prompt Agent', {
			name: 'Sticky Note2',
			color: 5,
			position: [340, -260],
			height: 820,
		}),
	)
	.add(
		sticky('Veo3 Get Requst Loop', {
			name: 'Sticky Note3',
			color: 6,
			position: [600, -260],
			width: 640,
			height: 820,
		}),
	)
	.add(
		sticky('Caption Agent', {
			name: 'Sticky Note4',
			color: 3,
			position: [1260, -260],
			width: 320,
			height: 820,
		}),
	)
	.add(
		sticky('Upload to Google Sheet, Blotato and Post', {
			name: 'Sticky Note5',
			color: 2,
			position: [1600, -260],
			width: 820,
			height: 820,
		}),
	)
	.add(
		sticky('Update Google Sheet', {
			name: 'Sticky Note6',
			color: 4,
			position: [2440, -260],
			width: 300,
			height: 820,
		}),
	)
	.add(
		sticky(
			'📱 Veo3 Instagram Agent – Create & Auto-Post Reels with AI\nDescription:\nThis no-code workflow automates the full pipeline of generating and publishing Instagram Reels using Veo3 (via Wavespeed API). From prompt to post, it handles content ideation, short-form video generation, caption writing, logging, and even automatic publishing to Instagram via Blotato.\n\nPerfect for creators, brands, and marketers who want to scale content creation without needing to shoot or edit videos manually.\n\n🔗  Watch the full step-by-step tutorial on how to build this workflow:\nhttps://www.youtube.com/@Automatewithmarc\n\n🚀 What This Workflow Does:\nTrigger via Chat or Telegram\n Start with a simple message like:\n "Make a reel for a luxury minimalist candle brand using calm aesthetics."\n\nAI Video Prompt Generation\n Uses OpenAI to craft a visually rich, platform-optimized video description prompt.\n\n🎞️ Video Creation with Veo3 API\n Submits your prompt to Veo3 to create a short video (9:16 ratio, 8 seconds) with motion, tone, and trend styles.\n\n✍️ Caption Writing\n An AI agent writes an engaging and playful caption based on the video content.\n\n📄 Google Sheets Logging\n Stores prompt, video URL, caption, and status in a GSheet to keep track of all generated assets.\n\n📤 Auto-Publish to Instagram\n Posts the video + caption directly to Instagram using Blotato’s social media publishing API.\n\n🔌 Tools & Integrations Used:\nOpenAI for prompt & caption generation\n\nWavespeed API (Veo3) for video generation\n\nGoogle Sheets for tracking\n\nBlotato for scheduling & publishing content\n\nn8n for orchestration and automation logic\n\n💡 Use Cases:\nContent calendar automation for small teams\n\nTrend-based ad creation and testing\n\nUGC-style reel generation for e-commerce\n\nRapid ideation & creative experimentation',
			{ name: 'Sticky Note7', position: [-1060, -260], width: 700, height: 1020 },
		),
	);
