const wf = workflow('', 'UGC Nano Banana', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.googleDriveTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'fileCreated',
					options: {},
					pollTimes: { item: [{ mode: 'everyMinute' }] },
					triggerOn: 'specificFolder',
					folderToWatch: {
						__rl: true,
						mode: 'list',
						value: '',
						cachedResultUrl: 'https://drive.google.com/drive/folders/',
						cachedResultName: 'UGC',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [-592, -16],
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
								id: '',
								name: 'FalAPIKey',
								type: 'string',
								value: '[YOUR_API_KEY]',
							},
						],
					},
				},
				position: [-384, -16],
				name: 'Setup',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: 'You are an expert content creator specializing in UGC (User-Generated Content) style marketing images. ',
					batching: {},
					messages: {
						messageValues: [
							{
								type: 'HumanMessagePromptTemplate',
								message:
									'=The product the Promote is a {{ $(\'Google Drive Trigger\').item.json.name.match(/^[^.]+/)[0] }}\n\nYour task is to generate 50 creative, diverse, and realistic situations prompts for an image-to-image generation model. Each prompt should describe a different situation or scenario where the product is being used. \n\nRequirements for each prompt:\n1. Specify the environment or setting (e.g., home, office, kitchen).  \n2. Include a human or realistic context interacting with the product (e.g., holding it, using it, displaying it).  \n3. Highlight at least one functionality or feature of the product in the scene.  \n4. Keep the prompts concise (1–2 sentences), vivid, and visually descriptive.  \n5. Maintain diversity: do not repeat the same type of scene. Include different times of day, moods, activities, or locations.\n\nOutput format (JSON array):\n{\n      "ugc_prompts": [\n              {"prompt": "First prompt here..."},\n              {"prompt": "Second prompt here..."},\n              ...\n              {"prompt": "Fiftieth prompt here..."}\n                      ]\n}\n\nExample input:  \nProduct: "Smart Water Bottle"  \n\nExample output:\n{\n      "ugc_prompts": [\n                {"prompt": "A young woman jogging in a park, drinking from the Smart Water Bottle, enjoying cold water on a sunny morning."},\n                {"prompt": "A man sitting at his office desk, checking water intake on his Smart Water Bottle synced with his phone."},\n                {"prompt": "A family hiking on a trail, each carrying a Smart Water Bottle to stay hydrated."},...\n                     ]\n}\n\nDON\'T RETURN ANYTHING ELSE THAN THE JSON!',
							},
						],
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
						version: 1,
						config: {
							parameters: { model: 'mistral-large-latest', options: {} },
							credentials: {
								mistralCloudApi: { id: 'credential-id', name: 'mistralCloudApi Credential' },
							},
							name: 'Mistral Cloud Chat Model',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n      "ugc_prompts": [\n        {\n          "prompt_number": "integer",\n          "prompt": "string"\n        }\n      ]\n}\n',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [-176, -16],
				name: 'Generate Prompts',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'output.ugc_prompts' },
				position: [144, -16],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [352, -16], name: 'Loop Over Items' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [560, -32], name: 'No Operation, do nothing' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://fal.run/fal-ai/gemini-25-flash-image/edit',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "prompt": "{{ $json.prompt }}",\n  "image_urls": [\n"https://drive.google.com/uc?export=view&id={{ $(\'Google Drive Trigger\').first().json.id }}"\n  ],\n  "num_images": 1,\n  "output_format": "jpeg",\n  "sync_mode": false\n} ',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: "=Key {{ $('Setup').first().json.FalAPIKey }}",
							},
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
				},
				position: [496, 128],
				name: 'Generate Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.images[0].url }}', options: {} },
				position: [672, 128],
				name: 'Retrieve Image',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $('Google Drive Trigger').first().json.name.match(/^[^.]+/)[0].concat($('Loop Over Items').item.json.prompt_number) }}",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: '',
						cachedResultUrl: 'https://drive.google.com/drive/folders/',
						cachedResultName: 'UGC',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [864, 128],
				name: 'Upload file',
			},
		}),
	)
	.add(
		sticky(
			'## How to set up?\n### 1. Accounts & APIs\nIn the **Edit Field "Setup" Node** replace all **[YOUR_API_TOKEN]** with your API Token :\n- Fal.ai (gemini-25-flash-image/edit): https://fal.ai/models/fal-ai/gemini-25-flash-image/edit/api\n\nIn **Credentials** on your n8n Dashboard, connect the following accounts using **Client ID / Secret**: \n- Google Drive: https://docs.n8n.io/integrations/builtin/credentials/google/\n\n### 2. Requirements\n- Base Image of your Product preferably have a **White Background**\n- Your Google Drive Folder and every Files it contains should be **publicly available**\n\n### 3. Customizations\n- Change the amount of total UGC Generated: In Generate Prompts → Message → "Your task is to generate 50"\n- Modify the instructions to generate the UGC Prompts: In Generate Prompts → Message\n- Change the amount of Base Image: In Generate Image → Body Parameters → JSON → image_urls\n- Change the amount of UGC Generated per prompt: In Generate Image → Body Parameters → JSON → num_images\n- Modify the Folder where UGC Generated are stored: In Upload File → Parent Folder',
			{ name: 'Sticky Note6', position: [128, -608], width: 700, height: 512 },
		),
	)
	.add(
		sticky(
			'## How it works?\n**1 -** Trigger: Upload a new Product Image (with white background) to a Folder in your Google Drive\n**2 -** Generate 50 different Image Prompts  for your Product\n**3 -** Loop over each Prompt Generated\n**4 -** Generate UGC Content thanks to Fal.ai (Nano Banana)\n**5 -** Upload UGC Content on the initial Google Drive Folder\n\n**📺 Youtube Video Tutorial :**\n[![Watch on YouTube](https://img.youtube.com/vi/b6tb5mnYU48/maxresdefault.jpg)](https://www.youtube.com/watch?v=b6tb5mnYU48)',
			{ name: 'Sticky Note5', position: [-400, -608], width: 516, height: 512 },
		),
	)
	.add(
		sticky('## **Prompts Generation**', {
			color: 7,
			position: [-656, -80],
			width: 908,
			height: 432,
		}),
	)
	.add(
		sticky('## **UGC Production**\n', {
			name: 'Sticky Note1',
			color: 7,
			position: [272, -80],
			width: 780,
			height: 432,
		}),
	)
	.add(
		sticky(
			'## BASE IMAGE\n![Base Image](https://res.cloudinary.com/dhvhddcz5/image/upload/c_fill/AirPurifier_aphbou.jpg)\n## OUTPUT \n![Base Image](https://res.cloudinary.com/dhvhddcz5/image/upload/c_fill/AirPurifier4_vd6hrn.jpg)',
			{ name: 'Sticky Note7', position: [848, -608], width: 204, height: 512 },
		),
	)
	.add(
		sticky(
			'## Who’s it for?\n- Content Creators\n- E-commerce Stores\n- Marketing Team\n\n**Description**: Generate unique UGC images for your products. Simply upload a product image into a Google Drive folder, and the workflow will instantly generate 50 unique, high-quality AI UGC images using **Nano Banana** via Fal.ai. \nAll results are automatically saved back into the same folder, **ready to use** across social media, e-commerce stores, and marketing campaigns.\n\n**Cost: 0.039$ / image**',
			{ name: 'Sticky Note9', position: [-656, -608], width: 244, height: 512 },
		),
	);
