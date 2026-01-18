const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-656, 1872], name: 'When clicking ‘Execute workflow’' },
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
								id: '774ed91a-11bd-4584-ad9c-418e9caf88df',
								name: 'prompt',
								type: 'string',
								value: '=YOUR_VIDEO_PROMPT_DESCRIPTION',
							},
							{
								id: 'b170f8a2-4c85-409f-95a5-bfe78fb1a865',
								name: 'sound',
								type: 'boolean',
								value: false,
							},
							{
								id: 'f810bb1e-e54d-4fc8-9be7-72426902de3f',
								name: 'duration',
								type: 'string',
								value: '=10',
							},
							{
								id: 'fa5280c1-3e23-427f-b64a-6b049f47a123',
								name: 'aspect_ratio',
								type: 'string',
								value: '9:16',
							},
						],
					},
				},
				position: [-448, 1872],
				name: 'Set Text to Video Parameters',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/createTask',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "model": "kling-2.6/text-to-video",\n    "input": {\n      "prompt": "{{ $json.prompt }}",\n      "sound": {{ $json.sound }},\n      "duration": {{ $json.duration }},\n      "aspect_ratio":{{ $json.aspect_ratio }}\n    }\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [-256, 1872],
				name: 'Submit Video Generation Request',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1,
			config: {
				parameters: { unit: 'seconds', amount: 5 },
				position: [-16, 1872],
				name: 'Wait for Video Generation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/recordInfo',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
					queryParameters: {
						parameters: [{ name: 'taskId', value: '={{ $json.data.taskId }}' }],
					},
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [144, 1872],
				name: 'Check Video Generation Status',
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
								outputKey: 'fail',
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
											id: 'fail-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'fail',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'success',
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
											id: 'success-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'success',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'generating',
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
											id: 'generating-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'generating',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'queuing',
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
											id: 'queuing-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'queuing',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'waiting',
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
											id: 'waiting-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'waiting',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [368, 1824],
				name: 'Switch Video Generation Status',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// n8n Function node\nconst items = $input.all();\nconst out = [];\n\nfor (const item of items) {\n  // Your HTTP node sometimes returns an array at top-level\n  const payload = item.json;\n  const first = Array.isArray(payload) ? payload[0] : payload;\n\n  // Get the stringified resultJson safely\n  const resultJsonStr = first?.data?.resultJson ?? '';\n\n  // Parse and extract\n  let resultUrls = [];\n  try {\n    const parsed = JSON.parse(resultJsonStr);\n    resultUrls = parsed?.resultUrls ?? [];\n  } catch (e) {\n    // leave resultUrls as []\n  }\n\n  out.push({ json: { resultUrls } });\n}\n\nreturn out;\n",
				},
				position: [608, 1840],
				name: 'Extract Video URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: { url: '={{ $json.resultUrls[0] }}', options: {} },
				position: [784, 1840],
				name: 'Download Video File',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '774ed91a-11bd-4584-ad9c-418e9caf88df',
								name: 'prompt',
								type: 'string',
								value: '=YOUR_VIDEO_PROMPT_DESCRIPTION',
							},
							{
								id: 'f810bb1e-e54d-4fc8-9be7-72426902de3f',
								name: 'duration',
								type: 'string',
								value: '=5',
							},
							{
								id: 'eac7bc3a-db33-4a87-b073-c6cb7a67ac5f',
								name: 'image_urls',
								type: 'string',
								value: '=YOUR_IMAGE_URL',
							},
							{
								id: 'c43f5f72-882c-4060-8aad-50996ce2c9b0',
								name: 'sound',
								type: 'boolean',
								value: true,
							},
						],
					},
				},
				position: [-432, 2384],
				name: 'Set Prompt & Image Url',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/createTask',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "model": "kling-2.6/image-to-video",\n    "input": {\n      "prompt": "{{ $json.prompt }}",\n      "image_urls": [\n        "{{ $json.image_urls }}"\n      ],\n      "sound": {{ $json.sound }},\n      "duration": {{ $json.duration }}\n    }\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [-208, 2384],
				name: 'Submit Video Generation1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1,
			config: {
				parameters: { unit: 'seconds', amount: 5 },
				position: [16, 2384],
				name: 'Wait for Image-to-Video Generation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/recordInfo',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
					queryParameters: {
						parameters: [{ name: 'taskId', value: '={{ $json.data.taskId }}' }],
					},
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [176, 2384],
				name: 'Check Video Status',
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
								outputKey: 'fail',
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
											id: 'fail-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'fail',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'success',
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
											id: 'success-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'success',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'generating',
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
											id: 'generating-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'generating',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'queuing',
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
											id: 'queuing-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'queuing',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'waiting',
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
											id: 'waiting-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'waiting',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [400, 2336],
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// n8n Function node\nconst items = $input.all();\nconst out = [];\n\nfor (const item of items) {\n  // Your HTTP node sometimes returns an array at top-level\n  const payload = item.json;\n  const first = Array.isArray(payload) ? payload[0] : payload;\n\n  // Get the stringified resultJson safely\n  const resultJsonStr = first?.data?.resultJson ?? '';\n\n  // Parse and extract\n  let resultUrls = [];\n  try {\n    const parsed = JSON.parse(resultJsonStr);\n    resultUrls = parsed?.resultUrls ?? [];\n  } catch (e) {\n    // leave resultUrls as []\n  }\n\n  out.push({ json: { resultUrls } });\n}\n\nreturn out;\n",
				},
				position: [640, 2352],
				name: 'Video URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: { url: '={{ $json.resultUrls[0] }}', options: {} },
				position: [800, 2352],
				name: 'Download Video1',
			},
		}),
	)
	.add(
		sticky(
			"## Muhammad Farooq Iqbal - Automation Expert & n8n Creator\n\nI am a passionate automation expert and recognized n8n Creator specializing in intelligent workflow automation. With extensive experience in n8n, AI automation, Zapier, and Make.com, I have created innovative workflow templates with 2500+ downloads across the global automation community\n\n### Expertise\n- **Workflow Automation**: n8n, Zapier, Make.com, AI automation\n- **AI Integration**: Gemini AI, API integration, data processing\n- **Platform Mastery**: Google Sheets, Google Drive, custom scripts\n\n## Need Help with This Workflow?\n\nIf you face any issues with this workflow or need customization support, feel free to reach out:\n\n**📧 Email**: mfarooqiqbal143@gmail.com  \n**📱 Phone**: +923036991118  \n**💼 LinkedIn**: [Connect with me](https://linkedin.com/in/muhammadfarooqiqbal)  \n**🌐 Portfolio**: [View my work](https://mfarooqone.github.io/n8n/)\n**UpWork**: [Upwork Profile](https://www.upwork.com/freelancers/~011aeba159896e2eba)\n\n*I'm always excited to help with automation challenges and workflow optimization!*\n",
			{ name: 'Sticky Note7', color: 5, position: [-1312, 2176], width: 528, height: 640 },
		),
	)
	.add(
		sticky(
			'**Text-to-Video Workflow**\n\nGenerates videos from text prompts using Kling 2.6. Set your parameters, submit the request, and the workflow polls for completion before downloading.',
			{ name: 'Text-to-Video Section', position: [-720, 1664], width: 1728, height: 512 },
		),
	)
	.add(
		sticky(
			'**Image-to-Video Workflow**\n\nAnimates existing images into videos using Kling 2.6. Provide an image URL and prompt, then the workflow handles generation and download.',
			{ name: 'Image-to-Video Section', position: [-720, 2224], width: 1728, height: 512 },
		),
	)
	.add(
		sticky(
			"## How it works\n\nThis workflow generates videos using Kling 2.6 AI through the KIE.AI API. You can create videos in two ways: text-to-video (describe a scene) or image-to-video (animate an existing image). The workflow submits your request, waits for processing (typically 1-5 minutes), checks status every 5 seconds, and downloads the completed video when ready.\n\n## Setup steps\n\n1. Get your KIE.AI API key from https://kie.ai/\n2. In n8n, create an HTTP Bearer Auth credential named \"KIE.AI\" and paste your API key\n3. Choose your workflow type and update the corresponding 'Set' node:\n   - Text-to-Video: Update 'Set Text to Video Parameters' (prompt, duration, sound, aspect_ratio)\n   - Image-to-Video: Update 'Set Prompt & Image Url' (prompt, image_urls, duration, sound)\n4. Click \"Execute Workflow\" to test. The workflow automatically polls for completion and downloads your video.\n",
			{ name: 'Sticky Note1', position: [-1424, 1664], width: 640, height: 480 },
		),
	);
