const wf = workflow(
	'Zwz315okMu0UwtRQ',
	'💥 Automate AI Video Creation & Multi-Platform Publishing with Veo 3.1 & Blotato - vide',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.googleSheetsTrigger',
			version: 1,
			config: {
				parameters: {
					event: 'rowAdded',
					options: {},
					pollTimes: { item: [{ mode: 'everyX', unit: 'minutes', value: 30 }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/10yrKcdX92Yxauixzl58RDN6yNKfxAk0zX5avPy0uqAE/edit#gid=0',
						cachedResultName: 'Video_Requests',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '10yrKcdX92Yxauixzl58RDN6yNKfxAk0zX5avPy0uqAE',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/10yrKcdX92Yxauixzl58RDN6yNKfxAk0zX5avPy0uqAE/edit?usp=drivesdk',
						cachedResultName: 'Video_Requests',
					},
				},
				credentials: {
					googleSheetsTriggerOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsTriggerOAuth2Api Credential',
					},
				},
				position: [464, 2000],
				name: 'Google Sheets Trigger',
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
						'// Parse Google Sheets Input (headers) and Validate for Veo 3.1 workflow\nconst items = $input.all();\nconst results = [];\n\n// Helper to read and trim a field safely\nfunction getField(data, key) {\n  const v = (data[key] ?? data[key?.toUpperCase?.()] ?? "").toString();\n  return v.trim();\n}\n\nfor (const item of items) {\n  const data = item.json || {};\n\n  // Read by header names\n  const id_video  = getField(data, "id_video");\n  const niche     = getField(data, "niche");\n  const idea      = getField(data, "idea");\n  const url_1     = getField(data, "url_1");\n  const url_2     = getField(data, "url_2");\n  const url_3     = getField(data, "url_3");\n  const url_final = getField(data, "url_final");   // peut être vide au départ\n  const status    = getField(data, "status");      // ex: pending|processing|completed|failed\n  const row_number = data.row ?? data._row ?? "";\n\n  // Validation\n  const errors = [];\n\n  // niche & idea\n  if (!niche || niche.length <= 2) {\n    errors.push("niche must be longer than 2 characters");\n  }\n  if (!idea || idea.length <= 5) {\n    errors.push("idea must be longer than 5 characters");\n  }\n\n  // URLs images requises\n  if (!url_1 || !url_1.startsWith("http")) {\n    errors.push("url_1 is missing or invalid - must start with http");\n  }\n  if (!url_2 || !url_2.startsWith("http")) {\n    errors.push("url_2 is missing or invalid - must start with http");\n  }\n  if (!url_3 || !url_3.startsWith("http")) {\n    errors.push("url_3 is missing or invalid - must start with http");\n  }\n\n  // url_final si présent\n  if (url_final && !url_final.startsWith("http")) {\n    errors.push("url_final is invalid - must start with http if provided");\n  }\n\n  // status optionnel : normalisation (facultatif)\n  const allowedStatus = new Set(["", "pending", "processing", "completed", "failed", "draft"]);\n  if (!allowedStatus.has(status.toLowerCase?.() ?? "")) {\n    errors.push(`status \'${status}\' is not recognized (use: pending|processing|completed|failed|draft)`);\n  }\n\n  // Build output item\n  const image_urls = [url_1, url_2, url_3];\n\n  const out = {\n    json: {\n      id_video,\n      niche,\n      idea,\n      image_urls,\n      url_final: url_final || "",\n      status: (status || "pending").toLowerCase(),\n      row_number,\n      timestamp: new Date().toISOString(),\n    },\n  };\n\n  // Valid flag + errors\n  if (errors.length) {\n    out.json.valid = false;\n    out.json.validation_errors = errors;\n  } else {\n    out.json.valid = true;\n  }\n\n  results.push(out);\n}\n\nreturn results;\n',
				},
				position: [672, 2000],
				name: 'Parse Sheet Input',
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
								id: 'id-1',
								name: 'openai_api_key',
								type: 'string',
								value: 'YOUR_OPENAI_API_KEY',
							},
							{
								id: 'id-2',
								name: 'min_idea_length',
								type: 'number',
								value: 5,
							},
							{
								id: 'id-3',
								name: 'required_photos',
								type: 'number',
								value: 3,
							},
							{
								id: 'id-5',
								name: 'fal_api_key',
								type: 'string',
								value: 'key YOUR_FAL_API_KEY',
							},
							{
								id: 'id-6',
								name: 'google_drive_folder_id',
								type: 'string',
								value: 'YOUR_GOOGLE_DRIVE_FOLDER_ID',
							},
							{
								id: 'id-7',
								name: 'google_sheet_id',
								type: 'string',
								value: 'YOUR_GOOGLE_SHEETS_ID',
							},
						],
					},
					includeOtherFields: true,
				},
				position: [896, 2000],
				name: 'Workflow Configuration',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					modelId: { __rl: true, mode: 'id', value: 'gpt-4o-mini' },
					options: {},
					messages: {
						values: [
							{
								role: 'system',
								content: 'You are a viral video content creator',
							},
							{
								content:
									'=Create viral video content for {{ $json.niche }} about {{ $json.idea }}. Return JSON with: prompt (150-200 word cinematic Veo 3.1 description), caption (50-100 word social media text with emojis), hashtags (array of 8-10 tags)',
							},
						],
					},
					jsonOutput: true,
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1072, 2000],
				name: 'GPT-4 API Call',
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
						'// Parse OpenAI-style responses into { prompt, caption, hashtags[], hashtags_string }\nreturn $input.all().map(item => {\n  const data = item.json || {};\n  \n  // Try to locate "content" in the common places\n  let content =\n    data?.choices?.[0]?.message?.content ??\n    data?.message?.content ??\n    data?.content ??\n    null;\n\n  let prompt = "";\n  let caption = "";\n  let hashtagsArr = [];\n\n  // If content is an object (your current input case)\n  if (content && typeof content === "object") {\n    prompt = content.prompt ?? "";\n    caption = content.caption ?? "";\n    if (Array.isArray(content.hashtags)) {\n      hashtagsArr = content.hashtags;\n    } else if (typeof content.hashtags === "string") {\n      // Support comma/space separated string\n      hashtagsArr = content.hashtags.split(/[,\\s]+/).filter(Boolean);\n    }\n  }\n  // If content is a string (some models return JSON as string)\n  else if (typeof content === "string" && content.trim()) {\n    try {\n      const parsed = JSON.parse(content);\n      prompt = parsed.prompt ?? "";\n      caption = parsed.caption ?? "";\n      if (Array.isArray(parsed.hashtags)) {\n        hashtagsArr = parsed.hashtags;\n      } else if (typeof parsed.hashtags === "string") {\n        hashtagsArr = parsed.hashtags.split(/[,\\s]+/).filter(Boolean);\n      }\n    } catch {\n      // Not a JSON string — leave fields empty\n      prompt = "";\n      caption = "";\n      hashtagsArr = [];\n    }\n  }\n\n  // Normalize hashtags: ensure leading \'#\', dedupe, no empties\n  const norm = Array.from(\n    new Set(\n      (hashtagsArr || [])\n        .map(h => (h ?? "").toString().trim())\n        .filter(Boolean)\n        .map(h => (h.startsWith("#") ? h : `#${h}`))\n    )\n  );\n  const hashtags_string = norm.join(" ");\n\n  return {\n    json: {\n      prompt,\n      caption,\n      hashtags: norm,\n      hashtags_string\n    }\n  };\n});\n',
				},
				position: [1376, 2000],
				name: 'Parse GPT Response',
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
								id: 'id-1',
								name: 'veo_prompt',
								type: 'string',
								value:
									'={{ $json.prompt }} consistent character throughout, photorealistic quality, professional cinematography, 8 seconds duration, 9:16 aspect ratio, 24fps',
							},
						],
					},
					includeOtherFields: true,
				},
				position: [672, 2224],
				name: 'Optimize Prompt for Veo',
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
						"const prompt = $input.item.json.veo_prompt || $input.item.json.prompt;\nlet imageUrls = $('Parse Sheet Input').item.json.image_urls;\n\nfunction convertGoogleDriveUrl(url) {\n  if (!url) return url;\n  if (url.includes('drive.google.com/file/d/')) {\n    const match = url.match(/\\/d\\/([a-zA-Z0-9_-]+)/);\n    if (match && match[1]) {\n      return `https://drive.google.com/uc?export=download&id=${match[1]}`;\n    }\n  }\n  return url;\n}\n\nif (!prompt || prompt.length < 10) {\n  throw new Error('Prompt required');\n}\n\nif (!Array.isArray(imageUrls) || imageUrls.length !== 3) {\n  throw new Error('Need 3 image URLs');\n}\n\nconst directImageUrls = imageUrls.map(url => convertGoogleDriveUrl(url));\n\ndirectImageUrls.forEach((url, index) => {\n  if (!url || !url.startsWith('http')) {\n    throw new Error('Invalid image URL at position ' + (index + 1));\n  }\n});\n\nreturn {\n  json: {\n    veo_request_body: {\n      prompt: prompt,\n      image_urls: directImageUrls,\n      duration: 8,\n      aspect_ratio: \"9:16\"\n    },\n    ...($input.item.json)\n  }\n};",
				},
				position: [896, 2224],
				name: 'Prepare Veo Request Body',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://fal.run/fal-ai/veo3.1/reference-to-video',
					method: 'POST',
					options: {
						timeout: 600000,
						response: { response: { responseFormat: 'json' } },
					},
					jsonBody: '={{ JSON.stringify($json.veo_request_body) }}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{
								name: 'Authorization',
								value: "={{ $('Workflow Configuration').item.json.fal_api_key }}",
							},
							{ name: 'Content-Type', value: 'application/json' },
						],
					},
				},
				position: [1136, 2224],
				name: 'Veo Generation1',
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
						"// Extract video data from Veo Generation response\nconst items = $input.all();\nconst results = [];\n\nfor (const item of items) {\n  const data = item.json || {};\n  \n  // Extract video data from current node\n  const video_url = data.video?.url || '';\n  const video_content_type = data.video?.content_type || '';\n  const video_file_size = data.video?.file_size || 0;\n  const video_file_name = data.video?.file_name || '';\n  \n  // Preserve data from previous nodes\n  const niche = $('Parse Sheet Input').item.json.niche || '';\n  const idea = $('Parse Sheet Input').item.json.idea || '';\n  const caption = $('Parse GPT Response').item.json.caption || '';\n  const hashtags_string = $('Parse GPT Response').item.json.hashtags_string || '';\n  const veo_prompt = $('Optimize Prompt for Veo').item.json.veo_prompt || '';\n  const id_video = $('Parse Sheet Input').item.json.id_video || '';\n  const row_number = $('Parse Sheet Input').item.json.row_number || '';\n  \n  results.push({\n    json: {\n      video_url,\n      video_content_type,\n      video_file_size,\n      video_file_name,\n      generation_completed_at: new Date().toISOString(),\n      niche,\n      idea,\n      caption,\n      hashtags_string,\n      veo_prompt,\n      id_video,\n      row_number\n    }\n  });\n}\n\nreturn results;",
				},
				position: [1376, 2224],
				name: 'Extract Video Data',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.video_url }}',
					options: { response: { response: { responseFormat: 'file' } } },
				},
				position: [672, 2464],
				name: 'Download Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					name: "={{ 'AI_Video_' + $json.user_id + '_' + $json.timestamp + '.mp4' }}",
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Workflow Configuration').first().json.google_drive_folder_id }}",
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [896, 2464],
				name: 'Google Drive Upload',
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
						value: {},
						schema: [],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'update',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Workflow Configuration').first().json.google_sheet_id }}",
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1136, 2464],
				name: 'Google Sheets Append',
			},
		}),
	)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: { mediaUrl: '={{ $json.url_final }}', resource: 'media' },
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1376, 2464],
				name: 'Upload Video to BLOTATO',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'tiktok',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '9332',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/9332',
						cachedResultName: 'docteur.firas',
					},
					postContentText: "={{ $('Save to Google Sheets').item.json.CAPTION }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1632, 2000],
				name: 'Tiktok',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: {
				parameters: { mode: 'chooseBranch', numberInputs: 6 },
				position: [2128, 2160],
				name: 'Merge1',
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
							status: 'Published',
							id_video: "={{ $('Google Sheets Trigger').first().json.id_video }}",
						},
						schema: [
							{
								id: 'id_video',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'id_video',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'niche',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'niche',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'idea',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'idea',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'url_1',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'url_1',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'url_2',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'url_2',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'url_3',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'url_3',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'url_final',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'url_final',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'status',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'number',
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
						matchingColumns: ['id_video'],
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
							'https://docs.google.com/spreadsheets/d/10yrKcdX92Yxauixzl58RDN6yNKfxAk0zX5avPy0uqAE/edit#gid=0',
						cachedResultName: 'Video_Requests',
					},
					documentId: {
						__rl: true,
						mode: 'id',
						value: '=10yrKcdX92Yxauixzl58RDN6yNKfxAk0zX5avPy0uqAE',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [2128, 2464],
				name: 'Google Sheets Append1',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'linkedin',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '1446',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1446',
						cachedResultName: 'Samuel Amalric',
					},
					postContentText: "={{ $('Save to Google Sheets').item.json.CAPTION }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1840, 2000],
				name: 'Linkedin',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'facebook',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '1759',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1759',
						cachedResultName: 'Firass Ben',
					},
					facebookPageId: {
						__rl: true,
						mode: 'list',
						value: '101603614680195',
						cachedResultUrl:
							'https://backend.blotato.com/v2/accounts/1759/subaccounts/101603614680195',
						cachedResultName: 'Dr. Firas',
					},
					postContentText: "={{ $('Save to Google Sheets').item.json.CAPTION }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1632, 2224],
				name: 'Facebook',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					accountId: {
						__rl: true,
						mode: 'list',
						value: '1687',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1687',
						cachedResultName: 'acces.a.vie',
					},
					postContentText: "={{ $('Save to Google Sheets').item.json.CAPTION }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1840, 2224],
				name: 'Instagram',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'twitter',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '1289',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/1289',
						cachedResultName: 'Docteur_Firas',
					},
					postContentText: "={{ $('Save to Google Sheets').item.json.CAPTION }}",
					postContentMediaUrls: '={{ $json.url }}',
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1632, 2464],
				name: 'Twitter (X)',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@blotato/n8n-nodes-blotato.blotato',
			version: 2,
			config: {
				parameters: {
					options: {},
					platform: 'youtube',
					accountId: {
						__rl: true,
						mode: 'list',
						value: '8047',
						cachedResultUrl: 'https://backend.blotato.com/v2/accounts/8047',
						cachedResultName: 'DR FIRASS (Dr. Firas)',
					},
					postContentText: "={{ $('Save to Google Sheets').item.json.CAPTION }}",
					postContentMediaUrls: '={{ $json.url }}',
					postCreateYoutubeOptionTitle: "={{ $('Save to Google Sheets').item.json.IDEA }}",
					postCreateYoutubeOptionPrivacyStatus: 'private',
					postCreateYoutubeOptionShouldNotifySubscribers: false,
				},
				credentials: {
					blotatoApi: { id: 'credential-id', name: 'blotatoApi Credential' },
				},
				position: [1856, 2464],
				name: 'Youtube',
			},
		}),
	)
	.add(
		sticky(
			'# 📤 STEP 5: PUBLISHING & TRACKING\n\n### Install the Blotato [Blotato](https://blotato.com/?ref=firas) Node in n8n (Community Nodes)\n1. In n8n, open **Settings → Community Nodes**.  \n2. Click **Install**, then add: `@blotato/n8n-nodes-blotato`.  \n3. Log in to **Blotato**.  \n4. Go to **Settings → API Keys**.  \n5. In n8n → **Credentials → New**.  \n6. Choose **Blotato API** \n(provided by the community node you installed).  \n\n✅ **Activate Workflow:**\n- Toggle workflow to **Active** state\n- Ensure trigger is enabled\n\n✅ **Monitor Executions:**\n- Check execution history regularly\n- Review error logs if failures occur\n',
			{ name: 'Step 5 - Publishing', color: 5, position: [1536, 1376], width: 796, height: 1316 },
		),
	)
	.add(
		sticky(
			'# 🎬 AI VIDEO GENERATOR - VEO 3.1\n\n**Workflow Steps:**\n1. Monitor Google Sheets for new video requests\n2. Generate content with GPT-4\n3. Create video with Veo 3.1\n4. Upload to Google Drive\n5. Publish to social media via Blotato\n# 📋 STEP 1: PREREQUISITES\n\n1. **OpenAI (GPT-4)**\n   - Sign up: [platform.openai.com](https://platform.openai.com)\n   - Get API key: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)\n   - Estimated cost: ~$0.01-0.05 per video\n\n2. **fal.ai (Veo 3.1)**\n   - Sign up: [fal.ai](https://fal.ai)\n   - Get API key: [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys)\n   - Estimated cost: ~$0.50-2.00 per video\n\n3. **Google Account**\n   - Google Sheets (trigger & tracking)\n   - Google Drive (video storage)\n   - Free tier available\n\n4. **Blotato (Social Media Publishing)**\n   - Sign up: [blotato.com](https://blotato.com)\n   - Get API key from Settings → API Keys\n   - Multi-platform publishing support\n\n# 📊 STEP 2: GOOGLE SHEETS\n\n### Create Video_Requests Sheet\n1. Create a new Google Sheet named **Video_Requests**\n2. Add the following columns (A through H):\n   - **A: id_video** - Unique video ID (auto-generated or sequential)\n   - **B: niche** - Content niche or category (e.g. Tech, Fashion, Fitness)\n   - **C: idea** - Short video idea or concept (min 5 characters)\n   - **D: url_1** - First reference image (scene, product, or creator)\n   - **E: url_2** - Second reference image\n   - **F: url_3** - Third reference image\n   - **G: url_final** - Final generated video URL (auto-filled by n8n)\n   - **H: status** - Processing status (pending / processing / completed / failed)\n\n\n### Image URL Requirements\n- All image URLs must start with `http://` or `https://`\n- Google Drive URLs will be automatically converted to direct download links\n- Minimum 3 images required per video request\n\n### Google Drive Setup\n1. Create a folder in Google Drive for video storage\n2. Copy the folder ID from the URL\n3. Update the `google_drive_folder_id` in Workflow Configuration node',
			{
				name: 'Step 1 - Prerequisites',
				color: 5,
				position: [-192, 1376],
				width: 598,
				height: 1316,
			},
		),
	)
	.add(
		sticky(
			'# 🔑 STEP 3: API KEYS CONFIGURATION\n\n\n## ⚠️ Important Warnings\n\n**Timeout:** Veo video generation can take 5-10 minutes. HTTP request timeout is set to 10 minutes (600,000ms).\n\n**Estimated Costs Per Video:**\n- GPT-4 API call: ~$0.01-0.05\n- Fal.ai Veo 3.1 generation: ~$0.50-1.00\n- Total per video: ~$0.51-1.05\n\n**Rate Limits:** Be mindful of API rate limits for all services.',
			{
				name: 'Step 3 - API Keys Configuration',
				color: 5,
				position: [416, 1376],
				width: 550,
				height: 584,
			},
		),
	)
	.add(
		sticky(
			'# 🚀 STEP 4: WORKFLOW ACTIVATION\n\n## Pre-Activation Checklist\n\n✅ **Verify All Credentials:**\n- OpenAI API key configured\n- Fal.ai API key set\n- Google Sheets OAuth connected\n- Google Drive OAuth connected\n- Blotato API key added (if publishing)\n\n✅ **Test Workflow:**\n1. Add a test row in your Google Sheets:\n   - id_video: TEST_001\n   - niche: Health\n   - idea: Benefits of morning exercise\n   - url_1, url_2, url_3: Valid image URLs\n   - status: pending\n2. Wait for trigger to fire (30 min polling)\n3. Monitor execution in n8n dashboard\n\n',
			{
				name: 'Step 4 - Workflow Activation',
				color: 6,
				position: [976, 1376],
				width: 550,
				height: 582,
			},
		),
	);
