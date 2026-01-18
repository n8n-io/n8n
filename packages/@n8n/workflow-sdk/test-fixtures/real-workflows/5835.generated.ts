const wf = workflow(
	'823lWldG0eG7Wp63',
	'Create Cheaper Video with Google Veo3 Fast and Upload to Social',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-224, 848], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: {},
					filtersUI: { values: [{ lookupColumn: 'VIDEO' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pcoY9N_vQp44NtSRR5eskkL5Qd0N0BGq7Jh_4m-7VEQ/edit#gid=0',
						cachedResultName: 'Foglio1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1pcoY9N_vQp44NtSRR5eskkL5Qd0N0BGq7Jh_4m-7VEQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pcoY9N_vQp44NtSRR5eskkL5Qd0N0BGq7Jh_4m-7VEQ/edit?usp=drivesdk',
						cachedResultName: 'Video Google Veo3',
					},
				},
				position: [0, 848],
				name: 'Get new video',
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
								id: 'c713d31f-9abd-496a-ac79-e8e2efe60aa0',
								name: 'prompt',
								type: 'string',
								value: '={{ $json.PROMPT }}\n\nDuration of the video: {{ $json.DURATION }}',
							},
						],
					},
				},
				position: [224, 848],
				name: 'Set data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/veo3/fast',
					method: 'POST',
					options: {},
					jsonBody: '={\n     "prompt": "{{$json.prompt}}"\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					headerParameters: {
						parameters: [{ name: 'Content-Type', value: 'application/json' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [448, 848],
				name: 'Create Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 60 }, position: [672, 848], name: 'Wait 60 sec.' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://queue.fal.run/fal-ai/veo3/requests/{{ $('Create Video').item.json.request_id }}/status ",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [848, 848],
				name: 'Get status',
			},
		}),
	)
	.then(
		ifBranch(
			[
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
						position: [-224, 1232],
						name: 'Get Url Video',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: { parameters: { amount: 60 }, position: [672, 848], name: 'Wait 60 sec.' },
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
								id: '383d112e-2cc6-4dd4-8985-f09ce0bd1781',
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
				name: 'Completed?',
			},
		),
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
								content: "=Input: {{ $('Get new video').item.json.PROMPT }}",
							},
							{
								role: 'system',
								content:
									'You are a YouTube SEO expert specialized in creating engaging and optimized titles.\n\nYour task is to generate an effective title for a YouTube video based on the user\'s video description.\n\nGUIDELINES:\n- Maximum 60 characters to avoid truncation\n- Use relevant keywords for SEO\n- Make the title catchy and clickable\n- Avoid excessive or misleading clickbait\n- Consider the target audience of the content\n- Use numbers, questions, or power words when appropriate\n- IMPORTANT: Generate the title in the same language as the input description\n\nOUTPUT FORMAT:\nProvide only the title, without additional explanations.\n\nEXAMPLE:\nInput: "Tutorial video on how to cook perfect pasta carbonara"\nOutput: "PERFECT Carbonara in 10 Minutes - Chef\'s Secrets"',
							},
						],
					},
				},
				position: [32, 1232],
				name: 'Generate title',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $('Get Url Video').item.json.video.url }}",
					options: {},
				},
				position: [400, 1232],
				name: 'Get File Video',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $now.format('yyyyLLddHHmmss') }}-{{ $('Get Url Video').item.json.video.file_name }}",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: '1aHRwLWyrqfzoVC8HoB-YMrBvQ4tLC-NZ',
						cachedResultUrl:
							'https://drive.google.com/drive/folders/1aHRwLWyrqfzoVC8HoB-YMrBvQ4tLC-NZ',
						cachedResultName: 'Fal.run',
					},
				},
				position: [688, 1104],
				name: 'Upload Video',
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
							VIDEO: "={{ $('Get Url Video').item.json.video.url }}",
							row_number: "={{ $('Get new video').item.json.row_number }}",
						},
						schema: [
							{
								id: 'PROMPT',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'PROMPT',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'DURATION',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'DURATION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'VIDEO',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'VIDEO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'YOUTUBE_URL',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'YOUTUBE_URL',
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
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/11ebWJvwwXHgvQld9kxywKQUvIoBw6xMa0g0BuIqHDxE/edit#gid=0',
						cachedResultName: 'Foglio1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1pcoY9N_vQp44NtSRR5eskkL5Qd0N0BGq7Jh_4m-7VEQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pcoY9N_vQp44NtSRR5eskkL5Qd0N0BGq7Jh_4m-7VEQ/edit?usp=drivesdk',
						cachedResultName: 'Video Google Veo3',
					},
				},
				position: [864, 1104],
				name: 'Update result',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.upload-post.com/api/upload',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'title',
								value: "={{ $('Generate title').item.json.message.content }}",
							},
							{ name: 'user', value: 'YOUR_USERNAME' },
							{ name: 'platform[]', value: 'youtube' },
							{
								name: 'video',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'data',
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [688, 1328],
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
							row_number: "={{ $('Get new video').item.json.row_number }}",
							YOUTUBE_URL: '=https://youtu.be/{{ $json.results.youtube.video_id }}',
						},
						schema: [
							{
								id: 'PROMPT',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'PROMPT',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'DURATION',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'DURATION',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'VIDEO',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'VIDEO',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'YOUTUBE_URL',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'YOUTUBE_URL',
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
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/11ebWJvwwXHgvQld9kxywKQUvIoBw6xMa0g0BuIqHDxE/edit#gid=0',
						cachedResultName: 'Foglio1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1pcoY9N_vQp44NtSRR5eskkL5Qd0N0BGq7Jh_4m-7VEQ',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1pcoY9N_vQp44NtSRR5eskkL5Qd0N0BGq7Jh_4m-7VEQ/edit?usp=drivesdk',
						cachedResultName: 'Video Google Veo3',
					},
				},
				position: [864, 1328],
				name: 'Update Youtube URL',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.upload-post.com/api/upload',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'title',
								value: "={{ $('Generate title').item.json.message.content }}",
							},
							{ name: 'user', value: 'YOUR_USERNAME' },
							{ name: 'platform[]', value: 'tiktok' },
							{
								name: 'video',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'data',
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [688, 1520],
				name: 'Upload on TikTok',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: { parameters: { rule: { interval: [{ field: 'minutes' }] } }, position: [-224, 704] },
		}),
	)
	.add(
		sticky(
			'# Generate Cheaper AI Videos (with audio), using Veo3 Fast and Upload to YouTube/TikTok\n\nThis workflow allows users to **generate AI videos** using cheaper model **Google Veo3 Fast**, save them to **Google Drive**, generate optimized YouTube titles with GPT-4o, and **automatically upload them to YouTube** . The entire process is triggered from a Google Sheet that acts as the central interface for input and output.\n\nIT automates video creation, uploading, and tracking, ensuring seamless integration between Google Sheets, Google Drive, Google Veo3, and YouTube.\n\n\n\n\n',
			{ name: 'Sticky Note3', color: 3, position: [-224, -480], width: 740, height: 312 },
		),
	)
	.add(
		sticky(
			'## STEP 1 - GOOGLE SHEET\nCreate a [Google Sheet like this](https://docs.google.com/spreadsheets/d/1pcoY9N_vQp44NtSRR5eskkL5Qd0N0BGq7Jh_4m-7VEQ/edit?usp=sharing).\n\nPlease insert:\n- in the "PROMPT" column the accurate description of the video you want to create\n- in the "DURATION" column the lenght of the video you want to create\n\nLeave the "VIDEO" column unfilled. It will be inserted by the system once the video has been created',
			{ name: 'Sticky Note4', position: [-224, -144], width: 740, height: 200 },
		),
	)
	.add(
		sticky(
			'## STEP 4 - MAIN FLOW\nStart the workflow manually or periodically by hooking the "Schedule Trigger" node. It is recommended to set it at 5 minute intervals.',
			{ name: 'Sticky Note5', position: [-224, 560], width: 740, height: 100 },
		),
	)
	.add(
		sticky(
			'## STEP 2 - GET API KEY (YOURAPIKEY)\nCreate an account [here](https://fal.ai/) and obtain API KEY.\nIn the node "Create Image" set "Header Auth" and set:\n- Name: "Authorization"\n- Value: "Key YOURAPIKEY"',
			{ name: 'Sticky Note6', position: [-224, 112], width: 740, height: 140 },
		),
	)
	.add(
		sticky('Set API Key created in Step 2', {
			name: 'Sticky Note7',
			position: [400, 784],
			width: 180,
			height: 200,
		}),
	)
	.add(sticky('Set YOUR_USERNAME in Step 3', { position: [672, 1264], width: 180, height: 408 }))
	.add(
		sticky(
			'## STEP 3 - Upload video on Youtube\n- Find your API key in your [Upload-Post Manage Api Keys](https://www.upload-post.com/?linkId=lp_144414&sourceId=n3witalia&tenantId=upload-post-app) 10 FREE uploads per month\n- Set the the "Auth Header":\n-- Name: Authorization\n-- Value: Apikey YOUR_API_KEY_HERE\n- Create profiles to manage your social media accounts. The "Profile" you choose will be used in the field YOUR_USRNAME (eg. test1 or test2).  \n\n\nThe free plan allows uploads to all platforms except TikTok. To enable, please upgrade to a paid plan.',
			{ name: 'Sticky Note8', position: [-224, 288], width: 740, height: 232 },
		),
	);
