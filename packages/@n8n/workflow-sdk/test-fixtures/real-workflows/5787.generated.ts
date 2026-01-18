const wf = workflow(
	'cbeBbWowy2c7CXli',
	'From Google Drive to Instagram, TikTok & YouTube with Airtable Tracking',
	{ executionOrder: 'v1' },
)
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
						value: '18m0i341QLQuyWuHv_FBdz8-r-QDtofYm',
						cachedResultUrl:
							'https://drive.google.com/drive/folders/18m0i341QLQuyWuHv_FBdz8-r-QDtofYm',
						cachedResultName: 'Influencersde',
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [-2760, 420],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 1,
			config: {
				parameters: {
					fileId: {
						__rl: true,
						mode: '',
						value: '={{ $json.id || $json.data[0].id }}',
					},
					options: {},
					operation: 'download',
					authentication: 'oAuth2',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [-2600, 420],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.writeBinaryFile',
			version: 1,
			config: {
				parameters: {
					options: {},
					fileName: '={{ $json.originalFilename.replaceAll(" ", "_") }}',
				},
				position: [-2380, 420],
				name: 'Read video from Google Drive',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1,
			config: {
				parameters: { options: {}, resource: 'audio', operation: 'transcribe' },
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-1960, 420],
				name: 'Get Audio from Video',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.4,
			config: {
				parameters: {
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4o',
						cachedResultName: 'GPT-4O',
					},
					options: {},
					messages: {
						values: [
							{
								role: 'system',
								content:
									'You are an expert assistant in creating engaging social media video titles.',
							},
							{
								content:
									"=I'm going to upload a video to social media. Here are some examples of descriptions that have worked well on Instagram:\n\nFollow and save for later. Discover InfluencersDe, the AI tool that automates TikTok creation and publishing to drive traffic to your website. Perfect for entrepreneurs and brands.\n#digitalmarketing #ugc #tiktok #ai #influencersde #contentcreation\n\nDiscover the video marketing revolution with InfluencersDe!\n.\n.\n.\n#socialmedia #videomarketing #ai #tiktok #influencersde #growthhacking\n\nDon't miss InfluencersDe, the tool that transforms your marketing strategy with just one click!\n.\n.\n.\n#ugc #ai #tiktok #digitalmarketing #influencersde #branding\n\nCan you create another title for the Instagram post based on this recognized audio from the video?\n\nAudio: {{ $('Get Audio from Video').item.json.text }}\n\nIMPORTANT: Reply only with the description, don't add anything else.",
							},
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [-1740, 420],
				name: 'Generate Description for Videos',
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
								id: 'cd270863-aa35-418c-a0ae-1b5878eee2ed',
								name: 'airtable_app_id',
								type: 'string',
								value: 'add_airtable_app_id',
							},
							{
								id: '00ef91b2-8a4c-42bb-a46f-f7eb06e861e8',
								name: 'airtable_table_id',
								type: 'string',
								value: 'add_airtable_table_id',
							},
							{
								id: '21b5d3ad-ff81-407e-8c4e-53bda8a16e0e',
								name: 'upload_post_user',
								type: 'string',
								value: 'test2',
							},
						],
					},
				},
				position: [-1360, 420],
				name: 'Set Variables',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 1,
			config: {
				parameters: {
					table: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Variables').item.json.airtable_table_id }}",
					},
					fields: ['Video Name'],
					options: {},
					operation: 'append',
					application: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Set Variables').item.json.airtable_app_id }}",
					},
					addAllFields: false,
					authentication: 'airtableTokenApi',
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [-1160, 420],
				name: 'Create Airtable Record',
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
								id: 'e611aba1-e55c-4221-b03b-04008a04fa9c',
								name: 'ID',
								type: 'string',
								value: '={{ $json.id }}',
							},
							{
								id: '47f61cd2-6dd6-4714-b772-3e0537accecd',
								name: 'Description',
								type: 'string',
								value: "={{ $('Generate Description for Videos').item.json.message.content }}",
							},
							{
								id: 'f44cc764-ed17-48c3-80e4-c320c6c67a7c',
								name: 'Video Name',
								type: 'string',
								value: "={{ $('Google Drive').item.json.originalFilename }}",
							},
							{
								id: '432688c0-d430-4e83-852c-91aad7b4ea79',
								name: 'Google Drive Links',
								type: 'string',
								value: "={{ $('Google Drive').item.json.webViewLink }}",
							},
							{
								id: '8804ac95-05d7-48e2-a49d-60213131ec62',
								name: 'Upload Date',
								type: 'string',
								value: '={{ $now }}',
							},
							{
								id: '12829ca5-2780-4779-be0c-ff1712c012d8',
								name: '',
								type: 'string',
								value: '',
							},
						],
					},
				},
				position: [-960, 420],
				name: 'Edit Airtable Fields1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 1,
			config: {
				parameters: {
					id: "={{ $('Create Airtable Record').item.json.id }}",
					table: {
						__rl: true,
						mode: '',
						value: "={{ $('Set Variables').item.json.airtable_table_id }}",
					},
					fields: ['Description', 'Video Name', 'Google Drive Links', 'Upload Date'],
					options: {},
					operation: 'update',
					application: {
						__rl: true,
						mode: '',
						value: "={{ $('Set Variables').item.json.airtable_app_id }}",
					},
					authentication: 'airtableTokenApi',
					updateAllFields: false,
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [-780, 420],
				name: 'Update Airtable with Description',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.readBinaryFile',
			version: 1,
			config: {
				parameters: {
					filePath:
						'={{ $(\'Read video from Google Drive\').item.json.originalFilename.replaceAll(" ", "_") }}',
					dataPropertyName: 'datavideo',
				},
				position: [-260, 180],
				name: 'Read Video for TikTok',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.upload-post.com/api/upload',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'title',
								value:
									'={{ $(\'Generate Description for Videos\').item.json.message.content.replaceAll("\\"", "") }}',
							},
							{ name: 'platform[]', value: 'tiktok' },
							{
								name: 'video',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'datavideo',
							},
							{
								name: 'user',
								value: "={{ $('Set Variables').item.json.upload_post_user }}",
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-20, 180],
				name: 'Upload Video to TikTok',
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
								id: 'e611aba1-e55c-4221-b03b-04008a04fa9c',
								name: 'ID',
								type: 'string',
								value: "={{ $('Update Airtable with Description').item.json.id }}",
							},
							{
								id: '47f61cd2-6dd6-4714-b772-3e0537accecd',
								name: 'TikTok Status',
								type: 'string',
								value: '=success: {{ $json.results.tiktok.success }}',
							},
							{
								id: '12829ca5-2780-4779-be0c-ff1712c012d8',
								name: 'Tiktok URL',
								type: 'string',
								value: '={{ $json.results.tiktok?.url || "error" }}',
							},
						],
					},
				},
				position: [220, 180],
				name: 'Edit Airtable Fields',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 1,
			config: {
				parameters: {
					id: "={{ $('Create Airtable Record').item.json.id }}",
					table: {
						__rl: true,
						mode: '',
						value: "={{ $('Set Variables').item.json.airtable_table_id }}",
					},
					fields: ['TikTok Status', 'Tiktok URL'],
					options: {},
					operation: 'update',
					application: {
						__rl: true,
						mode: '',
						value: "={{ $('Set Variables').item.json.airtable_app_id }}",
					},
					authentication: 'airtableTokenApi',
					updateAllFields: false,
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [440, 180],
				name: 'Update TikTok Status',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.readBinaryFile',
			version: 1,
			config: {
				parameters: {
					filePath:
						'={{ $(\'Read video from Google Drive\').item.json.originalFilename.replaceAll(" ", "_") }}',
					dataPropertyName: 'datavideo',
				},
				position: [-280, 480],
				name: 'Read Video for Instagram',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.upload-post.com/api/upload',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'title',
								value:
									'={{ $(\'Generate Description for Videos\').item.json.message.content.replaceAll("\\"", "") }}',
							},
							{ name: 'platform[]', value: 'instagram' },
							{
								name: 'video',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'datavideo',
							},
							{
								name: 'user',
								value: "={{ $('Set Variables').item.json.upload_post_user }}",
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-20, 480],
				name: 'Upload Video to Instagram',
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
								id: 'e611aba1-e55c-4221-b03b-04008a04fa9c',
								name: 'ID',
								type: 'string',
								value: "={{ $('Update Airtable with Description').item.json.id }}",
							},
							{
								id: '47f61cd2-6dd6-4714-b772-3e0537accecd',
								name: 'Instagram Status',
								type: 'string',
								value: '=success: {{ $json.results.instagram.success }}',
							},
							{
								id: '12829ca5-2780-4779-be0c-ff1712c012d8',
								name: 'Instagram URL',
								type: 'string',
								value: '={{ $json.results.instagram?.url || "error" }}',
							},
						],
					},
				},
				position: [220, 480],
				name: 'Edit Airtable Fields 2',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 1,
			config: {
				parameters: {
					id: "={{ $('Create Airtable Record').item.json.id }}",
					table: {
						__rl: true,
						mode: '',
						value: "={{ $('Set Variables').item.json.airtable_table_id }}",
					},
					fields: ['Instagram Status', 'Instagram URL'],
					options: {},
					operation: 'update',
					application: {
						__rl: true,
						mode: '',
						value: "={{ $('Set Variables').item.json.airtable_app_id }}",
					},
					authentication: 'airtableTokenApi',
					updateAllFields: false,
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [440, 480],
				name: 'Update Instagram Status',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.readBinaryFile',
			version: 1,
			config: {
				parameters: {
					filePath:
						'={{ $(\'Read video from Google Drive\').item.json.originalFilename.replaceAll(" ", "_") }}',
					dataPropertyName: 'datavideo',
				},
				position: [-280, 740],
				name: 'Read Video for YouTube',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.upload-post.com/api/upload',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'multipart-form-data',
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'title',
								value:
									'={{ $(\'Generate Description for Videos\').item.json.message.content.replaceAll("\\"", "").substring(0, 70) }}\n',
							},
							{ name: 'platform[]', value: 'youtube' },
							{
								name: 'video',
								parameterType: 'formBinaryData',
								inputDataFieldName: 'datavideo',
							},
							{
								name: 'user',
								value: "={{ $('Set Variables').item.json.upload_post_user }}",
							},
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-20, 740],
				name: 'Upload Video to YouTube',
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
								id: 'e611aba1-e55c-4221-b03b-04008a04fa9c',
								name: 'ID',
								type: 'string',
								value: "={{ $('Update Airtable with Description').item.json.id }}",
							},
							{
								id: '47f61cd2-6dd6-4714-b772-3e0537accecd',
								name: 'YouTube Status',
								type: 'string',
								value: '=success: {{ $json.results.youtube.success }}',
							},
							{
								id: '12829ca5-2780-4779-be0c-ff1712c012d8',
								name: 'Youtube URL',
								type: 'string',
								value: '={{ $json.results.youtube?.url || "error" }}',
							},
						],
					},
				},
				position: [220, 740],
				name: 'Edit Airtable Fields 3',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.airtable',
			version: 1,
			config: {
				parameters: {
					id: "={{ $('Create Airtable Record').item.json.id }}",
					table: {
						__rl: true,
						mode: '',
						value: "={{ $('Set Variables').item.json.airtable_table_id }}",
					},
					fields: ['YouTube Status', 'Youtube URL'],
					options: {},
					operation: 'update',
					application: {
						__rl: true,
						mode: '',
						value: "={{ $('Set Variables').item.json.airtable_app_id }}",
					},
					authentication: 'airtableTokenApi',
					updateAllFields: false,
				},
				credentials: {
					airtableTokenApi: { id: 'credential-id', name: 'airtableTokenApi Credential' },
				},
				position: [440, 740],
				name: 'Update YouTube Status - Success',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.errorTrigger',
			version: 1,
			config: { position: [-2260, 760] },
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.telegram',
					version: 1.2,
					config: {
						parameters: {
							text: '=🔔 ERROR SUBIENDO VIDEOS',
							additionalFields: { appendAttribution: false },
						},
						credentials: {
							telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
						},
						position: [-1920, 740],
					},
				}),
				null,
			],
			{
				version: 2.1,
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 1,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '9fadb3fd-2547-42bd-8f40-f410a97dcf57',
								operator: { type: 'string', operation: 'notContains' },
								leftValue: '={{ $json.trigger.error.message }}',
								rightValue: 'The DNS server returned an error, perhaps the server is offline',
							},
						],
					},
				},
				name: 'If',
			},
		),
	)
	.add(
		sticky(
			'## Description\nThis automation allows you to upload a video to a configured Google Drive folder, and it will automatically create descriptions and upload it to Instagram, TikTok, and YouTube with Airtable tracking.\n\n## How to Use\n1. Configure your Airtable base and table IDs in the Set Variables node\n2. Set up Airtable fields: Video Name, Google Drive Link, File ID, Instagram Status, TikTok Status, YouTube Status, Upload Date, Description\n3. Generate an API token at upload-post.com and add to Upload nodes\n4. Configure your Google Drive folder\n5. Customize the OpenAI prompt for your specific use case\n6. Optional: Configure Telegram for error notifications\n\n## Requirements\n- Airtable account with configured base\n- upload-post.com account\n- Google Drive account\n- OpenAI API key\n',
			{ position: [-3100, 80], width: 860, height: 300 },
		),
	);
