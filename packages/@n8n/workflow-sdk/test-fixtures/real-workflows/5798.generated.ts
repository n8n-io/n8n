const wf = workflow(
	'zjl4xwZIDr6Ks1Zv',
	'Turn YouTube Transcripts into Newsletter Drafts using Dumpling AI + GPT-4o',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-80, -20], name: ' Manual Trigger: Start Workflow' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					options: { returnFirstMatch: true },
					filtersUI: { values: [{ lookupColumn: 'blog post' }] },
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 'gid=0',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/182LztuSnqcPeYLtUOIG4LjDs2Nj7sDYS-sjMY90O3PM/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/182LztuSnqcPeYLtUOIG4LjDs2Nj7sDYS-sjMY90O3PM/edit?usp=drivesdk',
						cachedResultName: 'Youtube',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [140, -20],
				name: 'Read YouTube Links from Google Sheets',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: { reset: false } },
				position: [360, -20],
				name: 'Loop: Process Each YouTube Link',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message:
						'=Hello,  \nThe newsletter based on the latest YouTube transcript has just been created successfully. You can now review, edit, or schedule it for distribution.  Please check the draft and let me know if anything needs to be adjusted before it goes live.',
					options: {},
					subject: 'Newsletter Draft Created from YouTube Transcript',
					emailType: 'text',
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [580, -220],
				name: ' Send Email Notification When Draft is Ready',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://app.dumplingai.com/api/v1/get-youtube-transcript',
					method: 'POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [{ name: 'videoUrl', value: '={{ $json.link }}' }],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [580, -20],
				name: ' Dumpling AI: Get YouTube Transcript',
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
						value: 'chatgpt-4o-latest',
						cachedResultName: 'CHATGPT-4O-LATEST',
					},
					options: {},
					messages: {
						values: [
							{
								role: 'system',
								content:
									'"Here is a transcript from a YouTube video. Please write a clear and engaging newsletter based on this transcript. Summarize the key ideas, insights, and tips shared in the video. Start with a short and catchy introduction that grabs attention. Structure the body of the newsletter with short, readable paragraphs that highlight the most valuable points. End with a simple call to action related to the video topic. Keep the tone friendly and professional, and make sure the content flows naturally for email readers. Do not include time stamps or speaker labels from the transcript. Focus on clarity and value."\n\nLet me know if you\'d like the prompt tailored to a specific audience or niche.',
							},
							{ content: '=Transcript: {{ $json.transcript }}' },
						],
					},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [800, -20],
				name: 'GPT-4o: Write Newsletter Draft from Transcript',
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
							link: "={{ $('Read YouTube Links from Google Sheets').item.json.link }}",
							'blog post': '={{ $json.message.content }}',
						},
						schema: [
							{
								id: 'link',
								type: 'string',
								display: true,
								removed: false,
								required: false,
								displayName: 'link',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
							{
								id: 'blog post',
								type: 'string',
								display: true,
								required: false,
								displayName: 'blog post',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['link'],
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
							'https://docs.google.com/spreadsheets/d/182LztuSnqcPeYLtUOIG4LjDs2Nj7sDYS-sjMY90O3PM/edit#gid=0',
						cachedResultName: 'Sheet1',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/182LztuSnqcPeYLtUOIG4LjDs2Nj7sDYS-sjMY90O3PM/edit?usp=drivesdk',
						cachedResultName: 'Youtube',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [1176, 55],
				name: 'Log Newsletter Draft to Google Sheets',
			},
		}),
	)
	.add(
		sticky(
			'### 📨 YouTube → Newsletter Automation\n\nThis workflow turns YouTube videos into newsletter drafts using Dumpling AI and GPT-4o.\n\n**Here’s what it does:**\n1. Reads new YouTube video links from Google Sheets\n2. Fetches the transcript of each video via Dumpling AI\n3. Uses GPT-4o to generate a well-structured, email-friendly newsletter draft\n4. Saves the draft back to Google Sheets next to the original video link\n5. Sends an email notification when the newsletter is ready\n\n🛠️ Tools Used:\n- Dumpling AI (transcript)\n- GPT-4o (newsletter copy)\n- Google Sheets (input + output)\n- Gmail (notification)\n\n✅ Make sure your credentials are securely configured for:\n- Google Sheets\n- Dumpling AI (via header auth)\n- OpenAI GPT\n- Gmail OAuth2\n\n🗒️ Sheet columns required:\n- `link` (YouTube video URL)\n- `blog post` (Newsletter output field)\n',
			{ position: [-560, -340], width: 560, height: 580 },
		),
	);
