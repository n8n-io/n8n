const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-4752, 3136], name: 'When clicking ‘Execute workflow’' },
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
								id: '8b6339f9-f5a5-4f77-ba88-9c5e7a0e9421',
								name: 'instagram_content',
								type: 'string',
								value: '=',
							},
							{
								id: 'd811f293-3ec5-494f-97c4-c76b457029e1',
								name: 'node (Instagram Account ID)',
								type: 'string',
								value: '=',
							},
							{
								id: 'daca9119-e5a8-454c-9180-65558a7a32c7',
								name: 'pose_1_drive_fotolink',
								type: 'string',
								value: '=',
							},
							{
								id: '616f8862-92fd-4aa1-98e0-a38981fa83d8',
								name: 'pose_2_drive_fotolink',
								type: 'string',
								value: '=',
							},
							{
								id: 'f9c57f27-3f6b-4f4d-91fc-9c331b04c29f',
								name: 'pose_3_drive_fotolink',
								type: 'string',
								value: '=',
							},
							{
								id: 'f8ce5994-d0c5-4546-b51c-21c06c72ec07',
								name: 'Facebook Graph',
								type: 'string',
								value: '=',
							},
						],
					},
				},
				position: [-4528, 3136],
				name: 'Prepare Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-4304, 3136], name: 'Loop Over Items1' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'// Collect all media IDs from the loop\nconst items = $input.all();\n\n// Extract media IDs and other data\nconst mediaIds = [];\nlet commonData = {};\n\nfor (const item of items) {\n if (item.json.media_id) {\n   mediaIds.push(item.json.media_id);\n }\n \n // Store common data from first item\n if (Object.keys(commonData).length === 0) {\n   commonData = {\n     model: item.json.model,\n     instagram_content: item.json.instagram_content,\n     "Instagram Account ID": item.json["Instagram Account ID"],\n     "Facebook Graph": item.json["Facebook Graph"],\n     "airtable id": item.json["airtable id"]\n   };\n }\n}\n\n// Return collected data\nreturn [{\n json: {\n   ...commonData,\n   media_ids: mediaIds,\n   total_media_count: mediaIds.length\n }\n}];',
				},
				position: [-4080, 2816],
				name: 'Collect Media IDs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 20 }, position: [-3856, 2816], name: 'Wait before Carousel' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.facebookGraphApi',
			version: 1,
			config: {
				parameters: {
					edge: '=media',
					node: "={{ $json['Instagram Account ID'] }}",
					options: {
						queryParameters: {
							parameter: [
								{ name: 'media_type', value: 'CAROUSEL' },
								{ name: 'children', value: '={{ $json.media_ids }}' },
								{ name: 'caption', value: '={{ $json.instagram_content }}' },
							],
						},
					},
					graphApiVersion: 'v22.0',
					httpRequestMethod: 'POST',
				},
				credentials: {
					facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' },
				},
				position: [-3632, 2816],
				name: 'Edit Carousel',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { amount: 15 },
				position: [-3408, 2816],
				name: 'Wait before Upload to Instagram',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.facebookGraphApi',
			version: 1,
			config: {
				parameters: {
					edge: 'media_publish',
					node: "={{ $('Collect Media IDs').item.json['Instagram Account ID'] }}",
					options: {
						queryParameters: {
							parameter: [{ name: 'creation_id', value: '={{ $json.id }}' }],
						},
					},
					graphApiVersion: 'v22.0',
					httpRequestMethod: 'POST',
				},
				credentials: {
					facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' },
				},
				position: [-3184, 2816],
				name: 'Publish Carousel to Instagram',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: '=The Carousel post {{ $json.instagram_content }} has been successfully uploaded to Instagram.',
					chatId: '123456789',
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [-2960, 2816],
				name: 'Send Update Message',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					fileId: { __rl: true, mode: 'url', value: '={{ $json.item_url }}' },
					options: {},
					operation: 'download',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [-4016, 3136],
				name: 'Download file1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.cloudinary.com/v1_1/dd4rbdyco/image/upload',
					method: 'POST',
					options: { response: { response: { responseFormat: 'json' } } },
					sendBody: true,
					contentType: 'multipart-form-data',
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'file',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'data',
							},
							{ name: 'upload_preset', value: 'N8N Upload' },
						],
					},
					genericAuthType: 'httpBasicAuth',
				},
				credentials: {
					httpBasicAuth: { id: 'credential-id', name: 'httpBasicAuth Credential' },
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
				},
				position: [-3680, 3136],
				name: 'Upload images to Cloudinary',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.facebookGraphApi',
			version: 1,
			config: {
				parameters: {
					edge: 'media',
					node: "={{ $('Download file1').item.json['node (Instagram Account ID)'] }}",
					options: {
						queryParameters: {
							parameter: [
								{ name: '=image_url', value: '={{ $json.url }}' },
								{ name: 'is_carousel_item', value: 'true' },
							],
						},
					},
					graphApiVersion: 'v22.0',
					httpRequestMethod: 'POST',
				},
				credentials: {
					facebookGraphApi: { id: 'credential-id', name: 'facebookGraphApi Credential' },
				},
				position: [-3488, 3168],
				name: 'Create each Carousel Picture',
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
								id: 'a699442d-a08f-48e3-8125-ff9550cef688',
								name: 'media_id',
								type: 'string',
								value: '={{ $json.id }}',
							},
							{
								id: 'b7aa553e-b09f-49f4-9236-006661def799',
								name: 'pose_number',
								type: 'number',
								value: "={{ $('Download file1').item.json.pose_number }}",
							},
							{
								id: 'd9cc775g-d2b1-6bg6-b458-228883fgg9bb',
								name: 'instagram_content',
								type: 'string',
								value: "={{ $('Download file1').item.json.instagram_content }}",
							},
							{
								id: 'eadd886h-e3c2-7ch7-c569-339994ghhacc',
								name: 'Instagram Account ID',
								type: 'string',
								value: "={{ $('Download file1').item.json['node (Instagram Account ID)'] }}",
							},
							{
								id: 'd3e0804b-fe7a-4e1b-a7b0-4127a59e81db',
								name: 'airtable id',
								type: 'string',
								value: "={{ $('Download file1').item.json['airtable id'] }}",
							},
						],
					},
				},
				position: [-3248, 3216],
				name: 'Edit Fields1',
			},
		}),
	)
	.add(
		sticky(
			'##  Prepare Data\nPlease insert:\n1. Instagram Account ID\n2. Google drive Links from the Posts zu upload\n3. Add Instagram Content (The Text to Post)',
			{ position: [-4592, 2928], height: 496 },
		),
	)
	.add(
		sticky('## Add Cloudinary Account\n', {
			name: 'Sticky Note1',
			position: [-3760, 3056],
			height: 256,
		}),
	)
	.add(
		sticky('## Add Gdrive Account', { name: 'Sticky Note2', position: [-4096, 3056], height: 256 }),
	)
	.add(
		sticky('## Add Telegram Bot ID\n', {
			name: 'Sticky Note3',
			position: [-3024, 2736],
			height: 256,
		}),
	);
