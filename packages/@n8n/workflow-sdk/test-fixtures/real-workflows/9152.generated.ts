const wf = workflow('O7BiL9gvzMRGnzco', 'Development Done - Product Ads via Veo3', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'Upload Your File',
					formFields: {
						values: [{ fieldLabel: 'Idea Prompt', requiredField: true }],
					},
					formDescription: 'Please give the prompt !',
				},
				position: [-272, -64],
				name: 'Prompt your Idea',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2.1,
			config: {
				parameters: {
					base: {
						__rl: true,
						mode: 'list',
						value: 'Your_Airtable_Base_ID',
						cachedResultUrl: 'https://airtable.com/Your_Airtable_Base_ID',
						cachedResultName: 'Dynamic Video Content',
					},
					table: {
						__rl: true,
						mode: 'list',
						value: 'Your_Airtable_Table_ID',
						cachedResultUrl: 'https://airtable.com/Your_Airtable_Base_ID/Your_Airtable_Table_ID',
						cachedResultName: 'Product Ads',
					},
					columns: {
						value: {
							Status: 'Pending',
							'Image Prompt': '={{ $json["Idea Prompt"] }}',
						},
						schema: [
							{
								id: 'Id',
								type: 'string',
								display: true,
								removed: true,
								readOnly: true,
								required: false,
								displayName: 'Id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Image Prompt',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Image Prompt',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Image',
								type: 'array',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Image',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Video',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Video',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'options',
								display: true,
								options: [
									{ name: 'Pending', value: 'Pending' },
									{ name: 'Done', value: 'Done' },
								],
								removed: false,
								readOnly: false,
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
					operation: 'create',
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [-48, -64],
				name: 'Create a record',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.form',
			version: 1,
			config: {
				parameters: {
					options: {},
					formFields: { values: [{ fieldType: 'file', fieldLabel: 'Image' }] },
				},
				position: [176, -64],
				name: 'Upload Image',
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
						'// Get the first binary key dynamically\nconst binaryKey = Object.keys($input.item.binary || {})[0];\nif (!binaryKey) {\n  throw new Error("No binary data found on input item.");\n}\n\nconst binary = $input.item.binary[binaryKey];\n\n// Convert binary to base64\nconst base64File = binary.data.toString(\'base64\');\n\n// Build JSON payload for Airtable\nreturn [\n  {\n    json: {\n      contentType: binary.mimeType || "image/jpeg",\n      file: base64File,\n      filename: binary.fileName || "upload.jpg"\n    },\n    pairedItem: { item: 0 }   // 🔑 keeps mapping to original input\n  }\n];\n',
				},
				position: [400, -64],
				name: 'Converting Image file for Storing',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://content.airtable.com/v0/Your_Airtable_Base_ID/{{ $('Create a record').item.json.id }}/[Your_Column_Name]/uploadAttachment",
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{ name: 'contentType', value: '={{$json["contentType"]}}' },
							{ name: 'file', value: '={{$json["file"]}}' },
							{ name: 'filename', value: '={{$json["filename"]}}' },
						],
					},
					headerParameters: {
						parameters: [
							{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' },
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
				},
				position: [624, -64],
				name: 'Uploading Image in Airtable',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2.1,
			config: {
				parameters: {
					id: '={{ $json.id }}',
					base: {
						__rl: true,
						mode: 'list',
						value: 'Your_Airtable_Base_ID',
						cachedResultUrl: 'https://airtable.com/Your_Airtable_Base_ID',
						cachedResultName: 'Dynamic Video Content',
					},
					table: {
						__rl: true,
						mode: 'list',
						value: 'Your_Airtable_Table_ID',
						cachedResultUrl: 'https://airtable.com/Your_Airtable_Base_ID/Your_Airtable_Table_ID',
						cachedResultName: 'Product Ads',
					},
					options: {},
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [848, -64],
				name: 'Get a record',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: {
				parameters: {
					text: '=You are an expert AI creative analyst. Your purpose is to analyze an input image together with the user’s creative request and produce a structured creative brief. Always treat the user’s request as the guiding vision, and reinterpret the image so that the final video concept fulfills that request. Your output must be only the plain text report as described below. Do not include any conversational filler or explanatory text.\n\nUSER REQUEST\n{{ $json["Image Prompt"] }}\n\nIMAGE ANALYSIS\n\nDescription\nWrite a comprehensive, single-paragraph description of the image as it visually appears. Then explicitly describe how this image can be creatively reimagined or transformed to align with the user’s request.\n\nStyle Analysis\n\nCore Subject: Identify the main focus of the image and explain how it connects to the user’s request.\n\nSetting: Describe the environment/background and how it could be reinterpreted in the requested concept.\n\nMedium: Specify the artistic medium (e.g., product photography, 3D render) and suggest how the medium might shift in the video.\n\nLighting: Describe the current light and suggest adjustments to match the requested mood.\n\nMood: Define both the existing atmosphere of the image and the intended emotional tone per the user’s request.\n\nComposition: Describe the current framing/camera angle and how it might evolve in the video.\n\nColor Palette: List the dominant colors, then suggest enhancements or transformations to match the user’s request.\n\nText Overlay\nList and describe each distinct piece of text found in the image. If there is no text, simply write "None."\n\nFor each text element, provide:\n- Text\n- Font\n- Effect\n- Color\n- Placement\n\nCREATIVE VIDEO BRIEF\n\nTranslate the user request and image analysis into a structured video brief suitable for Veo 3 generation:\n\nVideo Style: Describe the final style/genre of the requested video.\n\nTarget Emotion: Define the main emotional impact the video should deliver.\n\nMotion Guidance: Suggest dynamic camera motions, transitions, or visual effects that bring the user’s request to life.\n\nAudio/Music Direction: Suggest music/sound design that fits both the brand identity in the image and the requested theme.\n\nSuggested Script Elements: Provide a draft outline of possible voiceover or on-screen text. Ensure this ties the image (e.g., Pepsi product) with the user’s creative request (e.g., exploding into a disco party).\n',
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'models/gemini-2.5-flash',
						cachedResultName: 'models/gemini-2.5-flash',
					},
					options: {},
					resource: 'image',
					imageUrls: '={{ $json.Image[0].url }}',
					operation: 'analyze',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1056, -64],
				name: 'Analyze image',
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
						'// Get the generated prompt text from the previous node\nconst promptText = $json.content.parts[0].text;\n\n// Build the complete JSON body for the VEO API\nconst requestBody = {\n  "endpoint": "projects/personalised-mail/locations/us-central1/publishers/google/models/veo-3.0-generate-001",\n  "instances": [\n    {\n      "prompt": promptText\n    }\n  ],\n  "parameters": {\n    "aspectRatio": "16:9",\n    "sampleCount": 1,\n    "durationSeconds": "8",\n    "personGeneration": "allow_all",\n    "addWatermark": true,\n    "includeRaiReason": true,\n    "generateAudio": true,\n    "resolution": "720p"\n  }\n};\n\n// Return the final object inside a wrapper\nreturn [\n  {\n    json: {\n      "veoRequestBody": requestBody // <-- Wrapped here\n    }\n  }\n];',
				},
				position: [1296, -64],
				name: 'Parse Request',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://us-central1-aiplatform.googleapis.com/v1/projects/[Project ID]/locations/[Location]/publishers/google/models/veo-3.0-fast-generate-001:predictLongRunning',
					method: 'POST',
					options: {},
					jsonBody: '={{ $json.veoRequestBody }}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'predefinedCredentialType',
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [1520, -64],
				name: 'Generate Video Veo 3',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 1 }, position: [1744, -64], name: 'Wait' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 2.1,
			config: {
				parameters: {
					base: {
						__rl: true,
						mode: 'list',
						value: 'Your_Airtable_Base_ID',
						cachedResultUrl: 'https://airtable.com/Your_Airtable_Base_ID',
						cachedResultName: 'Dynamic Video Content',
					},
					table: {
						__rl: true,
						mode: 'list',
						value: 'Your_Airtable_Table_ID',
						cachedResultUrl: 'https://airtable.com/Your_Airtable_Base_ID/Your_Airtable_Table_ID',
						cachedResultName: 'Product Ads',
					},
					columns: {
						value: {
							Id: "={{ $('Get a record').item.json.Id }}",
							Status: 'Done',
						},
						schema: [
							{
								id: 'id',
								type: 'string',
								display: true,
								removed: true,
								readOnly: true,
								required: false,
								displayName: 'id',
								defaultMatch: true,
							},
							{
								id: 'Id',
								type: 'string',
								display: true,
								removed: false,
								readOnly: true,
								required: false,
								displayName: 'Id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Image Prompt',
								type: 'string',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Image Prompt',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Image',
								type: 'array',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Image',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'options',
								display: true,
								options: [
									{ name: 'Pending', value: 'Pending' },
									{ name: 'Done', value: 'Done' },
								],
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Video',
								type: 'array',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Video',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['Id'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [1968, -64],
				name: 'Update record',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://us-central1-aiplatform.googleapis.com/v1/projects/[Project ID]/locations/[Location]/publishers/google/models/veo-3.0-generate-001:fetchPredictOperation',
					method: 'POST',
					options: { response: { response: {} } },
					sendBody: true,
					sendHeaders: true,
					authentication: 'predefinedCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'operationName',
								value: "={{ $('Generate Video Veo 3').item.json.name }}",
							},
						],
					},
					headerParameters: {
						parameters: [{ name: 'Authorization', value: 'Bearer YOUR_TOKEN_HERE' }],
					},
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [2192, -64],
				name: 'Get the Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.convertToFile',
			version: 1.1,
			config: {
				parameters: {
					options: {},
					operation: 'toBinary',
					sourceProperty: 'response.videos[0].bytesBase64Encoded',
				},
				position: [2416, -64],
				name: 'Downloadable Video',
			},
		}),
	)
	.add(
		sticky(
			'## Airtable Configuration\n* **Airtable Credentials**: In the "Create a record", "Get a record", and "Update record" nodes, you must select your own Airtable credentials.\n* **Base and Table IDs**: Update the Base ID and Table ID in all four Airtable-related nodes to match your own setup: "Create a record", "Uploading Image in Airtable" (in the URL), "Get a record", and "Update record".',
			{ color: 5, position: [128, -336], width: 528, height: 192 },
		),
	)
	.add(
		sticky(
			'## Google AI Configuration\n* **Gemini Node** ("Analyze image"): Select your Google AI (Gemini) API credentials.\n**Veo Nodes ("Parse Request" & HTTP Requests):** \n* **Project ID**: In the URLs, replace with your Google Cloud Project ID.\n* **Credentials**: In both HTTP request nodes ("Generate Video Veo 3" & "Get the Video"), select your Google OAuth2 credentials.\n* **API Info**: For help with endpoints, see the [Google Cloud Vertex AI Studio](https://www.google.com/search?q=https://console.cloud.google.com/vertex-ai/studio/media/generate)',
			{ name: 'Sticky Note1', color: 4, position: [1728, -368], width: 544, height: 240 },
		),
	)
	.add(
		sticky(
			'## Customization\n**Video Generation Parameters**: In the "Parse Request" node, you can modify the JavaScript code to change video settings like *aspectRatio*, *durationSeconds*, and *resolution*.',
			{ name: 'Sticky Note2', color: 6, position: [1216, -352], width: 304, height: 192 },
		),
	);
