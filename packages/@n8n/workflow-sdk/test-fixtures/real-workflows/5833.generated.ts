const wf = workflow('C4GyUqmPvAFtDBbG', '[IG] Carousel on IG', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ field: 'minutes' }] } },
				position: [-1020, 360],
				name: 'Schedule Trigger',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					filtersUI: {
						values: [
							{ lookupValue: 'ToDo', lookupColumn: 'Status' },
							{ lookupValue: 'Carousel', lookupColumn: 'Type' },
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1315784118,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1WEUHeQXFMYsWVAW3DykWwpANxxD3DxH-S6c0i06dW1g/edit#gid=1315784118',
						cachedResultName: 'Execute ',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1WEUHeQXFMYsWVAW3DykWwpANxxD3DxH-S6c0i06dW1g',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1WEUHeQXFMYsWVAW3DykWwpANxxD3DxH-S6c0i06dW1g/edit?usp=drivesdk',
						cachedResultName: '0004_Master',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-760, 360],
				name: 'Get Execution for Carousel',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					filter: {
						folderId: {
							__rl: true,
							mode: 'url',
							value: "={{ $('Get Execution for Carousel').item.json.Folder }}",
						},
					},
					options: { fields: ['id', 'name', 'thumbnailLink', 'webViewLink'] },
					resource: 'fileFolder',
					returnAll: true,
					queryString: '=',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [-340, 360],
				name: 'Get image list from a Google Drive folder1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://drive.google.com/uc?export=download&id={{ $json.id }}',
					options: {
						response: { response: { fullResponse: true, responseFormat: 'file' } },
					},
				},
				position: [80, 360],
				name: 'Download Image from Google Drive (Carousel)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.cloudinary.com/v1_1/<your-cloud-name>/image/upload',
					method: 'POST',
					options: { response: { response: { responseFormat: 'json' } } },
					sendBody: true,
					contentType: 'multipart-form-data',
					bodyParameters: {
						parameters: [
							{
								name: 'file',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'data',
							},
							{ name: 'upload_preset', value: '<your_upload_preset>' },
						],
					},
				},
				position: [420, 360],
				name: 'Upload images to Cloudinary',
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
								id: '5b2dad43-2ec9-4bc0-8427-c9bab6a5fc2c',
								name: 'access_token',
								type: 'string',
								value: '<your-instagram-access-token>',
							},
							{
								id: '55b08009-fd62-44b8-b21e-6dde6aa9594f',
								name: 'ig_user_id',
								type: 'string',
								value: '<your-ig_user_id>',
							},
							{
								id: '53127a63-5583-4a5b-84bf-d2efd439af2b',
								name: 'image_url',
								type: 'string',
								value: '={{ $json.url }}',
							},
							{
								id: '90a680ca-49c2-4b83-bbf4-45614e882c01',
								name: 'caption',
								type: 'string',
								value: "={{ $('Get Execution for Carousel').item.json['Expected content'] }}",
							},
						],
					},
				},
				position: [780, 360],
				name: 'Setup for Instagram (access token, ig_business_id)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://graph.instagram.com/v23.0/{{ $json.ig_user_id }}/media',
					method: 'POST',
					options: { response: { response: { fullResponse: true } } },
					sendBody: true,
					contentType: 'form-urlencoded',
					bodyParameters: {
						parameters: [
							{ name: 'image_url', value: '={{ $json.image_url }}' },
							{ name: 'caption', value: '={{ $json.caption }}' },
							{ name: 'access_token', value: '={{ $json.access_token }}' },
						],
					},
				},
				position: [1100, 360],
				name: 'Create Media Container (Image)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					options: { mergeLists: true },
					fieldsToAggregate: { fieldToAggregate: [{ fieldToAggregate: 'body.id' }] },
				},
				position: [1380, 360],
				name: 'Combine Instagram media containers',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://graph.instagram.com/v23.0/{{ $('Setup for Instagram (access token, ig_business_id)').first().json.ig_user_id }}/media",
					method: 'POST',
					options: { response: { response: { fullResponse: true } } },
					sendBody: true,
					contentType: 'form-urlencoded',
					bodyParameters: {
						parameters: [
							{
								name: 'caption',
								value: "={{ $('Get Execution for Carousel').item.json['Expected content'] }}",
							},
							{ name: 'media_type', value: '=CAROUSEL' },
							{ name: 'children', value: '={{ $json.id }}' },
							{
								name: 'access_token',
								value:
									"={{ $('Setup for Instagram (access token, ig_business_id)').first().json.access_token }}",
							},
						],
					},
				},
				position: [1700, 360],
				name: 'Create Media Container (Carousel)',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://graph.instagram.com/v23.0/{{ $('Setup for Instagram (access token, ig_business_id)').first().json.ig_user_id }}/media_publish",
					method: 'POST',
					options: { response: { response: { responseFormat: 'json' } } },
					sendBody: true,
					bodyParameters: {
						parameters: [
							{ name: 'creation_id', value: '={{ $json.body.id }}' },
							{
								name: 'access_token',
								value:
									"={{ $('Setup for Instagram (access token, ig_business_id)').first().json.access_token }}",
							},
						],
					},
				},
				position: [2020, 360],
				name: 'Publish Instagram Carousel',
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
							Status: 'Processed',
							ExecuteId: "={{ $('Get Execution for Carousel').item.json.ExecuteId }}",
						},
						schema: [
							{
								id: 'ExecuteId',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'ExecuteId',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Folder',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Folder',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Expected content',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Expected content',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Language',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Language',
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
							{
								id: 'Type',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'Type',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Schedule_at',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'Schedule_at',
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
						matchingColumns: ['ExecuteId'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 1315784118,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1WEUHeQXFMYsWVAW3DykWwpANxxD3DxH-S6c0i06dW1g/edit#gid=1315784118',
						cachedResultName: 'Execute ',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1WEUHeQXFMYsWVAW3DykWwpANxxD3DxH-S6c0i06dW1g',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1WEUHeQXFMYsWVAW3DykWwpANxxD3DxH-S6c0i06dW1g/edit?usp=drivesdk',
						cachedResultName: '0004_Master',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2280, 360],
				name: 'Update Execute to "Processed"',
			},
		}),
	)
	.add(
		sticky(
			'## 📸 Instagram Carousel Automation Flow (Simplified)\n\n### 🧩 Overview\n\n#### This n8n workflow automatically creates and publishes **Instagram Carousel posts** using data from a Google Sheet. It checks for content scheduled to be posted (marked by user as "ToDo"). The flow is scheduled to check the Google Sheet every 5 minutes.\n#### Once eligible content is found, the flow uploads images from the Google Drive folder to Cloudinary, prepares media containers via the Instagram Graph API, and publishes the carousel post.\n---\n## Preparation\n- Google Sheet file - [Sample](https://docs.google.com/spreadsheets/d/1WEUHeQXFMYsWVAW3DykWwpANxxD3DxH-S6c0i06dW1g/edit?usp=sharing)\n- Cloudinary account: How to set up Cloudinary - [Link](https://docs.google.com/document/d/1_KUPrmX0Df_WhsRvGvauWDkn5c__OLib/edit)\n- Instagram: access_token and ig_business_id\n\n\n## 🔁 Flow Steps\n#### 0. Preparation \n- Upload images to a Google Drive folder ([Sample](https://drive.google.com/drive/u/1/folders/1QYYlHaSXNj7pTV0gNhKVKPPhImrZAy84))\n- On the Google Sheet - Master file ([Sample](https://docs.google.com/spreadsheets/d/1WEUHeQXFMYsWVAW3DykWwpANxxD3DxH-S6c0i06dW1g/edit?usp=sharing)): Add a new record - input the folder link and IG contents \n- Change the status to "ToDo" for the Trigger\n\n#### 1. 🕒 Trigger (Scheduled)\n- **Node**: Schedule Trigger\n- **Runs**: Every 5 minutes (or any chosen interval)\n\n---\n\n#### 2. 📄 Read Google Sheet\n- **Node**: Google Sheets ([Sample](https://docs.google.com/spreadsheets/d/1WEUHeQXFMYsWVAW3DykWwpANxxD3DxH-S6c0i06dW1g/edit?usp=sharing))\n- **Operation**: Read all rows\n- **Columns Used**:\n  - `ExecuteId`\n  - `Folder` ([Google Drive folder URL](https://drive.google.com/drive/u/1/folders/1ZdlOczJHCTGcvWuzJ4CvzAa_9r0cXf5n))\n  - `Expected content` (used as caption)\n  - `Status` (must be `"ToDo"`)\n  - `Type` (should be `"Carousel"`)\n\n---\n\n### 3. ⏰ Filter Rows by Schedule\n- **Node**: Function\n- **Goal**: Keep only rows where:\n  - `Status` is `"ToDo"`',
			{ name: 'Sticky Note8', position: [-2020, 40], width: 904, height: 1074 },
		),
	)
	.add(
		sticky(
			'After creating account and folder on Cloudinary, make sure to update the following:\n<your-cloud-name>\n<your_upload_preset>\nto match your settings\n',
			{ position: [300, 200], width: 304, height: 354 },
		),
	)
	.add(
		sticky('The Google Drive folder needs to be shared publicly (Anyone with the link can view)', {
			name: 'Sticky Note1',
			position: [-420, 220],
			width: 284,
			height: 354,
		}),
	)
	.add(
		sticky(
			'Update your instagram information below\n<your-instagram-access-token>\n<your-ig_user_id>',
			{ name: 'Sticky Note2', position: [680, 200], width: 304, height: 354 },
		),
	);
