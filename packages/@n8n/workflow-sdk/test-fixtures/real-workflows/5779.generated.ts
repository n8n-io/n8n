const wf = workflow('yNlNZi8P0wL4Tj5u', 'Google Text-to-Speech Generator', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: 'Generate Text-to-Speech',
					formFields: {
						values: [
							{
								fieldLabel: 'Script',
								placeholder:
									"The mystery of life isn't a problem to solve, but a reality to experience.",
								requiredField: true,
							},
							{
								fieldType: 'dropdown',
								fieldLabel: 'Voice',
								fieldOptions: {
									values: [
										{ option: 'Aoede' },
										{ option: 'Puck' },
										{ option: 'Charon' },
										{ option: 'Kore' },
										{ option: 'Fenrir' },
										{ option: 'Leda' },
										{ option: 'Orus' },
										{ option: 'Zephyr' },
										{ option: 'Achird' },
										{ option: 'Algenib' },
										{ option: 'Algieba' },
										{ option: 'Alnilam' },
										{ option: 'Autonoe' },
										{ option: 'Callirrhoe' },
										{ option: 'Despina' },
										{ option: 'Enceladus' },
										{ option: 'Erinome' },
										{ option: 'Gacrux' },
										{ option: 'Iapetus' },
										{ option: 'Laomedeia' },
										{ option: 'Pulcherrima' },
										{ option: 'Rasalgethi' },
										{ option: 'Sadachbia' },
										{ option: 'Sadaltager' },
										{ option: 'Schedar' },
										{ option: 'Sulafat' },
										{ option: 'Umbriel' },
										{ option: 'Vindemiatrix' },
										{ option: 'Zubenelgenubi' },
										{ option: 'Achernar' },
									],
								},
								requiredField: true,
							},
							{
								fieldType: 'dropdown',
								fieldLabel: 'Langauge',
								fieldOptions: {
									values: [
										{ option: 'en-US' },
										{ option: 'en-AU' },
										{ option: 'en-GB' },
										{ option: 'en-IN' },
										{ option: 'es-US' },
										{ option: 'de-DE' },
										{ option: 'fr-FR' },
										{ option: 'hi-IN' },
										{ option: 'pt-BR' },
										{ option: 'ar-XA' },
										{ option: 'es-ES' },
										{ option: 'fr-CA' },
										{ option: 'id-ID' },
										{ option: 'it-IT' },
										{ option: 'ja-JP' },
										{ option: 'tr-TR' },
										{ option: 'vi-VN' },
										{ option: 'bn-IN' },
										{ option: 'gu-IN' },
										{ option: 'kn-IN' },
										{ option: 'ml-IN' },
										{ option: 'mr-IN' },
										{ option: 'ta-IN' },
										{ option: 'te-IN' },
										{ option: 'nl-BE' },
										{ option: 'nl-NL' },
										{ option: 'ko-KR' },
										{ option: 'cmn-CN' },
										{ option: 'pl-PL' },
										{ option: 'ru-RU' },
										{ option: 'sw-KE' },
										{ option: 'th-TH' },
										{ option: 'ur-IN' },
										{ option: 'uk-UA' },
									],
								},
								requiredField: true,
							},
						],
					},
					formDescription: 'Add your text you want generated and select a voice.',
				},
				position: [-340, 40],
				name: 'On form submission2',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					mode: 'raw',
					options: {},
					jsonOutput:
						'={\n  "script": "{{ $json.Script }}",\n  "voice": "{{ $json.Langauge }}-Chirp3-HD-{{ $json.Voice }}"\n}',
				},
				position: [-160, 40],
				name: 'Edit Fields',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://texttospeech.googleapis.com/v1/text:synthesize',
					method: 'POST',
					options: { response: { response: {} } },
					jsonBody:
						'={\n  "input": {\n    "markup": "{{ $json.script }}"\n  },\n  "voice": {\n    "languageCode": "{{ $(\'On form submission2\').item.json.Langauge }}",\n    "name": "{{ $json.voice }}"\n  },\n  "audio_config": {\n    "audio_encoding": "LINEAR16",\n    "speaking_rate": 1.0\n  }\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					authentication: 'predefinedCredentialType',
					headerParameters: { parameters: [{}] },
					nodeCredentialType: 'googleOAuth2Api',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
					googleOAuth2Api: { id: 'credential-id', name: 'googleOAuth2Api Credential' },
				},
				position: [20, 40],
				name: 'Request TTS ',
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
					sourceProperty: 'audioContent',
				},
				position: [220, 40],
				name: 'Convert to File',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: '={{ $binary.data.fileName }}',
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: '1Kmvt_nPFDbAO7y6zu95c5_snNC9A1P1n',
						cachedResultUrl:
							'https://drive.google.com/drive/folders/1Kmvt_nPFDbAO7y6zu95c5_snNC9A1P1n',
						cachedResultName: 'Content Engine Storage',
					},
					inputDataFieldName: '=data',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [420, 40],
				name: 'Upload file',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://queue.fal.run/fal-ai/ffmpeg-api/metadata',
					method: 'POST',
					options: {},
					jsonBody: '={\n  "media_url": "{{ $json.webContentLink }}"\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [600, 40],
				name: 'Request Duration',
			},
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
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [820, 40],
				name: 'Get Status',
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
							url: '={{ $json.response_url }}',
							options: {},
							authentication: 'genericCredentialType',
							genericAuthType: 'httpHeaderAuth',
						},
						credentials: {
							httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
						},
						position: [1180, 20],
						name: 'Get Duration',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: { parameters: { amount: 1 }, position: [1180, 180] },
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
								id: '35b5c3da-9b1e-47ac-9f8e-cae257b54db4',
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
				name: 'If',
			},
		),
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
						value: 'appMBgjXji9DQtbY2',
						cachedResultUrl: 'https://airtable.com/appMBgjXji9DQtbY2',
						cachedResultName: 'Content Engine',
					},
					table: {
						__rl: true,
						mode: 'list',
						value: 'tblj8qQXJKjjRqaTq',
						cachedResultUrl: 'https://airtable.com/appMBgjXji9DQtbY2/tblj8qQXJKjjRqaTq',
						cachedResultName: 'Assets',
					},
					columns: {
						value: {
							URL: "={{ $('Upload file').item.json.webContentLink }}",
							Duration: '={{ $json.media.duration }}',
							'Asset Name': '=Voiceover Audio File',
							Description: "=Script: {{ $('On form submission2').item.json.Script }}",
							'WebView URL': "={{ $('Upload file').item.json.webViewLink }}",
							'Content Type': 'Audio',
						},
						schema: [
							{
								id: 'Asset Name',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Asset Name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Description',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Description',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Status',
								type: 'options',
								display: true,
								options: [
									{ name: 'Active', value: 'Active' },
									{ name: 'Inactive', value: 'Inactive' },
									{ name: 'Under Maintenance', value: 'Under Maintenance' },
								],
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Linked Content',
								type: 'string',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Linked Content',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Content Type',
								type: 'options',
								display: true,
								options: [
									{ name: 'Video', value: 'Video' },
									{ name: 'Audio', value: 'Audio' },
									{ name: 'Image', value: 'Image' },
								],
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Content Type',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Width (px)',
								type: 'number',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Width (px)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Height (px)',
								type: 'number',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Height (px)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Aspect Ratio',
								type: 'string',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Aspect Ratio',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Duration',
								type: 'number',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'Duration',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Content',
								type: 'array',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Content',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'WebView URL',
								type: 'string',
								display: true,
								removed: false,
								readOnly: false,
								required: false,
								displayName: 'WebView URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Content 2',
								type: 'array',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Content 2',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Content 3',
								type: 'array',
								display: true,
								removed: true,
								readOnly: false,
								required: false,
								displayName: 'Content 3',
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
				position: [1360, 20],
				name: 'Create a record',
			},
		}),
	)
	.add(
		sticky(
			"## Try It Out! 🗣️\n### This n8n template shows you how to use Google's AI to turn text into natural-sounding speech. Experiment with all of the Chirp 3 HD voices.\n\n## The uses are endless! Try creating voiceovers for your videos, generating audio versions of your articles, or building interactive voice responses for your applications.\n\n\n### How it works ⚙️\n* The workflow is kicked off by a **Form Trigger** where you input your script, and choose a voice and language.\n* We then use the **HTTP Request** node to send your text to Google's Text-to-Speech API.\n* Google's AI processes the text and sends back the audio data in base64 format.\n* A **Convert to File** node transforms this base64 data into a binary audio file.\n* This audio file is then uploaded to **Google Drive**.\n* We then use another **HTTP Request** to a `fal.ai` endpoint to get the duration of the audio file.\n* An **If** node checks to see if the duration was successfully retrieved.\n* Finally, a **Airtable** node creates a new record with the audio file's details, including the script, Google Drive link, and duration.\n\n\n### How to use it 🚀\n* The **Form Trigger** node is a great way to start, but you can swap it out for a Webhook, a new row in a spreadsheet, or any other trigger that suits your needs.\n* You can easily customize the available voices and languages in the **Form Trigger** node.\n\n---\n\n### Requirements 📋\n* A **Google Cloud oAuth2 Client** with the Text-to-Speech API enabled.\n* A **Google Drive** account for storing the generated audio files.\n* A `fal.ai` account for the ffmpeg API to get the audio duration.\n* An **Airtable** account to log the generated audio files. You must create a new table with same fields as the Airtable node.\n\n---\n\n### Need Help? 🙋\nAsk in the [Forum](https://community.n8n.io/)!\n\n",
			{ name: 'Sticky Note7', position: [-880, -460], width: 460, height: 1160 },
		),
	)
	.add(
		sticky(
			'### Geo Restrictions!\nPlease note at time of writing, Google TTS is restricted to certain countries and regions.',
			{ name: 'Sticky Note8', color: 5, position: [-360, 280], width: 460, height: 140 },
		),
	)
	.add(
		sticky(
			'## 1. Input Your Script, Select the Language and Voice\n[Scripting and Prompting Tips](https://cloud.google.com/text-to-speech/docs/chirp3-hd#scripting-and-prompting-tips)\n\nThe Chirp 3 HD voices observe punctuation and can use Pause Control with these tags: [pause short], [pause long], and [pause].',
			{ name: 'Sticky Note6', color: 7, position: [-360, -320], width: 320, height: 320 },
		),
	)
	.add(
		sticky(
			'## 2. Request and Return the TTS Audio. Convert the Base64 String into an Audio File.\n[Read more about the Convert to File node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.converttofile/)\n\nThe Google TTS API returns a base64 string. It must be converted to a file before it can be used. For example, the Google Drive node needs the base64 string converted to a file for the upload to work correctly.',
			{ color: 7, position: [20, -320], width: 500, height: 320 },
		),
	)
	.add(
		sticky(
			'## 3. Find the Duration of the Audio File\n[Read more about Looping in n8n](https://docs.n8n.io/flow-logic/looping/)\n\nWe can use the fal.ai API to get metadata about our media files. This API uses a queue system so we must request the status of the job till it completes then make a final request to retrieve the metadata. Here we use a simple If node to monitor the job status.',
			{ name: 'Sticky Note1', color: 7, position: [600, -320], width: 680, height: 320 },
		),
	)
	.add(
		sticky(
			'## 4. Update our Database with Our New Audio File\n[Airtable](https://www.airtable.com)\n\nWe can keep track of our media assets in a database to make it easier to use those assets to create content.',
			{ name: 'Sticky Note2', color: 7, position: [1360, -320], width: 320, height: 320 },
		),
	);
