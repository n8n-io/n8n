const wf = workflow(
	'NkkWMHiRAY5uPHmf',
	'Convert Old Photos to AI Videos And Auto-Publish in FB, IG, YT & X',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.1,
			config: {
				parameters: {
					path: 'animate-photo-form',
					options: {},
					formTitle: 'Colorize and Animate Old Photos',
					formFields: {
						values: [
							{
								fieldType: 'file',
								fieldLabel: 'Upload Old Photo',
								requiredField: true,
							},
							{
								fieldType: 'textarea',
								fieldLabel: 'Custom Animation Description (Optional)',
								placeholder:
									"Describe how you'd like the photo to be animated (e.g., 'make the person smile and blink')",
							},
						],
					},
					formDescription: 'Upload an old photo to colorize and animate it with AI',
				},
				position: [-60, 120],
				name: 'Photo Upload Form',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.imgbb.com/1/upload',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					bodyParameters: {
						parameters: [
							{
								name: 'image',
								parameterType: 'formBinaryData',
								inputDataFieldName: '=Upload_Old_Photo',
							},
							{ name: 'key', value: 'generate_token_and_add' },
						],
					},
				},
				position: [240, 120],
				name: 'Upload Image to imgbb',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/flux-pro/kontext',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "prompt": "Colorize this old black and white or sepia photograph. Make it look natural and vibrant with realistic colors. Remove any noise, scratches, or artifacts. Enhance the image quality and make it crystal clear. Keep all the original details and people exactly as they are, just add beautiful, realistic colors and improve the overall quality",\n  "image_url": "{{ $json.data.url }}",\n  "num_images": 1\n}',
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
				position: [480, 120],
				name: 'Colorize Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { position: [700, 120], name: 'Wait for Colorization' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://queue.fal.run/fal-ai/flux-pro/requests/{{ $('Colorize Image').item.json.request_id }}/status",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [920, 120],
				name: 'Check Colorization Status',
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
								id: 'colorize-completed',
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
				position: [1140, 120],
				name: 'Colorization Completed?',
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
					url: "=https://queue.fal.run/fal-ai/flux-pro/requests/{{ $('Colorize Image').item.json.request_id }}",
					options: {},
					sendHeaders: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					headerParameters: { parameters: [{ name: 'Accept', value: 'application/json' }] },
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [1360, 120],
				name: 'Get Colorized Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/kling-video/v2.1/standard/image-to-video',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "prompt": "{{ $(\'Photo Upload Form\').item.json[\'Custom Animation Description (Optional)\'] ? $(\'Photo Upload Form\').item.json[\'Custom Animation Description (Optional)\'] : \'Animate this colorized vintage photograph. If there are multiple people, make them interact naturally - perhaps talking, smiling, or making subtle gestures. If there\\\'s only one person, animate them with natural movements like breathing, blinking, slight head movements, or gentle smiling. Keep the animation subtle and realistic, maintaining the vintage charm. The movement should feel natural and bring the photo to life. Do not move the camera\' }}",\n  "image_url": "{{ $(\'Get Colorized Image\').item.json.images[0].url }}",\n  "duration": 5,\n  "quality": "standard"\n}',
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
				position: [1580, 120],
				name: 'Animate Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 60 }, position: [1800, 120], name: 'Wait for Animation' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://queue.fal.run/fal-ai/kling-video/requests/{{ $('Animate Image').item.json.request_id }}/status",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2020, 120],
				name: 'Check Animation Status',
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
								id: 'animation-completed',
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
				position: [2240, 120],
				name: 'Animation Completed?',
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
					url: "=https://queue.fal.run/fal-ai/kling-video/requests/{{ $('Animate Image').item.json.request_id }}",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [2460, 120],
				name: 'Get Animated Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $('Get Animated Video').item.json.video.url }}",
					options: {},
				},
				position: [2680, 120],
				name: 'Download Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "=animated-photo-{{ $now.format('yyyyMMdd-HHmmss') }}.mp4",
					driveId: {
						__rl: true,
						mode: 'list',
						value: 'My Drive',
						cachedResultUrl: 'https://drive.google.com/drive/my-drive',
						cachedResultName: 'My Drive',
					},
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: 'root',
						cachedResultUrl: 'https://drive.google.com/drive',
						cachedResultName: '/ (Root folder)',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2900, 120],
				name: 'Upload to Google Drive',
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
								id: 'success-flag',
								name: 'success',
								type: 'boolean',
								value: true,
							},
							{
								id: 'message',
								name: 'message',
								type: 'string',
								value: 'Your old photo has been successfully colorized and animated!',
							},
							{
								id: 'colorized-image',
								name: 'colorized_image_url',
								type: 'string',
								value: "={{ $('Get Colorized Image').item.json.images[0].url }}",
							},
							{
								id: 'animated-video',
								name: 'animated_video_url',
								type: 'string',
								value: "={{ $('Get Animated Video').item.json.video.url }}",
							},
							{
								id: 'google-drive',
								name: 'google_drive_url',
								type: 'string',
								value: "={{ $('Upload to Google Drive').item.json.webViewLink }}",
							},
							{
								id: 'processing-time',
								name: 'processing_time',
								type: 'string',
								value: "={{ $now.format('yyyy-MM-dd HH:mm:ss') }}",
							},
						],
					},
				},
				position: [3140, 120],
				name: 'Final Results',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-upload-post.uploadPost',
			version: 1,
			config: {
				parameters: {
					user: 'ADD_UPLOAD_POST_USER',
					title: 'This video was uploaded with the upload-post api',
					video: "={{ $('Get Animated Video').item.json.video.url }}",
					platform: ['instagram', 'x', 'youtube', 'facebook'],
					operation: 'uploadVideo',
					instagramMediaType: 'REELS',
				},
				credentials: {
					uploadPostApi: { id: 'credential-id', name: 'uploadPostApi Credential' },
				},
				position: [3340, 120],
			},
		}),
	)
	.add(
		sticky(
			'# Colorize and Animate Old Photos with AI\n\nThis workflow allows users to **upload old photos** and automatically:\n1. **Colorize and enhance** them using FLUX Kontext\n2. **Animate** them using Kling Video AI\n3. **Save** the final video to Google Drive\n\nSimply upload your old photo through the form and get back a colorized, animated video!',
			{ name: 'Workflow Description', color: 3, position: [-40, -740], width: 740, height: 280 },
		),
	)
	.add(
		sticky(
			"## How to Use:\n\n1. **Click 'Execute workflow'** to start the process\n2. **Upload your old photo** in the form that appears\n3. The photo will be **colorized and enhanced** using FLUX Kontext\n4. Then **animated** using Kling Video AI\n5. Finally **saved to Google Drive**\n\n**Required:** Image file (JPG, PNG)\n**Optional:** Custom animation description",
			{ name: 'Usage Instructions', position: [-40, -420], width: 740, height: 200 },
		),
	)
	.add(
		sticky(
			"## Setup Required:\n1. **api.imgbb.com**: Get api token (it's free)\n2. **FAL.AI API Key**: Get from fal.ai and set in HTTP Request credentials\n3. **Google Drive**: Connect your Google Drive account\n4. **Test the workflow**: Click 'Test workflow' to start\n\n**API Endpoints Used:**\n- Upload image: api.imgbb.com\n- FLUX Kontext: Image enhancement and colorization\n- Kling Video: Image to video animation",
			{ name: 'Setup Instructions', position: [-40, -180], width: 740, height: 260 },
		),
	);
