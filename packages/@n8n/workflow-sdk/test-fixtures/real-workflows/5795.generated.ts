const wf = workflow('', 'Reels Trends Watcher')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-640, 660], name: 'When clicking ‘Execute workflow’' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						'const variables = {\n  // https://apify.com/apify/instagram-scraper \n  // Instagram Scraper = apify/instagram-scraper, \n  "scrapingActorId" : "shu8hvrXbJbY3Eb9W", // ID of Apify scraper\n  "daysLimit" : 7, // Date limit \n  "resultsLimit" : 3, // Results per account\n  "maxDays" : 2, // Sleeping || Active\n  "translationLang" : "German",\n}\n\n\nreturn [{json : variables}]',
				},
				position: [-420, 660],
				name: 'Variables',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.notion',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					resource: 'databasePage',
					operation: 'getAll',
					returnAll: true,
					databaseId: { __rl: true, mode: 'list', cachedResultName: 'Sources' },
				},
				credentials: {
					notionApi: { id: 'credential-id', name: 'notionApi Credential' },
				},
				position: [-200, 660],
				name: 'Get Sources',
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
						'// required Simplify = true\n\nconst query = {\n    "addParentData": false,\n    "directUrls": [],\n    "enhanceUserSearchWithFacebookPage": false,\n    "isUserReelFeedURL": false,\n    "isUserTaggedFeedURL": false,\n    "onlyPostsNewerThan": ($(\'Variables\').first().json.daysLimit ?? 10) + \' days\',\n    "resultsLimit": $(\'Variables\').first().json.resultsLimit ?? 5,\n    "resultsType": "stories"\n};\n\nconst urls = [];\nconst map = {};\n\nitems.forEach(item => {\n  const username = item.json.property_username || \'\';\n  if (username) {\n    urls.push(\'https://www.instagram.com/\' + username + \'/\');\n    map[username.toLowerCase()] = item.json.id;   // Notion pageId\n  }\n});\n\nquery.directUrls = urls;\n\nreturn [\n  {\n    json: {\n      query,\n      urls,\n      map     \n    }\n  }\n];\n',
				},
				position: [20, 660],
				name: 'Apify Payload',
			},
		}),
	)
	.then(
		node({
			type: '@apify/n8n-nodes-apify.apify',
			version: 1,
			config: {
				parameters: {
					actorId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Variables').first().json.scrapingActorId }}",
					},
					operation: 'Run actor',
					customBody: '={{ $json.query.toJsonString() }}',
					actorSource: 'store',
				},
				credentials: {
					apifyApi: { id: 'credential-id', name: 'apifyApi Credential' },
				},
				position: [240, 660],
				name: 'Run an Actor',
			},
		}),
	)
	.then(
		node({
			type: '@apify/n8n-nodes-apify.apify',
			version: 1,
			config: {
				parameters: {
					runId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
					resource: 'Actor runs',
					operation: 'Get run',
				},
				credentials: {
					apifyApi: { id: 'credential-id', name: 'apifyApi Credential' },
				},
				position: [460, 660],
				name: 'Get Status',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Done',
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
											id: '96d0046b-c9ab-429e-b35c-3d7518564c1b',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.status }}',
											rightValue: 'SUCCEEDED',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Running',
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
											id: '5b1c311d-10cf-4e6f-a55c-f311c75ef444',
											operator: { type: 'string', operation: 'equals' },
											leftValue: "={{ $('Get Status').item.json.status }}",
											rightValue: 'RUNNING',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Ready',
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
											id: '8376a12a-87c9-4878-b654-1c91fdfb31a2',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: "={{ $('Get Status').item.json.status }}",
											rightValue: 'READY',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [680, 600],
				name: 'Switch',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@apify/n8n-nodes-apify.apify',
			version: 1,
			config: {
				parameters: {
					limit: null,
					resource: 'Datasets',
					datasetId: '={{ $json.defaultDatasetId }}',
					operation: 'Get items',
				},
				credentials: {
					apifyApi: { id: 'credential-id', name: 'apifyApi Credential' },
				},
				position: [900, 540],
				name: 'Get dataset items',
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
						"const maxDays = $('Variables').first()?.json?.maxDays ?? 3;  \nconst now     = new Date();\n\n\nvar results = items;                             \nconst map   = $('Apify Payload').first().json.map;\n\n\nconst acctStatus = {};   // { username: 'Active' | 'Sleeping' }\n\nfor (const itm of results) {\n  const owner = itm.json.ownerUsername.toLowerCase();\n  const ts    = new Date(itm.json.timestamp);\n  const diff  = (now - ts) / 86_400_000;    \n\n  \n  if (!acctStatus[owner] || acctStatus[owner] === 'Sleeping') {\n    acctStatus[owner] = diff <= maxDays ? 'Active' : 'Sleeping';\n  }\n}\n\nfor (const k in results) {\n  const item   = results[k];\n  const owner  = item.json.ownerUsername.toLowerCase();\n\n  // coauthorProducers - !notionPageId\n  item.json.notionPageId     = map[owner];\n  item.json.publishingStatus = acctStatus[owner];\n\n  results[k] = item;\n}\n\nreturn results;\n",
				},
				position: [1120, 540],
				name: 'Map Reels',
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
								id: '7b88be8b-60c6-47b1-8a6a-4f5b97d71234',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: '={{ $json.notionPageId }}',
								rightValue: '',
							},
						],
					},
				},
				position: [1340, 540],
				name: 'Owner?',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.notion',
			version: 2,
			config: {
				parameters: {
					pageId: { __rl: true, mode: 'id', value: '={{ $json.notionPageId }}' },
					options: {},
					resource: 'databasePage',
					operation: 'update',
					propertiesUi: {
						propertyValues: [
							{
								key: 'Status|select',
								selectValue: '={{ $json.publishingStatus }}',
							},
							{ key: 'Title|title', title: '={{ $json.ownerFullName }}' },
							{ key: 'URL|url', urlValue: '={{ $json.inputUrl }}' },
						],
					},
				},
				credentials: {
					notionApi: { id: 'credential-id', name: 'notionApi Credential' },
				},
				position: [1560, 540],
				name: 'Update Accounts',
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
						"const accountsMap = {};\n\nitems.forEach(item => {\n  const username = item.json.property_username || '';\n  if (username) {\n    accountsMap[username.toLowerCase()] = item.json.id;   // Notion pageId\n  }\n});\n\nreturn [\n  {\n    json: {\n      accountsMap,\n      items\n    }\n  }\n];\n",
				},
				position: [1780, 540],
				name: 'Many to One',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.notion',
			version: 2.2,
			config: {
				parameters: {
					filters: {
						conditions: [
							{
								key: 'Date|date',
								date: "={{ new Date(Date.now() - $('Variables').first().json.daysLimit * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }}",
								condition: 'after',
							},
						],
					},
					options: {},
					resource: 'databasePage',
					operation: 'getAll',
					returnAll: true,
					databaseId: { __rl: true, mode: 'list', cachedResultName: 'Reels' },
					filterType: 'manual',
				},
				credentials: {
					notionApi: { id: 'credential-id', name: 'notionApi Credential' },
				},
				position: [2000, 540],
				name: 'Get Reels',
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
						"const existingPages = {};\nfor (const page of $items('Get Reels')) {\n  const source = page.json.property_url ?? '';\n  if (source) existingPages[source] = page.json;\n}\n\nconst output = [];\nconst accountsMap = $('Many to One').first().json.accountsMap;\n\nfor (const reel of $items('Map Reels')) {\n\n  const source   = reel.json.url;          \n\n  const views = reel.json.videoViewCount;\n  var update = {\n    \"Code\": reel.json.shortCode,\n    \"SignedCode\": reel.json.shortCode + '-' + Math.random(),\n    \"IsCreated\" : false,\n    \"notionAccountPageId\" : accountsMap[ reel.json.ownerUsername.toLowerCase() ],\n          \"Views\"       : views ? views : reel.json.videoPlayCount,\n          \"Likes\"       : reel.json.likesCount,\n          \"Comments\"    : reel.json.commentsCount,\n          \"Saves\"       : reel.json.savesCount ?? 0,\n          \"Shares\"      : reel.json.sharesCount ?? 0,\n          \"Updated\"   : new Date().toISOString()\n  };\n\n  /* ------------------------------------------------- */\n  if (existingPages[source]) {\n    \n    update.notionPageId = existingPages[source].id;\n\n  } else {\n    update['IsCreated'] = true;\n    update['Caption'] = reel.json.caption;\n    update['URL'] = reel.json.url;\n    update['Hashtags'] = reel.json.hashtags.join(', ');\n    update['Duration'] = reel.json.videoDuration;\n    update['Date'] = reel.json.timestamp;\n    update['videoUrl'] = reel.json.videoUrl;\n    \n  }\n\n  output.push({json: update});\n}\n\nreturn output;   // n8n continues with one array containing both kinds of items\n",
				},
				position: [2220, 540],
				name: 'Code',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-400, 1400], name: 'Loop Over Items' },
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// Loop over input items and add a new field called 'myNewField' to the JSON of each one\nfor (const item of $input.all()) {\n  item.json.myNewField = 1;\n}\n\nreturn $input.all();",
				},
				position: [-180, 1100],
				name: 'Stats',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'Create',
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
											id: 'bed205cb-cc58-4f99-af5e-7565257ea7c4',
											operator: { type: 'boolean', operation: 'true', singleValue: true },
											leftValue: '={{ $json.IsCreated && $json.notionAccountPageId != null }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'Update',
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
											id: '042c2e67-6f4d-4909-a73d-eb43864203dd',
											operator: { type: 'boolean', operation: 'true', singleValue: true },
											leftValue: '={{ !$json.IsCreated && $json.notionAccountPageId != null }}',
											rightValue: '',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [-180, 1300],
				name: 'Is Created?',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: { url: '={{ $json.videoUrl }}', options: {} },
				position: [40, 1220],
				name: 'Download Video',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://generativelanguage.googleapis.com/upload/v1beta/files',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'binaryData',
					authentication: 'predefinedCredentialType',
					inputDataFieldName: 'data',
					nodeCredentialType: 'googlePalmApi',
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [260, 1220],
				name: 'Upload to Gemini',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: {
				parameters: { unit: 'minutes', amount: 1 },
				position: [480, 1220],
				name: 'Processing Delay',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '={{ $json.file.uri }}',
					options: {},
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'googlePalmApi',
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [700, 1160],
				name: 'Get File State',
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
								id: '8cf67b24-2993-4aed-be9d-00b88a1c5701',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.state }}',
								rightValue: 'ACTIVE',
							},
						],
					},
				},
				position: [920, 1220],
				name: 'Is Uploaded And Active?',
			},
		}),
	)
	.output(0)
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
								id: '01c3ca92-795f-4528-8df5-204c324c352b',
								name: 'AnalyzePrompt',
								type: 'string',
								value:
									"=Perform the following tasks based on the video/audio content:\n\n1. Create a full transcription of the audio — convert speech to text exactly as spoken, without interpretation or summarization, so it can be easily read or re-voiced later.\n\n2. Identify a strong hook from the first few seconds of the content that can grab attention.\n\n3. Determine the category of the content using the following rules:\n- Business: if the video shares business advice\n- Marketing: if the video shares marketing advice\n- Cooking: if the video shares cooking advice\n- Interview: if the video is an interview with a guest\n- Unknown: if the category cannot be determined\n\n4. Identify the video format using the following options:\n- Head: if it's a talking-head video\n- Animation: if it's animated or presented with drawings\n- Unknown: if the format is unclear\n\n5. Translate the full transcription and the hook into {{ $('Variables').first().json.translationLang }}.\n\nReturn the result in **pure JSON format** with the following fields:  \n`transcription`, `hook`, `category`, `format`, `translation`, `translation_hook`.\n\n**Do not include any commentary or explanations. Only return the JSON.**",
							},
						],
					},
				},
				position: [1160, 1240],
				name: 'Set Prompt',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n	"contents": [{\n		"parts": [{\n			"file_data": {\n				"file_uri": "{{ $(\'Is Uploaded And Active?\').item.json.uri }}",\n				"mime_type": "{{ $(\'Is Uploaded And Active?\').item.json.mimeType }}"\n			}\n		}, {\n			"text": "{{ $(\'Set Prompt\').first().json.AnalyzePrompt.replaceAll("\\n", \'\\\\n\').replaceAll(\'"\', \'\\""\') }}"\n		}]\n	}]\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'googlePalmApi',
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [1360, 1220],
				name: 'Gemini Analyze',
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
						"\nconst rawText = $input.first().json.candidates[0].content.parts[0].text;\n\nconst cleaned = rawText\n  .replace(/^```json\\s*/, '')      \n  .replace(/\\s*```$/, '')          \n  .trim();\n\nlet parsed;\ntry {\n  parsed = JSON.parse(cleaned);\n} catch (e) {\n  return [{ json: { error: 'Invalid JSON', message: e.message } }];\n}\n\nlet item = $('Is Created?').first().json;\n\nparsed.transcription = parsed.transcription ?? '';\nparsed.hook = parsed.hook ?? '';\nparsed.category = parsed.category ?? '';\nparsed.format = parsed.format ?? '';\nparsed.translation = parsed.translation ?? '';\nparsed.translation_hook = parsed.translation_hook ?? '';\n\nitem.response = parsed;\n\n\nreturn [{ json: item }];\n",
				},
				position: [1580, 1220],
				name: 'Format Response',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.notion',
			version: 2.2,
			config: {
				parameters: {
					title: '={{ ($json.response.hook ?? $json.Caption).substring(0, 50) }}',
					options: {},
					resource: 'databasePage',
					databaseId: { __rl: true, mode: 'list', cachedResultName: 'Reels' },
					propertiesUi: {
						propertyValues: [
							{ key: 'Date|date', date: '={{ $json.Date }}' },
							{
								key: 'Caption|rich_text',
								textContent: '={{ $json.Caption.substring(0, 1995) }}',
							},
							{
								key: 'Duration|number',
								numberValue: '={{ $json.Duration }}',
							},
							{ key: 'Likes|number', numberValue: '={{ $json.Likes }}' },
							{ key: 'Parsed Date|date', date: '={{ $now }}' },
							{ key: 'URL|url', urlValue: '={{ $json.URL }}' },
							{ key: 'Views|number', numberValue: '={{ $json.Views }}' },
							{
								key: 'Comments|number',
								numberValue: '={{ $json.Comments }}',
							},
							{
								key: 'Author|relation',
								relationValue: ['={{ $json.notionAccountPageId }}'],
							},
							{
								key: 'Content|rich_text',
								textContent:
									'=### HOOK ###\n{{ $json.response.hook }}\n\n### CONTENT ###\n{{ $json.response.transcription.substring(0, 1800) }}',
							},
							{
								key: 'Translation|rich_text',
								textContent:
									'=### HOOK ###\n{{ $json.response.translation_hook }}\n\n### CONTENT ###\n{{ $json.response.translation.substring(0, 1800) }}',
							},
							{
								key: 'Type|select',
								selectValue: '={{ $json.response.format }}',
							},
							{
								key: 'Category|select',
								selectValue: '={{ $json.response.category }}',
							},
						],
					},
				},
				credentials: {
					notionApi: { id: 'credential-id', name: 'notionApi Credential' },
				},
				position: [1800, 1360],
				name: 'Create',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.notion',
			version: 2.2,
			config: {
				parameters: {
					pageId: { __rl: true, mode: 'id', value: '={{ $json.notionPageId }}' },
					options: {},
					resource: 'databasePage',
					operation: 'update',
					propertiesUi: {
						propertyValues: [
							{
								key: 'Comments|number',
								numberValue: '={{ $json.Comments }}',
							},
							{ key: 'Likes|number', numberValue: '={{ $json.Likes }}' },
							{ key: 'Views|number', numberValue: '={{ $json.Views }}' },
						],
					},
				},
				credentials: {
					notionApi: { id: 'credential-id', name: 'notionApi Credential' },
				},
				position: [60, 1620],
				name: 'Update',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1.1,
			config: { parameters: { unit: 'minutes', amount: 1 }, position: [900, 760], name: 'Wait' },
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ triggerAtHour: 4 }] } },
				position: [-640, 440],
				name: 'Schedule Trigger',
			},
		}),
	)
	.add(
		sticky(
			"### 📺 How It Works – Watch the Video  \nI've recorded a video walkthrough to show you how the system works in detail.\n👉 [https://www.youtube.com/watch?v=rdfRNHpHX8o](https://www.youtube.com/watch?v=rdfRNHpHX8o)\n\n\n### 📄 Download Notion Database Structure  \nYou can download the Notion table structure (with all required columns and formats) here:  \n👉 [https://drive.google.com/file/d/1FVaS_-ztp6PDAJbETUb1dkg8IqE4qHqp/view?usp=sharing](https://drive.google.com/file/d/1FVaS_-ztp6PDAJbETUb1dkg8IqE4qHqp/view?usp=sharing)\n\n### ☕ Support the Project  \nIf you'd like to support my work, there's a version with tips available here:\n👉 [Coffee + Sandwich Version](https://gr.egrnkvch.com/l/InstagramReelsTrendWatcher)\n",
			{ color: 7, position: [-1320, -220], width: 520, height: 360 },
		),
	)
	.add(
		sticky(
			'## ⚙️ How to Install the Template\n\n1. **Create the databases in Notion.**  \n   Make sure to use the exact column names and formats as shown in the provided structure.\n\n2. **Import the workflow template into n8n.**\n\n3. **Add your Credentials:**\n   - **Notion**: Standard Notion integration  \n   - **Apify**: Create and connect your Apify API key\n\n4. **Gemini API is used via HTTP Request node.**  \n   Use the following settings:  \n   - `Authentication`: **Predefined Credential Type**  \n   - `Credential Type`: **Google Gemini (PaLM) API**  \n   - `Host`: `https://generativelanguage.googleapis.com`  \n   - API key: your personal Gemini API key\n\n5. **Assign these credentials** in the corresponding nodes inside the workflow.\n\n6. **Configure the Variables node** to set parsing parameters.  \n   Test the process with 3–5 accounts, each with 3–5 Reels.  \n   Once everything works, update the Variables with your full settings.\n',
			{ name: 'Sticky Note1', color: 7, position: [-740, -220], width: 520, height: 580 },
		),
	)
	.add(
		sticky(
			'### 📺 Video Guide\n👉 [https://www.youtube.com/watch?v=rdfRNHpHX8o](https://www.youtube.com/watch?v=rdfRNHpHX8o)\n\n@[youtube](rdfRNHpHX8o)',
			{ name: 'Sticky Note2', color: 7, position: [-1320, 200], width: 520, height: 140 },
		),
	)
	.add(
		sticky('Database = Sources', {
			name: 'Sticky Note3',
			position: [-240, 560],
			width: 180,
			height: 80,
		}),
	)
	.add(
		sticky('Database = Reels', {
			name: 'Sticky Note4',
			position: [1960, 420],
			width: 180,
			height: 80,
		}),
	)
	.add(
		sticky('Database = Reels', {
			name: 'Sticky Note5',
			position: [1780, 1260],
			width: 180,
			height: 80,
		}),
	)
	.add(
		sticky(
			'This is the prompt used to process video content and classify its category and type. Customize it based on your logic.',
			{ name: 'Sticky Note6', position: [1080, 1080], width: 300, height: 100 },
		),
	);
