const wf = workflow('kPBvBnjidCFr5v69', 'Youtube to Instagram_Facebook', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.rssFeedReadTrigger',
			version: 1,
			config: {
				parameters: {
					feedUrl: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2Tf8MGUzFX-GPkuBEBSKMg',
					pollTimes: { item: [{ mode: 'everyHour' }] },
				},
				position: [-1000, -80],
				name: 'Pull Youtube Video From Channel',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '=Write a short, engaging social media post about this new YouTube video:\n\nTitle: {{ $json.title }}\nURL: {{ $json.link }}\n\nInclude emojis and a call to action.',
					options: {},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
				},
				position: [-740, -80],
				name: 'AI Agent',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://graph.facebook.com/v22.0/<Facebook_PageID>',
					options: {},
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'fields', value: 'instagram_business_account' },
							{ name: 'access_token', value: '<Access_Token>' },
						],
					},
				},
				position: [-340, 80],
				name: 'Get IG Business Account ID',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://graph.facebook.com/v22.0/{{ $json.instagram_business_account.id }}/media',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'form-urlencoded',
					bodyParameters: {
						parameters: [
							{
								name: 'image_url',
								value:
									'=https://img.youtube.com/vi/{{ $(\'Pull Youtube Video From Channel\').item.json.link.split("=")[1] }}/maxresdefault.jpg',
							},
							{
								name: 'caption',
								value: "={{ $('AI Agent').item.json.output }}",
							},
							{ name: 'access_token', value: '<Access_Token>' },
						],
					},
				},
				position: [-80, 60],
				name: 'Create Media Container',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: "=https://graph.facebook.com/v22.0/{{ $('Get IG Business Account ID').item.json.instagram_business_account.id }}/media_publish\n",
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'form-urlencoded',
					bodyParameters: {
						parameters: [
							{ name: 'creation_id', value: '={{ $json.id }}' },
							{ name: 'access_token', value: '<Access_Token>' },
						],
					},
				},
				position: [180, 60],
				name: 'Publish Post On Instagram',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://graph.facebook.com/v22.0/<Facebook_PageID>/feed\n',
					method: 'POST',
					options: {},
					sendBody: true,
					contentType: 'form-urlencoded',
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'message', value: '={{ $json.output }}' },
							{ name: 'access_token', value: '<Access_Token>' },
						],
					},
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-340, -240],
				name: 'Post on Facebook',
			},
		}),
	)
	.add(
		sticky(
			'# 📱 YouTube to Social Media Automation\n\n**Purpose:** Auto-publish YouTube videos to Facebook & Instagram\n\n**Schedule:** Checks for new videos every hour\n\n**Required Setup:**\n1. YouTube channel RSS feed\n2. OpenAI API key (GPT-4o-mini)\n3. Meta App with permissions\n4. Long-lived access token\n\n## Workflow Steps:\n1. **Monitor** - RSS feed for new videos\n2. **Generate** - AI creates social caption\n3. **Publish** - Posts to FB & Instagram\n\n💡 Update all `<Access_Token>` and `<Facebook_PageID>` placeholders',
			{ name: 'Workflow Overview', color: 2, position: [-1300, -320], width: 350, height: 380 },
		),
	)
	.add(
		sticky(
			'## 🎥 YouTube RSS Trigger\n\n**Monitors your YouTube channel:**\n- Checks every hour for new uploads\n- Uses YouTube RSS feed format\n\n**To find your channel ID:**\n1. Go to your YouTube channel\n2. View page source\n3. Search for "channelId"\n\n⚠️ Replace channel_id in RSS URL',
			{ name: 'RSS Trigger Info', color: 3, position: [-1040, -320], width: 280, height: 220 },
		),
	)
	.add(
		sticky(
			'## 🤖 AI Caption Generation\n\n**OpenAI GPT-4o-mini:**\n- Generates engaging social media captions\n- Includes emojis automatically\n- Adds call-to-action\n\n**Customize the prompt to:**\n- Match your brand voice\n- Include specific hashtags\n- Target your audience',
			{ name: 'AI Caption Generation', color: 5, position: [-740, -320], width: 280, height: 200 },
		),
	)
	.add(
		sticky(
			'## 📘 Facebook Publishing\n\n**Direct post to Facebook Page**\n\n⚠️ **Required updates:**\n- Replace `<Facebook_PageID>`\n- Replace `<Access_Token>`\n\n**Note:** Uses error handling to continue workflow even if Facebook fails',
			{ name: 'Facebook Publishing', color: 4, position: [-390, -440], width: 250, height: 180 },
		),
	)
	.add(
		sticky(
			'## 📸 Instagram Publishing Flow\n\n**3-step process:**\n1. Get Business Account ID\n2. Create media container with thumbnail\n3. Publish the post\n\n**Automatic thumbnail:**\nPulls YouTube video thumbnail as Instagram image\n\n⚠️ Requires Instagram Business Account linked to Facebook Page',
			{
				name: 'Instagram Publishing Flow',
				color: 6,
				position: [-120, -180],
				width: 300,
				height: 220,
			},
		),
	)
	.add(
		sticky(
			'⚠️ **Meta API Requirements**\n\n**Required Permissions:**\n- pages_manage_posts\n- pages_read_engagement\n- pages_show_list\n- instagram_content_publish\n- instagram_basic\n\n**Token Type:** Long-lived access token\n**API Version:** v22.0',
			{ name: 'API Requirements', color: 1, position: [-440, 280], width: 250, height: 200 },
		),
	);
