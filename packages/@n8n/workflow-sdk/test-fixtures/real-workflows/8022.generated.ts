const wf = workflow('HQcHQhEaig6JXOH4', 'AI Virtual TryOn for WooCommerce Nano Banana', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-480, 1600], name: 'When clicking ‘Test workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: { returnFirstMatch: false },
					filtersUI: {
						values: [{ lookupValue: '=', lookupColumn: 'IMAGE RESULT' }],
					},
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
						value: '11ebWJvwwXHgvQld9kxywKQUvIoBw6xMa0g0BuIqHDxE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/11ebWJvwwXHgvQld9kxywKQUvIoBw6xMa0g0BuIqHDxE/edit?usp=drivesdk',
						cachedResultName: 'AI Virtual TryOn for WooCommerce',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-256, 1600],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-48, 1600], name: 'Loop Over Items' },
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
								name: 'model',
								type: 'string',
								value: "={{ $json['IMAGE MODEL'] }}",
							},
							{
								id: '58fb5e76-6576-4d16-8b25-b931c7935c01',
								name: 'shirt',
								type: 'string',
								value: "={{ $json['IMAGE PRODUCT'] }}",
							},
						],
					},
				},
				position: [224, 1616],
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
					url: 'https://queue.fal.run/fal-ai/nano-banana/edit',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n     "prompt": "make a photo of the model wearing the submitted clothing item and creating the themed background",\n     "image_urls": [\n       "{{ $json.model }}",\n       "{{ $json.shirt }}"\n     ]\n   }',
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
				position: [464, 1616],
				name: 'Create Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { amount: 10 }, position: [672, 1616], name: 'Wait 60 sec.' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://queue.fal.run/fal-ai/nano-banana/requests/{{ $('Create Image').item.json.request_id }}/status ",
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [864, 1616],
				name: 'Get status',
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
				position: [1040, 1616],
				name: 'Completed?',
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
					url: '=https://queue.fal.run/fal-ai/nano-banana/requests/{{ $json.request_id }}',
					options: {},
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [224, 1872],
				name: 'Get Url image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.images[0].url }}', options: {} },
				position: [448, 1872],
				name: 'Get File image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $now.format('yyyyLLddHHmmss') }}-{{ $json.images[0].file_name }}",
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
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [656, 1872],
				name: 'Upload Image',
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
							row_number: "={{ $('Loop Over Items').item.json.row_number }}",
							'IMAGE RESULT': "={{ $('Get File image').item.json.images[0].url }}",
						},
						schema: [
							{
								id: 'IMAGE MODEL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'IMAGE MODEL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE PRODUCT',
								type: 'string',
								display: true,
								required: false,
								displayName: 'IMAGE PRODUCT',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'PRODUCT ID',
								type: 'string',
								display: true,
								required: false,
								displayName: 'PRODUCT ID',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'IMAGE RESULT',
								type: 'string',
								display: true,
								required: false,
								displayName: 'IMAGE RESULT',
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
						value: '11ebWJvwwXHgvQld9kxywKQUvIoBw6xMa0g0BuIqHDxE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/11ebWJvwwXHgvQld9kxywKQUvIoBw6xMa0g0BuIqHDxE/edit?usp=drivesdk',
						cachedResultName: 'AI Virtual TryOn for WooCommerce',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [896, 1872],
				name: 'Update result',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wooCommerce',
			version: 1,
			config: {
				parameters: {
					imagesUi: {
						imagesValues: [
							{
								alt: '',
								src: "={{ $('Get File image').item.json.images[0].url }}",
								name: '',
							},
						],
					},
					resource: 'product',
					operation: 'update',
					productId: "={{ $('Loop Over Items').item.json['PRODUCT ID'] }}",
					metadataUi: {},
					dimensionsUi: {},
					updateFields: {},
				},
				credentials: {
					wooCommerceApi: { id: 'credential-id', name: 'wooCommerceApi Credential' },
				},
				position: [1104, 1872],
				name: 'WooCommerce',
			},
		}),
	)
	.add(
		sticky('## Model\n![image](https://n3wstorage.b-cdn.net/n3witalia/model.jpg)', {
			color: 6,
			position: [-464, 320],
			width: 340,
			height: 540,
		}),
	)
	.add(
		sticky('## Product\n![image](https://n3wstorage.b-cdn.net/n3witalia/tshirt.jpg)', {
			name: 'Sticky Note1',
			color: 6,
			position: [-80, 320],
			width: 360,
			height: 540,
		}),
	)
	.add(
		sticky('## Result\n![image](https://n3wstorage.b-cdn.net/n3witalia/result_sport.jpeg)', {
			name: 'Sticky Note2',
			color: 4,
			position: [576, 320],
			width: 340,
			height: 540,
		}),
	)
	.add(
		sticky(
			'# AI Virtual TryOn for WooCommerce\nThis Workflow is designed to streamline the process of creating realistic images of clothing products worn by models, eliminating the need for expensive photoshoots. The primary goal is to automate the generation of virtual try-on images for an eCommerce store selling clothing, using advanced image processing technologies.\n\nStarting from a Google Sheets document or a database containing the URLs of a model image and a clothing product, the AI Agent generates an image of the model wearing the selected clothing item (Virtual TryOn).\n\nOnce the URL of the resulting image is obtained, the system downloads the final image file. This image is then uploaded to Google Drive, archived via FTP in a dedicated folder, or directly added to the WooCommerce product page.\n\nBy offering realistic images of clothing items worn by models, this automation process saves time and resources, making product catalog management more efficient. This approach not only enhances the competitiveness of the eCommerce store but also provides greater flexibility in creating high-quality visual content adaptable to various digital marketing campaigns.\n\n',
			{ name: 'Sticky Note3', color: 3, position: [-464, -176], width: 740, height: 424 },
		),
	)
	.add(
		sticky(
			'## STEP 1 - GOOGLE SHEET\nCreate a [Google Sheet like this](https://docs.google.com/spreadsheets/d/11ebWJvwwXHgvQld9kxywKQUvIoBw6xMa0g0BuIqHDxE/edit?usp=sharing).\n\nPlease insert:\n- in the "IMAGE MODEL" column the basic image of the model to dress\n- in the "IMAGE PRODUCT" column the image of the item of clothing to wear\n- in the "PRODUCT ID" column the ID of the product on your WooCommerce\n\nLeave the "IMAGE RESULT" column unfilled. It will be inserted by the system once the image has been created',
			{ name: 'Sticky Note4', position: [-464, 944], width: 740, height: 260 },
		),
	)
	.add(
		sticky(
			'## STEP 2 - GET API KEY (YOURAPIKEY)\nCreate an account [here](https://fal.ai/) and obtain API KEY.\nIn the node "Create Image" set "Header Auth" and set:\n- Name: "Authorization"\n- Value: "Key YOURAPIKEY"',
			{ name: 'Sticky Note6', position: [-464, 1248], width: 740, height: 156 },
		),
	)
	.add(
		sticky('## STEP 3 - WOOCOMMERCE\n- Set WooCommerce API', {
			name: 'Sticky Note7',
			position: [-464, 1440],
			width: 740,
			height: 92,
		}),
	);
