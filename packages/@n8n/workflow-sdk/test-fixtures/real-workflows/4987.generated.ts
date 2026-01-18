const wf = workflow('Njfc4Qsoi6p35Bfj', '3D Product Video', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'Shopify 3D Product Video',
					formFields: {
						values: [
							{
								fieldType: 'file',
								fieldLabel: 'Product Photo',
								multipleFiles: false,
								requiredField: true,
							},
							{
								fieldLabel: 'Product Title',
								placeholder: 'Product Title',
								requiredField: true,
							},
						],
					},
					formDescription:
						"Give us a product photo, title and we'll get back to you with professional marketing 3D video. ",
				},
				position: [-1080, 80],
				name: 'On Form Submission',
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
						'const title = $json["Product Title"] || "default";\nconst slug = title.toLowerCase().replace(/\\s+/g, \'-\') + \'-\' + Math.random().toString(36).substring(2, 8);\nreturn { slug };\n',
				},
				position: [-860, 80],
				name: 'Create Slug',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: '={{ $json.slug }}',
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: 'root',
						cachedResultUrl: 'https://drive.google.com/drive',
						cachedResultName: '/ (Root folder)',
					},
					resource: 'folder',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [-640, 80],
				name: 'Create Folder',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					fileId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Create Folder').item.json.id }}",
					},
					options: {},
					operation: 'share',
					permissionsUi: { permissionsValues: { role: 'reader', type: 'anyone' } },
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [-420, 80],
				name: 'Give Access to folder',
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
						'let results = [];\nconst items = $("On Form Submission").all()\n\nfor (item of items) {\n    for (key of Object.keys(item.binary)) {\n        results.push({\n            json: {\n                fileName: item.binary[key].fileName\n            },\n            binary: {\n                data: item.binary[key],\n            }\n        });\n    }\n}\n\nreturn results;',
				},
				position: [-200, 80],
				name: 'Get Image File',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $('Create Folder').item.json.name }}",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Create Folder').item.json.id }}",
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [20, -20],
				name: 'Upload Original Image',
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
							Slug: "={{ $('Create Slug').item.json.slug }}",
							'Product Title': "={{ $('On Form Submission').item.json['Product Title'] }}",
							'Original Image': '={{ $json.webViewLink }}',
						},
						schema: [
							{
								id: 'Original Image',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Original Image',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'BG Remove Image',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'BG Remove Image',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Product Title',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Product Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Video Link',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Video Link',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Slug',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Slug',
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
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw/edit?usp=drivesdk',
						cachedResultName: '3D Product Video',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [240, -20],
				name: 'Insert New Product',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.remove.bg/v1.0/removebg',
					method: 'POST',
					options: {
						response: {
							response: { responseFormat: 'file', outputPropertyName: 'no-bg.png' },
						},
					},
					sendBody: true,
					contentType: 'multipart-form-data',
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'size', value: 'auto' },
							{
								name: 'image_file',
								parameterType: 'formBinaryData',
								inputDataFieldName: '=data',
							},
						],
					},
					headerParameters: { parameters: [{ name: 'X-API-Key', value: 'api_key' }] },
				},
				position: [20, 180],
				name: 'Remove Image Background',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "=(no-bg){{ $('Create Folder').item.json.name }}",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Create Folder').item.json.id }}",
					},
					inputDataFieldName: '=no-bg.png',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [240, 180],
				name: 'Upload Remove BG image',
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
							Slug: "={{ $('Create Folder').item.json.name }}",
							'BG Remove Image': '={{ $json.webViewLink }}',
						},
						schema: [
							{
								id: 'Original Image',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Original Image',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'BG Remove Image',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'BG Remove Image',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Product Title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Product Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Video Link',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Video Link',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Slug',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Slug',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Slug'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw/edit?usp=drivesdk',
						cachedResultName: '3D Product Video',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [460, 180],
				name: 'Update Remove BG URL',
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
						"const url = $input.first().json['BG Remove Image']\n\n// Extract the ID using a regular expression\nconst match = url.match(/\\/d\\/([^/]+)/);\n\nreturn {\n  json: {\n    fileId: match ? match[1] : null,\n  },\n};",
				},
				position: [680, 180],
				name: 'Extract Image ID from URL',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{
								name: 'prompt',
								value:
									'A product placed on a reflective surface slowly rotates 360 degrees with dramatic studio lighting, soft shadows, and a smooth camera pan. The background is clean, minimal, and cinematic, highlighting the product’s details and elegance',
							},
							{
								name: 'image_url',
								value:
									'=https://drive.usercontent.google.com/download?id={{ $json.fileId }}&export=view&authuser=0',
							},
						],
					},
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Key api_key' }],
					},
				},
				position: [900, 180],
				name: 'Create Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 40 }, position: [1120, 180] },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.status_url }}',
					options: {},
					sendHeaders: true,
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Key api_key' }],
					},
				},
				position: [1340, 105],
				name: 'Check Video Status',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: { parameters: { amount: 40 }, position: [1120, 180] },
				}),
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: '={{ $json.response_url }}',
							options: {},
							sendHeaders: true,
							headerParameters: {
								parameters: [{ name: 'Authorization', value: 'Key api_key' }],
							},
						},
						position: [1780, 180],
						name: 'Get Video Link',
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
								id: '8ada0859-b74f-4d48-ae95-30c34340e39f',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.status }}',
								rightValue: 'IN_PROGRESS',
							},
						],
					},
				},
				name: 'Is In Progress',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.video.url }}',
					options: {
						response: {
							response: { responseFormat: 'file', outputPropertyName: 'Video-file' },
						},
					},
				},
				position: [2000, 180],
				name: 'Convert to Binary File',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: '=Video-file',
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Create Folder').item.json.id }}",
					},
					inputDataFieldName: 'Video-file',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2220, 180],
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
							Slug: "={{ $('Create Folder').item.json.name }}",
							'Video Link': "={{ $('Get Video Link').item.json.video.url }}",
						},
						schema: [
							{
								id: 'Original Image',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Original Image',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'BG Remove Image',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'BG Remove Image',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Product Title',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Product Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Video Link',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Video Link',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Slug',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Slug',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Slug'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw/edit?usp=drivesdk',
						cachedResultName: '3D Product Video',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2440, 180],
				name: 'Update Video Link',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message:
						"=<p>Hi there! 👋</p>\n\n<p><b>We’re excited to share our latest product video with you! 🎉<b></p>\n\n<p>Watch it here to see the product video you’ll love:<br>\n<a href=\"{{ $('Get Video Link').item.json.video.url }}\">{{ $('Get Video Link').item.json.video.url }}</a></p>\n\n<p>Don’t miss out—this could be just what you’ve been looking for! ✨</p>\n\n<p><b>Thanks for being part of our community! 🙌<b></p>\n",
					options: { appendAttribution: false },
					subject: 'Product Video',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [2660, 180],
				name: 'Send E-Mail Notification',
			},
		}),
	)
	.add(
		sticky(
			'## 3D Product Video\n\nSample Google Sheet\n- https://docs.google.com/spreadsheets/d/18k1Gq2X2J3_cbwJ9XyJoysVuhIpWhgc1cmlTKBnB3Yw/edit?gid=0#gid=0',
			{ position: [-1080, -160], width: 880, height: 140 },
		),
	);
