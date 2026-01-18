const wf = workflow(
	'iicQhN2T4dTs1xcU',
	'💥 Convert YouTube videos to viral Shorts with Klap and auto-post with Blotato -VIDE',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.telegramTrigger',
			version: 1.2,
			config: {
				parameters: { updates: ['message'], additionalFields: {} },
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [-760, -100],
				name: 'Trigger: Receive YouTube URL via Telegram',
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
						"const message = $input.first().json.message.text;\nconst chatId = $input.first().json.message.chat.id;\n\n// Split by space to get URL and number\nconst parts = message.trim().split(/\\s+/);\n\n// Find the URL part\nconst urlPart = parts.find(part => part.includes('youtube.com') || part.includes('youtu.be'));\n\n// Find the number part\nconst numberPart = parts.find(part => /^\\d+$/.test(part));\n\nif (urlPart && numberPart) {\n	const number = parseInt(numberPart);\n\n	// Validate number range\n	if (number >= 1 && number <= 10) {\n		return [{\n			json: {\n				action: 'process',\n				'YouTube URL': urlPart,\n				'How many shorts to generate?': number,\n				chat_id: chatId\n			}\n		}];\n	} else {\n		return [{\n			json: {\n				action: 'invalid_number',\n				chat_id: chatId,\n				message: 'Please use a number between 1 and 10'\n			}\n		}];\n	}\n} else {\n	return [{\n		json: {\n			action: 'invalid_format',\n			chat_id: chatId,\n			message: `Send: YouTube_URL Number\\nExample:\\nhttps://youtu.be/abc123 5`\n		}\n	}];\n}\n",
				},
				position: [-580, -100],
				name: 'Extract YouTube URL & Number of Shorts',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.klap.app/v2/tasks/video-to-shorts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "source_video_url": "{{ $json[\'YouTube URL\'] }}",\n  "language": "en",\n  "target_clip_count": {{ $json[\'How many shorts to generate?\'] }},\n  "max_clip_count": {{ $json[\'How many shorts to generate?\'] }},\n  "editing_options": {\n    "captions": true,\n    "reframe": true,\n    "emojis": true,\n    "remove_silences": true,\n    "intro_title": true\n  },\n  "min_duration": 15,\n  "max_duration": 60,\n  "target_duration": 30\n} ',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: { parameters: [{ name: 'Authorization', value: 'YOUR_API' }] },
				},
				position: [-400, -100],
				name: 'Send Video to Klap for Shorts Generation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://api.klap.app/v2/tasks/{{ $json.id }}',
					options: {},
					sendHeaders: true,
					headerParameters: { parameters: [{ name: 'Authorization', value: 'YOUR_API' }] },
				},
				position: [-200, -100],
				name: 'Check Shorts Generation Status',
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
							url: '=https://api.klap.app/v2/projects/{{ $json.output_id }}',
							options: {},
							sendHeaders: true,
							headerParameters: { parameters: [{ name: 'Authorization', value: 'YOUR_API' }] },
						},
						position: [240, -100],
						name: 'List Generated Clip Ideas',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: {
						parameters: { amount: 60 },
						position: [240, 80],
						name: 'Wait Before Checking Status Again',
					},
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
								id: 'ffa318cf-7bdc-4ea5-bb02-ac69ae94a8c7',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.status }}',
								rightValue: 'ready',
							},
						],
					},
				},
				name: 'Is Video Processing Complete?',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://api.klap.app/v2/projects/{{ $('Check Shorts Generation Status').item.json.output_id }}/{{ $json.id }}/exports",
					method: 'POST',
					options: {},
					sendHeaders: true,
					headerParameters: { parameters: [{ name: 'Authorization', value: 'YOUR_API' }] },
				},
				position: [460, -100],
				name: 'Export HD Short from Klap',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://api.klap.app/v2/projects/{{ $('Check Shorts Generation Status').item.json.output_id }}/{{ $('List Generated Clip Ideas').item.json.id }}/exports/{{ $json.id }}",
					options: {},
					sendHeaders: true,
					headerParameters: { parameters: [{ name: 'Authorization', value: 'YOUR_API' }] },
				},
				position: [700, -100],
				name: 'Fetch Final Shorts URLs',
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
						"const allVideos = $input.all();\n\nconst totalExpected = allVideos.length;\nconst readyCount = allVideos.filter(v => v.json.status === 'ready').length;\n\n// Si tous les items sont présents et tous sont 'ready', alors true\nconst allReady = totalExpected > 0 && readyCount === totalExpected;\n\nreturn allVideos.map(video => ({\n  json: {\n    ...video.json,\n    is_everything_ready: allReady\n  }\n}));\n",
				},
				position: [980, -100],
				name: 'Are All Shorts Ready?',
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
							url: "=https://www.youtube.com/oembed?url={{ $('Extract YouTube URL & Number of Shorts').item.json['YouTube URL'] }}&format=json ",
							options: {},
						},
						position: [-760, 540],
						name: 'Fetch YouTube Video Title',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1.1,
					config: {
						parameters: { amount: 60 },
						position: [1200, 60],
						name: 'Wait Before Rechecking Final Shorts',
					},
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
								id: '4d35bf8e-906d-45dd-883e-570a91f06f41',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue: '={{ $json.is_everything_ready }}',
								rightValue: 'true',
							},
						],
					},
				},
				name: 'Ready to Schedule Shorts?',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: {},
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-500, 540],
				name: 'Load Publishing Schedule from Google Sheets',
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
						'let postsPerDay;\nlet startHour;\nlet endHour;\nfor (const item of items) {\nconst setting = item.json["Publishing Settings"];\nconst value = item.json["col_2"];\nif (setting === "Post per Day") {\npostsPerDay = parseInt(value, 10);\n} else if (setting === "Start Time") {\nstartHour = parseInt(value.split(":")[0], 10);\n} else if (setting === "End Time") {\nendHour = parseInt(value.split(":")[0], 10);\n}\n}\nreturn [\n{\njson: {\npostsPerDay,\nstartHour,\nendHour\n}\n}\n];',
				},
				position: [-240, 540],
				name: 'Extract Scheduling Parameters (Posts/Day, Hours)',
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
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [40, 540],
				name: 'Fetch Already Scheduled Shorts',
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
						"// Get existing scheduled posts\nconst existingPosts = $input.all();\n// Safe fallback: if the sheet is empty, use an empty object\nconst scheduleSettings = ($('Fetch Already Scheduled Shorts').first() || {\njson: {} }).json;\n// Find the latest scheduled time\nlet lastScheduledTime = new Date();\nif (existingPosts.length > 0) {\n// Get all scheduled times and find the latest\nconst scheduledTimes = existingPosts\n.map(post => new Date(post.json['Schedule Time']))\n.filter(date => !isNaN(date))\n.sort((a, b) => b - a); // Sort descending\nif (scheduledTimes.length > 0) {\nlastScheduledTime = scheduledTimes[0];\n}\n}\n// Pass this to the next node\nreturn [{\njson: {\nlastScheduledTime: lastScheduledTime.toISOString(),\npostsPerDay: scheduleSettings.postsPerDay,\nstartHour: scheduleSettings.startHour,\nendHour: scheduleSettings.endHour\n}\n}];",
				},
				position: [-760, 800],
				name: 'Determine Last Scheduled Time',
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
						"const postsPerDay = parseInt($('Extract Scheduling Parameters (Posts/Day, Hours)').first().json.postsPerDay);\nconst startHour = parseInt($('Extract Scheduling Parameters (Posts/Day, Hours)').first().json.startHour);\nconst endHour = parseInt($('Extract Scheduling Parameters (Posts/Day, Hours)').first().json.endHour);\nconst lastScheduledTime = new\nDate($input.first().json.lastScheduledTime);\n// Get video data\nconst videos = $('List Generated Clip Ideas').all();\nconst finalShorts = $('Fetch Final Shorts URLs').all();\nconst now = new Date();\nconst totalHours = endHour - startHour;\nconst intervalMs = (totalHours * 60 * 60 * 1000) / postsPerDay;\n// Start from the day after the last scheduled post\nlet startDate = new Date(lastScheduledTime);\nstartDate.setDate(startDate.getDate() + 1);\nstartDate.setHours(startHour, 0, 0, 0);\n// If starting date is in the past, use tomorrow\nif (startDate < now) {\nstartDate = new Date();\nstartDate.setDate(startDate.getDate() + 1);\nstartDate.setHours(startHour, 0, 0, 0);\n}\nconst result = [];\nlet videoIndex = 0;\nlet currentDate = new Date(startDate);\nlet dailyPostCount = 0;\nwhile (videoIndex < videos.length) {\n// Calculate time slot\nconst baseTime = new Date(currentDate);\nbaseTime.setHours(startHour + (dailyPostCount * (totalHours /\npostsPerDay)), 0, 0, 0);\n// Add randomness ±30 min\nconst offset = (Math.random() - 0.5) * 60 * 60 * 1000;\nconst scheduledTime = new Date(baseTime.getTime() + offset);\n// Get video data\nconst video = videos[videoIndex].json;\nconst finalShort = finalShorts[videoIndex].json;\nresult.push({\njson: {\nscheduled_at: scheduledTime.toISOString(),\nvideo_name: video.name,\nvideo_virality_score: video.virality_score,\nvideo_caption: video.publication_captions.youtube,\nvideo_tiktok_caption: video.publication_captions.tiktok,\nvideo_url: finalShort.src_url,\nvideo_id: video.id\n}\n});\nvideoIndex++;\ndailyPostCount++;\n// Move to next day if daily limit reached\nif (dailyPostCount >= postsPerDay) {\ncurrentDate.setDate(currentDate.getDate() + 1);\ndailyPostCount = 0;\n}\n}\nreturn result;",
				},
				position: [-500, 800],
				name: 'Calculate Publication Times for New Shorts',
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
						'return $input.all().map(item => {\nconst utc = item.json.scheduled_at;\nconst local = new Date(utc).toLocaleString("en-US", {\ntimeZone: "Europe/Paris",\ntimeZoneName: "short",\nhour12: false\n});\nreturn {\njson: {\n...item.json, // This includes all the video data\nlocal_time: local\n}\n};\n});',
				},
				position: [-240, 800],
				name: 'Convert Times to Local Timezone (Paris)',
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
							'Clip URL': '={{ $json.video_url }}',
							'Video URL':
								"={{ $('Extract YouTube URL & Number of Shorts').first().json['YouTube URL'] }}",
							'Video Title': "={{ $('Fetch YouTube Video Title').first().json.title }}",
							'Clip Caption': '={{ $json.video_tiktok_caption }}',
							'Schedule Time': '={{ $json.scheduled_at }}',
							'Video Clip Idea': '={{ $json.video_name }}',
							'Clip Virality Score': '={{ $json.video_virality_score }}',
							'Schedule Time (local)': '={{ $json.local_time }}',
						},
						schema: [
							{
								id: 'Video Title',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Video Title',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Video URL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Video URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Video Clip Idea',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Video Clip Idea',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Clip Virality Score',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Clip Virality Score',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Clip Caption',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Clip Caption',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Clip URL',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Clip URL',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Schedule Time',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Schedule Time',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'Schedule Time (local)',
								type: 'string',
								display: true,
								required: false,
								displayName: 'Schedule Time (local)',
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
					operation: 'append',
					sheetName: { __rl: true, mode: 'id', value: '=' },
					documentId: { __rl: true, mode: 'id', value: '=' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [40, 800],
				name: 'Log Shorts & Schedule Info to Google Sheets',
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
						'{\n  "instagram_id": "111",\n  "youtube_id": "222",\n  "tiktok_id": "333",\n  "facebook_id": "444",\n  "facebook_page_id": "555",\n  "threads_id": "666",\n  "twitter_id": "777",\n  "linkedin_id": "888",\n  "pinterest_id": "999",\n  "pinterest_board_id": "101010",\n  "bluesky_id": "111111"\n}',
				},
				position: [340, 680],
				name: 'Assign Social Media IDs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://backend.blotato.com/v2/media',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					bodyParameters: {
						parameters: [
							{
								name: 'url',
								value:
									"={{ $('Log Shorts & Schedule Info to Google Sheets').item.json['Clip URL'] }}",
							},
						],
					},
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API' }],
					},
				},
				position: [560, 680],
				name: 'Upload Video to Blotato',
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
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.instagram_id }}",\n    "target": {\n      "targetType": "instagram"\n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "instagram",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  },\n  "scheduledTime": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Schedule Time\'] }}"\n}\n\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'YOUR_API' }],
					},
				},
				position: [840, 420],
				name: 'INSTAGRAM',
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
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.youtube_id }}",\n    "target": {\n      "targetType": "youtube",\n      "title": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Video Title\'] }}",\n      "privacyStatus": "public",\n      "shouldNotifySubscribers": true,\n      "isMadeForKids": false\n    },\n    "content": {\n      "text": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Clip Caption\'] }}",\n      "platform": "youtube",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n},\n  "scheduledTime": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Schedule Time\'] }}"\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'your_API' }],
					},
				},
				position: [1060, 420],
				name: 'YOUTUBE',
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
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.tiktok_id }}",\n    "target": {\n      "targetType": "tiktok",\n      "isYourBrand": "false", \n      "disabledDuet": "false",\n      "privacyLevel": "PUBLIC_TO_EVERYONE",\n      "isAiGenerated": "true",\n      "disabledStitch": "false",\n      "disabledComments": "false",\n      "isBrandedContent": "false"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Clip Caption\'] }}",\n      "platform": "tiktok",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  },\n  "scheduledTime": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Schedule Time\'] }}"\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'your_api' }],
					},
				},
				position: [1260, 420],
				name: 'TIKTOK',
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
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.facebook_id }}",\n    "target": {\n      "targetType": "facebook",\n      "pageId": "{{ $(\'Assign Social Media IDs\').item.json.facebook_page_id }}"\n\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "facebook",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  },\n  "scheduledTime": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Schedule Time\'] }}"\n}',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'your_api' }],
					},
				},
				position: [840, 680],
				name: 'FACEBOOK',
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
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.threads_id }}",\n    "target": {\n      "targetType": "threads"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "threads",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  },\n  "scheduledTime": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Schedule Time\'] }}"\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'your_api' }],
					},
				},
				position: [1060, 680],
				name: 'THREADS',
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
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.twitter_id }}",\n    "target": {\n      "targetType": "twitter"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "twitter",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  },\n  "scheduledTime": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Schedule Time\'] }}"\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'your_api' }],
					},
				},
				position: [1260, 680],
				name: 'TWITTER',
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
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.linkedin_id }}",\n    "target": {\n      "targetType": "linkedin"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "linkedin",\n      "mediaUrls": [\n        "{{ $json.url }}"\n      ]\n    }\n  },\n  "scheduledTime": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Schedule Time\'] }}"\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'your_api' }],
					},
				},
				position: [840, 920],
				name: 'LINKEDIN',
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
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'= {\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.bluesky_id }}",\n    "target": {\n      "targetType": "bluesky"\n      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "bluesky",\n      "mediaUrls": [\n        "https://pbs.twimg.com/media/GE8MgIiWEAAfsK3.jpg"\n      ]\n    }\n  },\n  "scheduledTime": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Schedule Time\'] }}"\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'your_api' }],
					},
				},
				position: [1060, 920],
				name: 'BLUESKY',
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
					url: 'https://backend.blotato.com/v2/posts',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "post": {\n    "accountId": "{{ $(\'Assign Social Media IDs\').item.json.pinterest_id }}",\n    "target": {\n      "targetType": "pinterest",\n      "boardId": "{{ $(\'Assign Social Media IDs\').item.json.pinterest_board_id }}"      \n    },\n    "content": {\n      "text": "{{ $(\'Get my video\').item.json.DESCRIPTION }}",\n      "platform": "pinterest",\n      "mediaUrls": [\n        "https://pbs.twimg.com/media/GE8MgIiWEAAfsK3.jpg"\n      ]\n    }\n  },\n  "scheduledTime": "{{ $(\'Log Shorts & Schedule Info to Google Sheets\').item.json[\'Schedule Time\'] }}"\n}\n\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [{ name: 'blotato-api-key', value: 'your_api' }],
					},
				},
				position: [1260, 920],
				name: 'PINTEREST',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.telegram',
			version: 1.2,
			config: {
				parameters: {
					text: "=Your YouTube video \"{{ $('Fetch YouTube Video Title').first().json.title }}\"\nwas converted into {{ $('Extract YouTube URL & Number of Shorts').first().json['How many shorts to generate?'] }} shorts and scheduled for publication on Tiktok,\nInstagram, Facebook, LinkedIn, Twitter and YouTube at these\ntimes:\n{{ $('Convert Times to Local Timezone (Paris)').all().map(item =>\nitem.json.local_time).join('\\n') }}",
					chatId:
						"={{ $('Trigger: Receive YouTube URL via Telegram').first().json.message.chat.id }}",
					additionalFields: {},
				},
				credentials: {
					telegramApi: { id: 'credential-id', name: 'telegramApi Credential' },
				},
				position: [560, 420],
				name: 'Send Publication Summary to Telegram',
			},
		}),
	)
	.add(
		sticky('# ✅ Step 1 — Convert YouTube Video to Shorts\n', {
			position: [-840, -200],
			width: 2300,
			height: 500,
		}),
	)
	.add(
		sticky('# ✅ Step 2 — Schedule Shorts for Publication\n', {
			name: 'Sticky Note1',
			color: 3,
			position: [-840, 340],
			width: 1080,
			height: 760,
		}),
	)
	.add(
		sticky('# ✅ Step 3 — Publish Shorts to Social Media with Blotato\n', {
			name: 'Sticky Note2',
			color: 5,
			position: [280, 340],
			width: 1180,
			height: 760,
		}),
	);
