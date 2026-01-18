const wf = workflow('XVI3nC7HVl7JU6C5', 'Youtube - Get Video Comments', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-2140, 500], name: 'Test Workflow' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					options: {},
					filtersUI: { values: [{ lookupValue: 'ready', lookupColumn: 'status' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 426418282,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y/edit#gid=426418282',
						cachedResultName: 'Video URLs',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y/edit?usp=drivesdk',
						cachedResultName: 'YouTube - Crawl Video Comments',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-1960, 500],
				name: 'Google Sheets - Get Video URLs',
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
							typeValidation: 'loose',
						},
						combinator: 'and',
						conditions: [
							{
								id: '8bf50878-b1b3-45dd-9639-98238fcef579',
								operator: { type: 'string', operation: 'notEmpty', singleValue: true },
								leftValue: '={{ $json.video_url }}',
								rightValue: '',
							},
						],
					},
					looseTypeValidation: true,
				},
				position: [-1800, 500],
				name: 'If - Check Video Url is Not Empty',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: { parameters: { options: {} }, position: [-1440, 480], name: 'Loop Over Items' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://www.googleapis.com/youtube/v3/commentThreads',
					options: {
						response: { response: { fullResponse: true, responseFormat: 'json' } },
						pagination: {
							pagination: {
								parameters: {
									parameters: [
										{
											name: 'pageToken',
											value: '={{ $response.body.nextPageToken }}',
										},
									],
								},
								completeExpression: '={{ !$response.body.nextPageToken}}',
								paginationCompleteWhen: 'other',
							},
						},
					},
					sendQuery: true,
					authentication: 'predefinedCredentialType',
					queryParameters: {
						parameters: [
							{ name: 'part', value: 'snippet' },
							{
								name: 'videoId',
								value: "={{ $json.video_url.match(/(?:v=|\\/)([0-9A-Za-z_-]{11})/)[1] || ''}}",
							},
							{ name: 'limit', value: '100' },
						],
					},
					nodeCredentialType: 'youTubeOAuth2Api',
				},
				credentials: {
					youTubeOAuth2Api: { id: 'credential-id', name: 'youTubeOAuth2Api Credential' },
				},
				position: [-1220, 500],
				name: 'HTTP Request - Get Comments',
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
								id: 'bce76f94-5904-4fdb-b172-adc1134855f9',
								operator: { type: 'number', operation: 'equals' },
								leftValue: '={{ $json.statusCode }}',
								rightValue: 200,
							},
						],
					},
				},
				position: [-840, 500],
				name: 'If - Check Success Response',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'body.items' },
				position: [-620, 340],
				name: 'Split Out',
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
								id: 'e4d47098-097d-4fd7-9703-638858f9565a',
								operator: { type: 'string', operation: 'exists', singleValue: true },
								leftValue: '={{ $json.snippet.videoId }}',
								rightValue: '',
							},
						],
					},
				},
				position: [-420, 340],
				name: 'If - Check Comment Exists',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							likes: '={{ $json.snippet.topLevelComment.snippet.likeCount }}',
							reply: '={{ $json.snippet.totalReplyCount }}',
							comment: '={{ $json.snippet.topLevelComment.snippet.textOriginal }}',
							video_url: '=https://www.youtube.com/watch?v={{ $json.snippet.videoId }}',
							comment_id: '={{ $json.snippet.topLevelComment.id }}',
							author_name: '={{ $json.snippet.topLevelComment.snippet.authorDisplayName }}',
							published_at:
								"={{ $json.snippet.topLevelComment.snippet.publishedAt.toString().slice(0, 19).replace('T', ' ') }}",
						},
						schema: [
							{
								id: 'video_url',
								type: 'string',
								display: true,
								required: false,
								displayName: 'video_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'comment_id',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'comment_id',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'comment',
								type: 'string',
								display: true,
								required: false,
								displayName: 'comment',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'author_name',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'author_name',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'likes',
								type: 'string',
								display: true,
								required: false,
								displayName: 'likes',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'reply',
								type: 'string',
								display: true,
								required: false,
								displayName: 'reply',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'published_at',
								type: 'string',
								display: true,
								required: false,
								displayName: 'published_at',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['comment_id'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
					options: {},
					operation: 'appendOrUpdate',
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18-3CmJPbC73MycmNiSWotdsyGBAAzqESf33vktwnYmM/edit#gid=0',
						cachedResultName: 'Results ',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y/edit?usp=drivesdk',
						cachedResultName: 'YouTube - Crawl Video Comments',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [140, 340],
				name: 'Google Sheets - Insert/Update Comment',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.5,
			config: {
				parameters: {
					columns: {
						value: {
							status: 'finish',
							row_number: "={{ $('Google Sheets - Get Video URLs').item.json.row_number }}",
							last_fetched_time: "={{ $now.toISO().toString().slice(0, 19).replace('T', ' ') }}",
						},
						schema: [
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
								id: 'video_url',
								type: 'string',
								display: true,
								removed: true,
								required: false,
								displayName: 'video_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'last_fetched_time',
								type: 'string',
								display: true,
								required: false,
								displayName: 'last_fetched_time',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
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
						value: 426418282,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18-3CmJPbC73MycmNiSWotdsyGBAAzqESf33vktwnYmM/edit#gid=426418282',
						cachedResultName: 'Video URLs',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y/edit?usp=drivesdk',
						cachedResultName: 'YouTube - Crawl Video Comments',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [340, 480],
				name: 'Google Sheets - Update Status',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					columns: {
						value: {
							status: 'error',
							row_number: "={{ $('Google Sheets - Get Video URLs').item.json.row_number }}",
							last_fetched_time: "={{ $now.toISO().toString().slice(0, 19).replace('T', ' ') }}",
						},
						schema: [
							{
								id: 'status',
								type: 'string',
								display: true,
								required: false,
								displayName: 'status',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'video_url',
								type: 'string',
								display: true,
								required: false,
								displayName: 'video_url',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'last_fetched_time',
								type: 'string',
								display: true,
								required: false,
								displayName: 'last_fetched_time',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'row_number',
								type: 'string',
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
						value: 426418282,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y/edit#gid=426418282',
						cachedResultName: 'Video URLs',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y/edit?usp=drivesdk',
						cachedResultName: 'YouTube - Get Video Comments',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [140, 580],
				name: 'Google Sheets - Update Status - Error',
			},
		}),
	)
	.add(
		sticky(
			"## [Agent Circle's N8N Workflow] YouTube Video Comment Crawler - Try It Out!\n\n**This n8n template demonstrates how to use the tool to crawl comments from a YouTube video and simply get all the results in a linked Google Sheet.**\n\nUse cases are many: Whether you're **a YouTube creator** trying to understand your audience, **a marketer** running sample analysis, **a data analyst** compiling engagement metrics, or part of **a growth team** tracking YouTube or social media campaign performance, this workflow helps you extract real, actionable insights from YouTube video comments at scale.\n\n## How It Works\n- The workflow starts when you manually click **Test Workflow** or **Execute Workflow** in N8N.\n- It reads the list of YouTube video URLs from the **Video URLs** tab in the connected **YouTube – Get Video Comments** Google Sheet. Only the URLs marked with the **Ready** status will be processed.\n- The tool loops through each video and sends an HTTP request to the YouTube API to fetch comment data.\n- Then, it checks whether the request is successful before continuing.\n- If comments are found, they are split and processed.\n- Each comment is then inserted in the **Results** tab of the connected **YouTube – Get Video Comments** Google Sheet.\n- Once a URL has been finished, its status in the **Video URLs** tab of the **YouTube – Get Video Comments** Google Sheet is updated to **Finished**. \n\n## How To Use\n- Download the workflow package. \n- Import the workflow package into your N8N interface.\n- Duplicate the [**YouTube - Get Video Comments** Google Sheet template](https://docs.google.com/spreadsheets/d/1F5yEhjBWu3fnwgHGLsPLD9_tWRqUnxu4p0DEvUTae1Y/edit?gid=426418282#gid=426418282) into your Google Sheets account.\n- Set up **Google Cloud Console** credentials in the following nodes in N8N, ensuring enabled access and suitable rights to Google Sheets and YouTube services:\n    + For Google Sheets access, ensure each node is properly connected to the correct tab in your connected Google Sheet template: \n         Node **Google Sheets - Get Video URLs** → connected to the **Video URLs** tab; \n         Node **Google Sheets - Insert/Update Comment** → connected to the **Results** tab; \n         Node **Google Sheets - Update Status** connected to the **Video URLs** tab.\n    + For YouTube access: Set up a GET method in Node **HTTP Request - Get Comments**.\n- Open the template in your Google Sheets account. In the tab **Video URLs**, fill in the video URLs you want to crawl in **Column B** and update the status for each row in **Column A** to **Ready**.\n- Return to the N8N interface and click **Execute Workflow**.\n- Check the results in the **Results** tab of the template - the collected comments will appear there.\n\n## Requirements\n- Basic setup in Google Cloud Console (OAuth or API Key method enabled) with enabled access to YouTube and Google Sheets.\n\n## How To Customize\n- By default, the workflow is manually triggered in N8N. However, you can automate the process by adding a Google Sheets trigger that monitors new entries in your connected **YouTube – Get Video Comments** template and starts the workflow automatically.\n\n## Need Help?\nJoin our community on different platforms for support, inspiration and tips from others.\n\nWebsite: https://www.agentcircle.ai/\nEtsy: https://www.etsy.com/shop/AgentCircle\nGumroad: http://agentcircle.gumroad.com/\nDiscord Global: https://discord.gg/d8SkCzKwnP\nFB Page Global: https://www.facebook.com/agentcircle/\nFB Group Global: https://www.facebook.com/groups/aiagentcircle/\nX: https://x.com/agent_circle\nYouTube: https://www.youtube.com/@agentcircle\nLinkedIn: https://www.linkedin.com/company/agentcircle",
			{ position: [-3080, -140], width: 700, height: 1420 },
		),
	)
	.add(
		sticky(
			'## 1. Read Video URLs From Connected Google Sheet\n\n- We’ll start by pulling a list of YouTube video URLs from your connected Google Sheet. Only the rows where the status is set to **Ready** will be picked up for processing. \n- Our tool only runs on rows where both the video URL and the **Ready** status have been properly filled in.\n',
			{ name: 'Sticky Note1', color: 7, position: [-2180, 120], width: 580, height: 720 },
		),
	)
	.add(
		sticky(
			'## 2. Fetch Comments Via YouTube API\n\n- Each video URL is passed through a request to the YouTube API in a loop.\n- You just need to make sure your YouTube API key is correctly set in the **HTTP Request - Get Comments** node.',
			{ name: 'Sticky Note2', color: 7, position: [-1500, 120], width: 480, height: 720 },
		),
	)
	.add(
		sticky(
			'## 3. Validate Response And Split Comments\n\n- Once the workflow receives a response from the YouTube API, it first checks if the request was successful.\n- If everything looks good, it splits the returned comment data into individual entries. This makes it easier to process and save them one by one.\n- Each comment is then checked to ensure it’s valid and not empty before continuing to the next step.\n\n',
			{ name: 'Sticky Note3', color: 7, position: [-920, 100], width: 860, height: 720 },
		),
	)
	.add(
		sticky(
			'## 4. Save Comments And Update URL Status In Google Sheets\n\n- All collected comments are inserted into the **Results** tab in your connected Google Sheet.\n- After each video is processed, its original row is marked as **Finished** automatically to prevent it from being reprocessed.\n- Then, the tool moves on to the next available video, if one exists.',
			{ name: 'Sticky Note4', color: 7, position: [40, 100], width: 480, height: 720 },
		),
	);
