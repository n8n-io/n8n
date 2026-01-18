const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'Submit a food item',
					formFields: {
						values: [
							{
								fieldLabel: 'What food emoji would you like to generate?',
								placeholder: 'a green apple',
								requiredField: true,
							},
						],
					},
					formDescription:
						'Enter a food name (e.g. avocado, donut) to generate a 400×400-pixel 3D emoji 🥑',
				},
				position: [-180, -400],
				name: 'Trigger: Food Emoji Form Submission',
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
								id: 'b6d8f708-9e12-4002-8800-0c32b7fe27ee',
								name: '=json_generator',
								type: 'string',
								value:
									'=Given the food item: "{{ $json[\'What food emoji would you like to generate?\'] }}", generate a JSON object describing how it should be styled as a 3D-rendered emoji-style icon suitable for use in a digital food icon set. The style should be modern, playful, and semi-realistic, with a transparent background and a 400x400 pixel size.\n\nThe JSON should include these sections:\n\n- form (shape, outline, detail)\n\n- lighting (gloss, shadow, detail)\n\n- texture (surface, detail)\n\n- background (type, detail)\n\n- color_handling (strategy, look, detail)\n\n- color_palette (detail)\n\nAdapt each parameter thoughtfully based on the physical properties and personality of the given food item.',
							},
						],
					},
				},
				position: [60, -400],
				name: 'Prepare Style‑JSON Prompt',
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
						value: 'gpt-4.1-mini',
						cachedResultName: 'GPT-4.1-MINI',
					},
					options: {},
					messages: { values: [{ content: '={{ $json.json_generator }}' }] },
					jsonOutput: true,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [260, -400],
				name: 'LLM: Generate Style‑JSON',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					model: 'gpt-image-1',
					prompt:
						"=Generate a 3D-rendered emoji-style digital icon of a {{ $('Trigger: Food Emoji Form Submission').item.json['What food emoji would you like to generate?'] }}, designed with the following visual specifications:\n{{ $json.message.content.toJsonString() }}\n\nRender the icon centered in a 400x400 pixel square, isolated on a transparent background, with no props or text. The result should look like a high-quality digital food emoji: slightly exaggerated, clean, friendly, and polished — consistent with a modern mobile icon set.\n",
					options: {},
					resource: 'image',
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [600, -400],
				name: 'Image‑Gen: Render Food Emoji Icon',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ $('Trigger: Food Emoji Form Submission').item.json['What food emoji would you like to generate?'] }}",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: 'root',
						cachedResultName: '/ (Root folder)',
					},
					inputDataFieldName: '=data',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [820, -400],
				name: 'Save to Google Drive',
			},
		}),
	)
	.add(sticky('## | INPUT: Intake Form', { position: [-260, -520], height: 340 }))
	.add(
		sticky('## | Step 1: Generate Image', {
			name: 'Sticky Note1',
			color: 4,
			position: [20, -520],
			width: 720,
			height: 340,
		}),
	)
	.add(
		sticky('## | Step 2: Upload to Google Drive', {
			name: 'Sticky Note2',
			color: 5,
			position: [780, -520],
			height: 340,
		}),
	)
	.add(
		sticky(
			'## 🚀 Setup Requirements\n\nTo get started with this workflow, follow these steps:\n\n1. **🔑 Configure Credentials**: Set up your API credentials for OpenAI and Google Drive\n2. **💳 Add OpoenAI Credit**: Make sure to add credit to your OpenAI account, verify your organization (required for generating images)\n3. **📊 Connect Google Drive**: Authenticate your Google Drive account\n4. **⚙️ (Optional) Customize Prompts**: Adjust the prompts within the workflow to better suit your specific needs\n\n**Note: Each image generation will cost you about $0.17**',
			{ name: 'Sticky Note3', color: 7, position: [-260, -140], width: 1280, height: 380 },
		),
	);
