const wf = workflow('', 'Daily Digest', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ triggerAtHour: 9 }] } },
				position: [-2272, 384],
				name: 'Schedule Trigger1',
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
					mode: 'raw',
					options: {},
					jsonOutput:
						'{"url" :  [\n"https://techcrunch.com/feed/",\n"https://www.theverge.com/rss/index.xml",\n    "https://analyticsindiamag.com/feed/",\n     "https://www.wired.com/feed/rss",\n       "https://thenextweb.com/feed"\n]}',
				},
				position: [-1936, 336],
				name: 'Tech News Sites',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'url' },
				position: [-1632, 336],
				name: 'Split Out',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: {}, batchSize: 5 },
				position: [-1440, 304],
				name: 'Loop Over Items',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [-736, 400], name: 'Merge Both List' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.convertToFile',
			version: 1.1,
			config: { parameters: { options: {} }, position: [-560, 400], name: 'Conver To CSV' },
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: {
				parameters: { resource: 'file', inputType: 'binary' },
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-256, 400],
				name: 'Upload a file',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.googleGemini',
			version: 1,
			config: {
				parameters: {
					text: '# Tech Content Writer Prompt\n\nYou are a tech content writer.\nI have two lists of items:\n1️⃣ New Tools & Products\n{products_list}\n2️⃣ Global & India Tech News\n{news_list}\n\n## Task:\n- Select the **top 10-15 items** from each list based on these interests and keywords:\n  - **Tools & Products Keywords:** ["AI", "automation", "developer", "open source", "productivity", "creative", "innovation", "API", "web app", "tools"]\n  - **News Keywords:** ["technology innovation", "AI breakthrough", "framework", "developer update", "research", "automation trend", "product launch"]\n- Keep **two separate sections**: \n  1. Tools & Products (10-15 items)\n  2. Global & India Tech Innovations (10-15 items)\n- Summarize each item in **2-3 lines**.\n- **If an image URL is provided**, display it beautifully under the title with rounded edges\n- Tone: "Curious, energetic, and concise – focused on discovery, usefulness, and creativity."\n- Format using the HTML template below, replacing placeholder items with actual content from the lists.\n\n## HTML Template:\n```html\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Daily Tech Digest</title>\n    <style>\n        body {\n            font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Arial, sans-serif;\n            background: #f5f5f5;\n            margin: 0;\n            padding: 16px;\n            line-height: 1.5;\n            font-size: 15px;\n            color: #333;\n        }\n        \n        .container {\n            max-width: 600px;\n            margin: 0 auto;\n            background: #ffffff;\n            border-radius: 8px;\n        }\n        \n        .header {\n            background: #000;\n            color: #fff;\n            padding: 20px 16px;\n            border-radius: 8px 8px 0 0;\n        }\n        \n        .header h1 {\n            font-size: 20px;\n            font-weight: 600;\n            margin: 0 0 4px 0;\n        }\n        \n        .header p {\n            font-size: 13px;\n            margin: 0;\n            opacity: 0.8;\n        }\n        \n        .content {\n            padding: 20px 16px;\n        }\n        \n        .section {\n            margin-bottom: 32px;\n        }\n        \n        .section:last-child {\n            margin-bottom: 0;\n        }\n        \n        .section-title {\n            font-size: 16px;\n            font-weight: 600;\n            color: #000;\n            margin: 0 0 16px 0;\n            padding-bottom: 8px;\n            border-bottom: 2px solid #000;\n        }\n        \n        .item {\n            margin-bottom: 20px;\n            padding-bottom: 20px;\n            border-bottom: 1px solid #e5e5e5;\n        }\n        \n        .item:last-child {\n            border-bottom: none;\n            margin-bottom: 0;\n            padding-bottom: 0;\n        }\n        \n        .item-title {\n            font-size: 15px;\n            font-weight: 600;\n            color: #000;\n            margin: 0 0 12px 0;\n        }\n        \n        .item-image {\n            width: 100%;\n            height: auto;\n            border-radius: 12px;\n            margin-bottom: 12px;\n            display: block;\n            object-fit: cover;\n        }\n        \n        .item-summary {\n            font-size: 14px;\n            color: #555;\n            margin: 0 0 8px 0;\n        }\n        \n        .item-link {\n            color: #0066cc;\n            text-decoration: none;\n            font-size: 14px;\n            font-weight: 500;\n        }\n        \n        .footer {\n            background: #f9f9f9;\n            padding: 16px;\n            text-align: center;\n            font-size: 12px;\n            color: #666;\n            border-radius: 0 0 8px 8px;\n        }\n    </style>\n</head>\n<body>\n    <div class="container">\n        <div class="header">\n            <h1>⚡ Daily Tech Digest</h1>\n            <p>{current_date}</p>\n        </div>\n        \n        <div class="content">\n            <!-- Tools & Products Section -->\n            <div class="section">\n                <h2 class="section-title">🧠 New Tools & Products</h2>\n                \n                <!-- Example with Image -->\n                <div class="item">\n                    <div class="item-title">{Product Title 1}</div>\n                    <!-- Include image if URL is available -->\n                    <img src="{image_url}" alt="{Product Title}" class="item-image" onerror="this.style.display=\'none\'">\n                    <div class="item-summary">\n                        {2-3 line summary of the product}\n                    </div>\n                    <a href="{product_link}" class="item-link">Learn more →</a>\n                </div>\n                \n                <!-- Example without Image -->\n                <div class="item">\n                    <div class="item-title">{Product Title 2}</div>\n                    <div class="item-summary">\n                        {2-3 line summary of the product}\n                    </div>\n                    <a href="{product_link}" class="item-link">Learn more →</a>\n                </div>\n                \n                <!-- Add more items as needed -->\n            </div>\n            \n            <!-- Global & India Tech News Section -->\n            <div class="section">\n                <h2 class="section-title">🌍 Global & India Tech Innovations</h2>\n                \n                <!-- Example with Image -->\n                <div class="item">\n                    <div class="item-title">{News Title 1}</div>\n                    <!-- Include image if URL is available -->\n                    <img src="{image_url}" alt="{News Title}" class="item-image" onerror="this.style.display=\'none\'">\n                    <div class="item-summary">\n                        {2-3 line summary of the news}\n                    </div>\n                    <a href="{news_link}" class="item-link">Read more →</a>\n                </div>\n                \n                <!-- Example without Image -->\n                <div class="item">\n                    <div class="item-title">{News Title 2}</div>\n                    <div class="item-summary">\n                        {2-3 line summary of the news}\n                    </div>\n                    <a href="{news_link}" class="item-link">Read more →</a>\n                </div>\n                \n                <!-- Add more items as needed -->\n            </div>\n        </div>\n        \n        <div class="footer">\n            Stay curious. Keep building.\n        </div>\n    </div>\n</body>\n</html>\n```',
					modelId: {
						__rl: true,
						mode: 'list',
						value: 'models/gemini-2.5-flash-preview-05-20',
						cachedResultName: 'models/gemini-2.5-flash-preview-05-20',
					},
					options: {},
					resource: 'document',
					documentUrls: '={{ $json.fileUri }}',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [-16, 400],
				name: 'Analyze document',
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
						'// Get the HTML from previous node\nlet htmlText = $input.first().json.content.parts[0].text\n// Remove all \\n characters and trim\nhtmlText = htmlText.replace(/\\n/g, "").trim();\n\n// Return as JSON\nreturn [{ json: { html: htmlText } }];\n',
				},
				position: [368, 400],
				name: 'Code in JavaScript',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.emailSend',
			version: 2.1,
			config: {
				parameters: {
					html: "={{ $json.html.replace(/^```html/, '').replace(/```$/, '').trim() }}\n",
					options: {},
					subject:
						'=⚡ Daily Tech Digest - {{ new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) }}\n',
					toEmail: 'user@example.com',
					fromEmail: 'user@example.com',
				},
				credentials: { smtp: { id: 'credential-id', name: 'smtp Credential' } },
				position: [592, 400],
				name: 'Send email',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: "={{ $('Split Out').item.json.url }}", options: {} },
				position: [-1216, 320],
				name: 'RSS Read OF Tech News',
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
					mode: 'raw',
					options: {},
					jsonOutput:
						'{\n  "Url": [\n    \n      "https://www.reddit.com/r/SideProject/.rss",\n      "https://www.reddit.com/r/InternetIsBeautiful/.rss",\n      "https://dev.to/feed/tag/tools",\n      "https://www.producthunt.com/feed"\n    \n  ]\n}',
				},
				position: [-1936, 496],
				name: 'Tools Subredit and Sites',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'Url' },
				position: [-1632, 496],
				name: 'Split Out1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: {}, batchSize: 4 },
				position: [-1440, 496],
				name: 'Loop Over Items1',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.rssFeedRead',
			version: 1.2,
			config: {
				parameters: { url: '={{ $json.Url }}', options: {} },
				position: [-1216, 512],
				name: 'RSS Read OF Tools',
			},
		}),
	)
	.add(
		sticky(
			'# 📬 Personal Daily Tech Newsletter\n\n**What it does:**\nAutomatically curates and emails a personalized daily newsletter with the latest tech news, tools, and products tailored to your interests.\n\n**How it works:**\n1. Triggers daily at 9 AM\n2. Fetches RSS feeds from your favorite tech sources\n3. Uses Google Gemini AI to filter and curate based on your interests\n4. Sends a beautifully formatted newsletter to your inbox\n\n**Customize:**\n- Change RSS sources in the "Set" nodes\n- Modify keywords/interests in "Analyze document" node\n- Update your email address in "Send email" node\n- Adjust schedule time in trigger node',
			{ name: 'Sticky Note - Overview', color: 5, position: [-2960, -80], width: 520, height: 340 },
		),
	)
	.add(
		sticky('## 📅 Daily Trigger\nScheduled to run every day at 9:00 AM', {
			name: 'Sticky Note - Trigger',
			color: 3,
			position: [-2368, 304],
			width: 280,
			height: 220,
		}),
	)
	.add(
		sticky('## 📰 RSS Feed Sources\nDefine which RSS feeds to monitor for tech news and tools', {
			name: 'Sticky Note - Sources',
			color: 4,
			position: [-2032, 208],
			width: 280,
			height: 520,
		}),
	)
	.add(
		sticky('## 🔄 RSS Feed Processing\nSplit, loop through feeds in batches, and fetch content', {
			name: 'Sticky Note - Processing',
			color: 6,
			position: [-1712, 208],
			width: 820,
			height: 524,
		}),
	)
	.add(
		sticky('## 📦 Combine & Convert\nMerge all feeds and convert to CSV for AI', {
			name: 'Sticky Note - Combine',
			color: 2,
			position: [-832, 208],
			width: 420,
			height: 504,
		}),
	)
	.add(
		sticky(
			'## 🤖 AI Curation\n\nGoogle Gemini analyzes content and selects the top items based on your interests.\n\n**Note:** Change the keywords in the **Analyze Document** node’s text input prompt according to your interests.\n\n',
			{ name: 'Sticky Note - AI', color: 7, position: [-352, 208], width: 540, height: 504 },
		),
	)
	.add(
		sticky(
			'## 📧 Newsletter Delivery\n\nFormat and send the personalized newsletter.\n\n**Note:**\nAdd **SMTP credentials**, **sender**, and **receiver information**.\n',
			{ name: 'Sticky Note - Email', position: [256, 208], width: 520, height: 472 },
		),
	)
	.add(
		sticky(
			'**Note:**\nI have used **two different sources of interest** (News and Tools). \nThat’s why there are **two separate lists**. Please make changes according to your approach or workflow.\n\n',
			{ color: 3, position: [-2048, 656], width: 304, height: 144 },
		),
	);
