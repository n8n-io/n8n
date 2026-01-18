const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: { path: 'discord-pa', options: {}, httpMethod: 'POST' },
				position: [1020, -220],
				name: 'Webhook',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.discord',
			version: 2,
			config: {
				parameters: {
					guildId: { __rl: true, mode: 'id', value: '={{ $json.body.guild.id }}' },
					options: {},
					resource: 'message',
					channelId: {
						__rl: true,
						mode: 'id',
						value: '={{ $json.body.channel.id }}',
					},
					messageId: '={{ $json.body.message_id }}',
					operation: 'get',
					authentication: 'oAuth2',
				},
				credentials: {
					discordOAuth2Api: { id: 'credential-id', name: 'discordOAuth2Api Credential' },
				},
				position: [1240, -220],
				name: 'Get a message',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: '={{ $json.content }}',
					options: {
						systemMessage:
							"You are a personal AI assistant. You are connected to the following tools in MCP servers:\n- google calendar\n- google drive\n- gmail\n- x twitter\n- linkedin\n- utility tools like view current datetime, http request to search the web, download files and images\n\nAlways use the \"Format Date Time\" tool when the user's query involves scheduling, deadlines, time comparisons, or creating calendar events. Never assume today's date. Always ask user if you're unsure about anything, dont assume.\n\nYou will receive a discord message containing the text\n",
					},
					promptType: 'define',
				},
				position: [2280, -260],
				name: 'AI Agent1',
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
						'const maxLength = 2000;\nconst fullText = $input.first().json.output;\n\nconst messages = [];\nfor (let i = 0; i < fullText.length; i += maxLength) {\n  messages.push({ content: fullText.slice(i, i + maxLength) });\n}\n\nreturn messages;\n',
				},
				position: [3320, -260],
				name: 'Code',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.discord',
			version: 2,
			config: {
				parameters: {
					content: '={{ $json.content }}',
					guildId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Webhook').item.json.body.guild.id }}",
					},
					options: {
						message_reference: "={{ $('Webhook').item.json.body.message_id }}",
					},
					resource: 'message',
					channelId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('Webhook').item.json.body.channel.id }}",
					},
					authentication: 'oAuth2',
				},
				credentials: {
					discordOAuth2Api: { id: 'credential-id', name: 'discordOAuth2Api Credential' },
				},
				position: [3520, -260],
				name: 'Discord - reply meow',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: 'personal-calendar' },
				position: [1060, 200],
				name: 'Google Calendar MCP',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: 'personal-email' },
				position: [3000, 200],
				name: 'Google Mail MCP tools',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: 'utility-tools' },
				position: [1720, 200],
				name: 'utility tools',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: 'personal-linkedin' },
				position: [1060, 660],
				name: 'Linkedin MCP tools',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: 'personal-twitter' },
				position: [1600, 640],
				name: 'Twitter MCP',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: 'personal-google-drive' },
				position: [2420, 220],
				name: 'Google Drive MCP',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4o-mini',
						cachedResultName: 'gpt-4o-mini',
					},
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [1820, -60],
				name: 'OpenAI Chat Model1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleCalendarTool',
			version: 1.3,
			config: {
				parameters: {
					eventId:
						'={{ $fromAI("EVENT_ID", "id of the event that wants to be deleted", "string") }}',
					calendar: {
						__rl: true,
						mode: 'list',
						value: 'your@email.com',
						cachedResultName: 'your@email.com',
					},
					operation: 'update',
					updateFields: {
						end: '={{ $fromAI("end", "End of the event with date, time and local timezone ", "string") }}',
						start:
							'={{ $fromAI("start", "Start of the event with date, time and local timezone", "string") }}',
						summary: '={{ $fromAI("event_title", "The event title", "string") }}',
						description: '={{ $fromAI("event_description", "The event description", "string") }}',
					},
					descriptionType: 'manual',
					toolDescription:
						'Update the description, date, time and summary of an event in Google Calendar',
				},
				credentials: {
					googleCalendarOAuth2Api: {
						id: 'credential-id',
						name: 'googleCalendarOAuth2Api Credential',
					},
				},
				position: [1260, 400],
				name: 'UpdateEvent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleCalendarTool',
			version: 1.3,
			config: {
				parameters: {
					eventId:
						"={{ $fromAI('Event_ID', 'id of the event that wants to be deleted', 'string') }}",
					options: {},
					calendar: {
						__rl: true,
						mode: 'list',
						value: 'your@email.com',
						cachedResultName: 'your@email.com',
					},
					operation: 'delete',
				},
				credentials: {
					googleCalendarOAuth2Api: {
						id: 'credential-id',
						name: 'googleCalendarOAuth2Api Credential',
					},
				},
				position: [1380, 400],
				name: 'DeleteEvent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.linkedInTool',
			version: 1,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Text', `text of the linkedin post`, 'string') }}",
					person: 'e06nLqZHQo',
					descriptionType: 'manual',
					toolDescription: 'Create a post using an image in LinkedIn',
					additionalFields: {
						title:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Title', `title of the linkedin post`, 'string') }}",
					},
					shareMediaCategory: 'IMAGE',
				},
				credentials: {
					linkedInOAuth2Api: { id: 'credential-id', name: 'linkedInOAuth2Api Credential' },
				},
				position: [1040, 860],
				name: 'post image on personal linkedin',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					filters: {},
					operation: 'getAll',
					descriptionType: 'manual',
					toolDescription: 'Get recent email messages in Gmail',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [2980, 420],
				name: 'Get many messages in Gmail',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.twitterTool',
			version: 2,
			config: {
				parameters: {
					user: {
						__rl: true,
						mode: 'username',
						value: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('User', ``, 'string') }}",
					},
					resource: 'user',
					descriptionType: 'manual',
					toolDescription: 'Search for a user based on their username in x twitter',
				},
				credentials: {
					twitterOAuth2Api: { id: 'credential-id', name: 'twitterOAuth2Api Credential' },
				},
				position: [1640, 840],
				name: 'search for a User in X',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.mcpClientTool',
			version: 1,
			config: {
				parameters: {
					sseEndpoint: 'https://n8n.yourdomain.com/mcp/personal-calendar/sse',
				},
				position: [2160, -60],
				name: 'Personal calendar',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.mcpClientTool',
			version: 1,
			config: {
				parameters: {
					sseEndpoint: 'https://n8n.yourdomain.com/mcp/personal-email/sse',
				},
				position: [2360, -60],
				name: 'personal email',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.mcpClientTool',
			version: 1,
			config: {
				parameters: {
					sseEndpoint: 'https://n8n.yourdomain.com/mcp/personal-linkedin/sse',
				},
				position: [2540, -60],
				name: 'personal linkedin',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.mcpClientTool',
			version: 1,
			config: {
				parameters: {
					sseEndpoint: 'https://n8n.yourdomain.com/mcp/personal-twitter/sse',
				},
				position: [2720, -60],
				name: 'personal twitter',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryMongoDbChat',
			version: 1,
			config: {
				parameters: {
					sessionKey: "={{ $('Webhook').item.json.body.channel.id }}",
					sessionIdType: 'customKey',
				},
				credentials: {
					mongoDb: { id: 'credential-id', name: 'mongoDb Credential' },
				},
				position: [2000, -60],
				name: 'MongoDB Chat Memory',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('URL', `url to search the web, download an image or download a document`, 'string') }}",
					options: {},
					toolDescription: 'Makes an HTTP request to browse a URL and returns the response data. ',
				},
				position: [1920, 420],
				name: 'HTTP Request',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.mcpClientTool',
			version: 1,
			config: {
				parameters: {
					sseEndpoint: 'https://n8n.yourdomain.com/mcp/utility-tools/sse',
				},
				position: [2880, -60],
				name: 'utility tools1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDriveTool',
			version: 3,
			config: {
				parameters: {
					filter: {},
					options: {},
					resource: 'fileFolder',
					queryString:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Search_Query', `name of the folder or file to search for`, 'string') }}",
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2300, 820],
				name: 'Search files and folders in Google Drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.twitterTool',
			version: 2,
			config: {
				parameters: {
					limit: 20,
					operation: 'search',
					searchText:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Search_Term', `search keyword to search twitter`, 'string') }}",
					descriptionType: 'manual',
					toolDescription: 'Search for a keywords in twitter',
					additionalFields: {},
				},
				credentials: {
					twitterOAuth2Api: { id: 'credential-id', name: 'twitterOAuth2Api Credential' },
				},
				position: [1920, 840],
				name: 'search keyword in twitter',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.toolCode',
			version: 1.3,
			config: {
				parameters: {
					jsCode:
						'return {json: {\n  "id": "1164082728121204736",\n  "name": "Jayant harilela",\n  "username": "JHarilela"\n}}',
					description:
						"Call this tool to get the current user's @jharilela twitter account details",
				},
				position: [2060, 680],
				name: 'Code Tool',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.twitterTool',
			version: 2,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Text', `text message to send to a user`, 'string') }}",
					user: {
						__rl: true,
						mode: 'username',
						value:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('User', `the username that we want to DM`, 'string') }}",
					},
					resource: 'directMessage',
					descriptionType: 'manual',
					toolDescription: 'Send a DM (Direct Message) to a username on twitter x',
					additionalFields: {},
				},
				credentials: {
					twitterOAuth2Api: { id: 'credential-id', name: 'twitterOAuth2Api Credential' },
				},
				position: [1780, 840],
				name: 'send a DM',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.twitterTool',
			version: 2,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Text', `text content of the tweet that you want to post`, 'string') }}",
					additionalFields: {},
				},
				credentials: {
					twitterOAuth2Api: { id: 'credential-id', name: 'twitterOAuth2Api Credential' },
				},
				position: [2060, 840],
				name: 'Create Tweet in X',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.linkedInTool',
			version: 1,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Text', `main text of the linkedin article post`, 'string') }}",
					person: 'e06nLqZHQo',
					descriptionType: 'manual',
					toolDescription: 'Create a text only post in Linkedin',
					additionalFields: {},
				},
				credentials: {
					linkedInOAuth2Api: { id: 'credential-id', name: 'linkedInOAuth2Api Credential' },
				},
				position: [1380, 860],
				name: 'post text on linkedin',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.linkedInTool',
			version: 1,
			config: {
				parameters: {
					text: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Text', `main text of the linkedin article post`, 'string') }}",
					person: 'e06nLqZHQo',
					descriptionType: 'manual',
					toolDescription: 'Create a post referring to an external article via url in LinkedIn',
					additionalFields: {
						title:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Title', `main title of the linkedin article post`, 'string') }}",
						description:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Description', `main description of the linkedin article post`, 'string') }}",
						originalUrl:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Original_URL', `original article of the linkedin article post`, 'string') }}",
					},
					shareMediaCategory: 'ARTICLE',
				},
				credentials: {
					linkedInOAuth2Api: { id: 'credential-id', name: 'linkedInOAuth2Api Credential' },
				},
				position: [1220, 860],
				name: 'post article with url on linkedin',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.toolThink',
			version: 1,
			config: { position: [3200, -60], name: 'Think' },
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDriveTool',
			version: 3,
			config: {
				parameters: {
					name: '={{ $fromAI("file_name", "The name of the file", "string") }}',
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'id',
						value:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Parent_Folder', `folder of the uploaded file, use 'root' by default unless mentioned otherwise`, 'string') }}",
					},
					descriptionType: 'manual',
					toolDescription: 'Upload file in Google Drive',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2320, 420],
				name: 'Upload file in Google Drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDriveTool',
			version: 3,
			config: {
				parameters: {
					fileId: {
						__rl: true,
						mode: 'id',
						value:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('File', `file id that wants to be shared`, 'string') }}",
					},
					options: {},
					operation: 'share',
					permissionsUi: {
						permissionsValues: {
							role: 'reader',
							type: 'user',
							emailAddress:
								"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Email_Address', `email of the user who we want to share a read only access to the file`, 'string') }}",
						},
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2500, 420],
				name: 'Share file in Google Drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDriveTool',
			version: 3,
			config: {
				parameters: {
					fileId: {
						__rl: true,
						mode: 'id',
						value:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('File', `file id of the document that we want to move`, 'string') }}",
					},
					driveId: {
						__rl: true,
						mode: 'id',
						value:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Parent_Drive', `parent drive id of the destination where we want to move the folder to`, 'string') }}",
					},
					folderId: {
						__rl: true,
						mode: 'id',
						value:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Parent_Folder', `parent folder id of the destination where we want to move the folder to`, 'string') }}",
					},
					operation: 'move',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2680, 420],
				name: 'Move file in Google Drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDriveTool',
			version: 3,
			config: {
				parameters: {
					fileId: {
						__rl: true,
						mode: 'id',
						value:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('File', `id of the file that wants to be downloaded`, 'string') }}",
					},
					options: {},
					operation: 'download',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2320, 620],
				name: 'Download file in Google Drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDriveTool',
			version: 3,
			config: {
				parameters: {
					name: '={{ $fromAI("folder_name", "Name of the folder that wants to be created", "string") }}',
					driveId: { __rl: true, mode: 'list', value: 'My Drive' },
					options: {},
					folderId: {
						__rl: true,
						mode: 'list',
						value: 'root',
						cachedResultName: '/ (Root folder)',
					},
					resource: 'folder',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2520, 620],
				name: 'Create folder in Google Drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDriveTool',
			version: 3,
			config: {
				parameters: {
					options: {},
					resource: 'folder',
					operation: 'share',
					permissionsUi: {
						permissionsValues: {
							role: 'reader',
							type: 'user',
							emailAddress:
								"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Email_Address', `email of the person that we want to share the google drive folder to`, 'string') }}",
						},
					},
					folderNoRootId: {
						__rl: true,
						mode: 'id',
						value:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Folder', `id of the folder that wants to be shared`, 'string') }}",
					},
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2700, 620],
				name: 'Share folder in Google Drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDriveTool',
			version: 3,
			config: {
				parameters: {
					driveId: { __rl: true, mode: 'list', value: '0ANDMDFgYA6nqUk9PVA' },
					options: {},
					resource: 'drive',
					operation: 'get',
					descriptionType: 'manual',
					toolDescription: 'Get shared drive in Google Drive',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2520, 820],
				name: 'Get shared drive in Google Drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleDriveTool',
			version: 3,
			config: {
				parameters: {
					limit: 10,
					options: {},
					resource: 'drive',
					operation: 'list',
					descriptionType: 'manual',
					toolDescription: 'Get a list of shared drives in Google Drive',
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [2700, 820],
				name: 'Get many shared drives in Google Drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					message:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Message', `reply message that we want to send`, 'string') }}",
					options: {},
					emailType: 'text',
					messageId:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Message_ID', `message id that we want to reply to `, 'string') }}",
					operation: 'reply',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [3360, 420],
				name: 'Reply to a message in Gmail',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					limit: 20,
					options: {},
					resource: 'draft',
					operation: 'getAll',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [2960, 840],
				name: 'Get many drafts in Gmail',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					options: {},
					resource: 'draft',
					messageId:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Draft_ID', `draft id of a gmail message`, 'string') }}",
					operation: 'get',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [3160, 840],
				name: 'Get a draft in Gmail',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					message:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Message', `text content of the email draft`, 'string') }}",
					options: {
						ccList:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('CC', `cc email address`, 'string') }}",
						sendTo:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('To_Email', `recipient email address`, 'string') }}",
					},
					subject:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Subject', `subject of the email draft`, 'string') }}",
					resource: 'draft',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [3360, 840],
				name: 'Create a draft in Gmail',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					limit: 20,
					filters: {
						q: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Search', `gmail search operator. To search email from a certain sender, start with from: . To search emails with a certain subject, start with subject:`, 'string') }}",
					},
					resource: 'thread',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [3160, 420],
				name: 'Get many threads in Gmail',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					options: {},
					resource: 'thread',
					threadId:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Thread_ID', `thread id of ta gmail message or conversation history`, 'string') }}",
					operation: 'get',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [2960, 640],
				name: 'Get a thread in Gmail',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: { resource: 'label' },
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [3160, 640],
				name: 'Get many labels in Gmail',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					sendTo:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('To', `recipient email address`, 'string') }}",
					message:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Message', `email message content to be sent`, 'string') }}",
					options: {
						ccList:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('CC', `cc email addresses (optional)`, 'string') }}",
						appendAttribution: false,
					},
					subject:
						"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Subject', `subject of the email to send`, 'string') }}",
					emailType: 'text',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [3540, 640],
				name: 'Send a message in Gmail',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.mcpClientTool',
			version: 1,
			config: {
				parameters: {
					sseEndpoint: 'https://n8n.yourdomain.com/mcp/personal-google-drive/sse',
				},
				position: [3040, -60],
				name: 'google drive',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					filters: {
						q: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Search', `gmail search operator. To search for subject with certain keywords, use the operator Subject: `, 'string') }}",
						sender: 'your@email.com',
					},
					operation: 'getAll',
					descriptionType: 'manual',
					toolDescription: 'Search for emails ive sent',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [3540, 420],
				name: 'search sent emails',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					filters: { sender: 'your@email.com' },
					operation: 'getAll',
					descriptionType: 'manual',
					toolDescription: 'Get recent emails ive sent',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [3360, 640],
				name: 'Get emails sent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.gmailTool',
			version: 2.1,
			config: {
				parameters: {
					filters: {
						q: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Search', `keywords in the subject that we are searching for. Use google search operator. To search for keywords in the subject, start with Subject: `, 'string') }}",
					},
					operation: 'getAll',
					descriptionType: 'manual',
					toolDescription: 'Search emails received',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [3540, 840],
				name: 'search emails received',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleCalendarTool',
			version: 1.3,
			config: {
				parameters: {
					limit: '=50',
					options: {},
					timeMax:
						'={{ $fromAI("before", "Search events before date, time and local timezone", "string") }}',
					timeMin:
						'={{ $fromAI("after", "Search events after date, time and local timezone ", "string") }}',
					calendar: {
						__rl: true,
						mode: 'list',
						value: 'your@email.com',
						cachedResultName: 'your@email.com',
					},
					operation: 'getAll',
				},
				credentials: {
					googleCalendarOAuth2Api: {
						id: 'credential-id',
						name: 'googleCalendarOAuth2Api Credential',
					},
				},
				position: [980, 420],
				name: 'SearchEvent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleCalendarTool',
			version: 1.3,
			config: {
				parameters: {
					end: '={{ $fromAI("end", "Event End date, time and local timezone", "string") }}',
					start: '={{ $fromAI("start", "Event Start date, time and local timezone", "string") }}',
					calendar: {
						__rl: true,
						mode: 'list',
						value: 'your@email.com',
						cachedResultName: 'your@email.com',
					},
					additionalFields: {
						summary: '={{ $fromAI("event_title", "The event title", "string") }}',
						attendees: [],
						description: '={{ $fromAI("event_description", "The event description", "string") }}',
					},
				},
				credentials: {
					googleCalendarOAuth2Api: {
						id: 'credential-id',
						name: 'googleCalendarOAuth2Api Credential',
					},
				},
				position: [1120, 420],
				name: 'CreateEvent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleCalendarTool',
			version: 1.3,
			config: {
				parameters: {
					eventId:
						'={{ $fromAI("EVENT_ID", "id of the event that wants to be deleted", "string") }}',
					calendar: {
						__rl: true,
						mode: 'list',
						value: 'your@email.com',
						cachedResultName: 'your@email.com',
					},
					operation: 'update',
					updateFields: {
						attendeesUi: {
							values: {
								attendees: [
									"={{ $fromAI('attendees0_Attendees', 'email addresses of the people that needs to be invited to the event', 'string') }}",
								],
							},
						},
					},
					descriptionType: 'manual',
					toolDescription: 'Add attendees to an event',
				},
				credentials: {
					googleCalendarOAuth2Api: {
						id: 'credential-id',
						name: 'googleCalendarOAuth2Api Credential',
					},
				},
				position: [1400, 220],
				name: 'addAttendeesToEvent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.dateTimeTool',
			version: 2,
			config: {
				parameters: {
					date: '={{ $fromAI("date", "date string that wants to be formated", "string") }}',
					format: 'custom',
					options: {},
					operation: 'formatDate',
					customFormat: "yyyy-MM-dd'T'HH:mm:ss.SSSZZ",
					descriptionType: 'manual',
					toolDescription: "Format date to yyyy-MM-dd'T'HH:mm:ss.SSSZZ",
				},
				position: [1780, 420],
				name: 'Format Date Time',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.dateTimeTool',
			version: 2,
			config: {
				parameters: {
					options: {},
					descriptionType: 'manual',
					toolDescription: 'get current date and time',
				},
				position: [1620, 420],
				name: 'get current date time',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: "={{ $fromAI('URL', `url to search the web, download an image or download a document`, 'string') }}",
					options: { response: { response: { responseFormat: 'file' } } },
					toolDescription: 'Download a file or image from a URL',
				},
				position: [2060, 420],
				name: 'HTTP Download a file or image',
			},
		}),
	)
	.add(
		sticky('## Google Calendar MCP tools', {
			name: 'Sticky Note4',
			color: 5,
			position: [920, 120],
			width: 620,
			height: 440,
		}),
	)
	.add(
		sticky('## Google Mail MCP tools', {
			color: 5,
			position: [2900, 120],
			width: 900,
			height: 900,
		}),
	)
	.add(
		sticky('## Linkedin MCP tools', {
			name: 'Sticky Note1',
			color: 5,
			position: [920, 580],
			width: 620,
			height: 440,
		}),
	)
	.add(
		sticky('## Twitter MCP', {
			name: 'Sticky Note2',
			color: 5,
			position: [1580, 580],
			width: 620,
			height: 440,
		}),
	)
	.add(
		sticky('## utility tools', {
			name: 'Sticky Note3',
			color: 5,
			position: [1580, 120],
			width: 620,
			height: 440,
		}),
	)
	.add(
		sticky('## Google Drive MCP', {
			name: 'Sticky Note5',
			color: 5,
			position: [2240, 120],
			width: 620,
			height: 900,
		}),
	)
	.add(
		sticky('', { name: 'Sticky Note6', color: 4, position: [920, -340], width: 2880, height: 440 }),
	);
