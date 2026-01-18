const wf = workflow('P2I09TDwHXkMSQ7Q', 'Automated AI Music Generation with ElevenLabs', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-720, 192], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					options: {},
					filtersUI: { values: [{ lookupColumn: 'URL' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/10yDGf9Xyx2l-zdd5S1orxZaKbW3_vnONVgRBk_CLrpg/edit#gid=0',
						cachedResultName: 'Foglio1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '10yDGf9Xyx2l-zdd5S1orxZaKbW3_vnONVgRBk_CLrpg',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/10yDGf9Xyx2l-zdd5S1orxZaKbW3_vnONVgRBk_CLrpg/edit?usp=drivesdk',
						cachedResultName: 'My Music Tracks',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-448, 192],
				name: 'Get tracks',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-192, 192], name: 'Loop Over Items' },
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.elevenlabs.io/v1/music',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "respect_sections_durations": true,\n  "prompt": "{{ $json.PROMPT }}",\n  "music_length_ms": {{ $json[\'DURATION (ms)\'] }},\n  "model_id": "music_v1"\n} ',
					sendBody: true,
					sendQuery: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [{ name: 'output_format', value: 'mp3_44100_128' }],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [128, 208],
				name: 'Compose music',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "=song_{{$now.format('yyyyLLdd')}}.{{ $binary.data.fileExtension }}",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: '1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
						cachedResultUrl:
							'https://drive.google.com/drive/folders/1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
						cachedResultName: 'n8n',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [368, 208],
				name: 'Upload music',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.7,
			config: {
				parameters: {
					columns: {
						value: {
							URL: '={{ $json.webViewLink }}',
							row_number: "={{ $('Loop Over Items').item.json.row_number }}",
						},
						schema: [
							{
								id: 'N.',
								type: 'string',
								display: true,
								required: false,
								displayName: 'N.',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'TITLE',
								type: 'string',
								display: true,
								required: false,
								displayName: 'TITLE',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'PROMPT',
								type: 'string',
								display: true,
								required: false,
								displayName: 'PROMPT',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'DURATION (ms)',
								type: 'string',
								display: true,
								required: false,
								displayName: 'DURATION (ms)',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'URL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'number',
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
							'https://docs.google.com/spreadsheets/d/10yDGf9Xyx2l-zdd5S1orxZaKbW3_vnONVgRBk_CLrpg/edit#gid=0',
						cachedResultName: 'Foglio1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '10yDGf9Xyx2l-zdd5S1orxZaKbW3_vnONVgRBk_CLrpg',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/10yDGf9Xyx2l-zdd5S1orxZaKbW3_vnONVgRBk_CLrpg/edit?usp=drivesdk',
						cachedResultName: 'My Music Tracks',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [592, 208],
				name: 'Update Link tracks',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 1 }, position: [800, 208], name: 'Wait' },
		}),
	)
	.add(
		sticky(
			'## Automated AI Music Generation with ElevenLabs & Google Drive\n\nThis workflow automates the creation, storage, and cataloging of AI-generated music using the ElevenLabs Music API, Google Sheets, and Google Drive.\n\nWith Eleven Music*, businesses, creators, artists, and every single one of our users can generate studio-grade music from natural language prompts. Please fill this form to register your interest in the [Eleven Music API](https://try.elevenlabs.io/ahkbf00hocnu). \n\nGenerated music has a minimum duration of 10 seconds and a maximum duration of 5 minutes.\n\n*Only paid plan\n\n## **How it works:**\nThe workflow reads music requests from Google Sheets, sends prompts to ElevenLabs Music API, uploads generated MP3s to Google Drive, and updates sheet URLs. It loops through each request with a 1-minute delay to avoid rate limits.\n\n## **Setup steps:**\nConnect ElevenLabs API, Google Sheets, and Google Drive in n8n. Add required columns and IDs, authenticate each service, then test and run the workflow to generate and store tracks automatically.\n',
			{ position: [-544, -480], width: 864, height: 496 },
		),
	)
	.add(
		sticky(
			'### Compose music with ElevenLabs\nGo to Developers, create API Key. Set Music Generation from "No Access" to "Access". Set Header Auth (Name: xi-api-key, Value: YOUR_API_KEY)',
			{ name: 'Sticky Note1', color: 7, position: [0, 64], width: 320, height: 304 },
		),
	)
	.add(
		sticky(
			'### Setup tracks\nPlease  clone [this sheet](https://docs.google.com/spreadsheets/d/10yDGf9Xyx2l-zdd5S1orxZaKbW3_vnONVgRBk_CLrpg/edit?usp=sharing) and fill the columns "Title", "Prompt" and "Duration (ms)"',
			{ name: 'Sticky Note2', color: 7, position: [-544, 64], width: 288, height: 304 },
		),
	)
	.add(
		sticky(
			'### Upload music and update Sheet\nUpload the music generated with ElevenLabs on Google Drive and update the Sheet with the URL of the MP3 track',
			{ name: 'Sticky Note3', color: 7, position: [336, 64], width: 592, height: 304 },
		),
	);
