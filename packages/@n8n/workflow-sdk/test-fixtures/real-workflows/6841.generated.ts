const wf = workflow(
	'8RiTOY4w1qA2cIHH',
	'Automate weekly Hollywood film briefing via Tavily and Gemini',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: {
						interval: [{ field: 'weeks', triggerAtDay: [4], triggerAtHour: 7 }],
					},
				},
				position: [656, 400],
				name: 'Weekly Thursday Trigger',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: '=You are an AI summarizer creating a daily Hollywood film industry briefing.\n\nYou will receive four Tavily search results:\n- Hollywood movies releasing this week\n- Hollywood box office results last week\n- Hollywood news\n- Must‑watch Hollywood movies currently in theatres\n\nEach result contains `title` and `content`.\n\n---\n\n### TASK\nSummarize each result into Gmail‑friendly HTML with emojis and bullet points:\n\n🎬 Releases  \n📊 Box Office  \n📰 News  \n🎥 Must-Watch Movies  \n\nFor **Must-Watch Movies**:\n- If details (reviews/hype) exist, summarize them briefly.\n- If only movie names appear, **assume reasons** (e.g., “great for IMAX/4DX,” “big visual effects,” “audience buzz,” or “fan‑favorite franchise”).\n\nIf no data at all, write “No data available”.\n\n---\n\n### OUTPUT FORMAT\nReturn JSON:\n{\n  "subject": "Daily Hollywood Film Industry Briefing – {{ $json[\'Readable date\'] }}",\n  "body": "<html>\n    🎬 Releases\n    <ul><li>Movie 1</li></ul>\n    📊 Box Office\n    <ul><li>Result 1</li></ul>\n    📰 News\n    <ul><li>Update 1</li></ul>\n    🎥 Must-Watch Movies\n    <ul><li>Recommendation 1 with assumed reason (if needed)</li></ul>\n  </html>"\n}\n',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [1248, 400],
				name: 'Hollywood News Research Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message: '={{ $json.output.body }}',
					options: {},
					subject: '={{ $json.output.subject }}',
				},
				position: [2016, 400],
				name: 'Send a message',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: {
					rule: {
						interval: [{ field: 'weeks', triggerAtDay: [5], triggerAtHour: 7 }],
					},
				},
				position: [896, 1248],
				name: 'Schedule Trigger',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: "=You are an AI summarizer creating a daily Hollywood film industry briefing.\nYou have access to web search and must perform FOUR structured searches and summarize results into a clean, factual briefing.\n\nSearch Tasks\n1) Weekly Movie Releases (Hollywood)\nFind up to 10 movies releasing in theatres THIS WEEK ONLY.\n\nStrictly exclude:\n\nOTT releases or web series\n\nOld or previously released movies (even if trending or re-released)\n\nMonthly/yearly recap lists\n\nProvide for each movie:\n\nName\n\nExact release date\n\nDay of the week (e.g., Friday)\n\nVerify releases are between Monday–Sunday of the current week based on {{ $json['Readable date'] }}.\nIf fewer than 10, include as many accurate releases as possible.\n\n2) Box Office Results (Hollywood)\nFind:\n\nTop highest-grossing Hollywood films of THIS YEAR (worldwide gross)\n\nLast week’s box office performance (Hollywood) with gross numbers\n\nHighlight notable new releases and trends (e.g., record-breaking debut, strong overseas performance).\n\nCurrent week is {{ $json['Readable date'] }}, current day is {{ $json['Day of week'] }}.\nIgnore any box office data older than last week.\n\n3) Industry Buzz (Casting / Directors / Strikes)\nProvide exactly 7 major updates from Hollywood:\n\nCasting announcements\n\nDirector signings/new projects\n\nProduction updates & filming progress\n\nStrikes, controversies, industry events\n\nMust be from this week only (ignore outdated news).\nProvide detailed summaries (context + relevance).\nDo not include links — summaries only.\nMust always give 7 updates, even if some are long.\n\n4) Best Movies Currently in Theatres\nRecommend best currently running Hollywood movies in theatres in Surat, India.\n\nExclude old films (e.g., pre-2025 releases like Fast X or Oppenheimer).\n\nProvide:\n\nWhy recommended (reviews, visuals, fan hype)\n\nBest format (e.g., IMAX, 3D, standard)\n\nOnly include movies running this week or recently released (before {{ $json['Readable date'] }}).\n\nFormatting Rules\nMovie names must be plain text (no bold, no markdown).\n\nUse emojis for section headers:\n\n🎬 Releases\n\n📊 Box Office\n\n📰 Industry Buzz\n\n🎥 Must-Watch in Theatres\n\nInclude release dates, box office numbers where available.\n\nIf no data for a section, output “No data available” (do not guess).\n\nOutput Requirements\nReturn as a JSON object with two keys:\n\nsubject: Daily Hollywood Film Industry Briefing – {{ $json['Readable date'] }}\n\nbody: Full HTML email (Gmail-friendly) with sections, bullet lists, emojis, and clean formatting. No markdown.\n\nCritical Instructions\nUse only fresh search results (ignore outdated or evergreen data).\n\nExclude re-released films unless explicitly stated as new this week.\n\nEnsure weekly relevance: include only events/releases around this week’s date.\n\nAvoid duplicates; merge similar data cleanly.\n\nPrioritize accuracy — if unsure, clearly state “No data available.”",
					options: {},
					promptType: 'define',
				},
				position: [1296, 1248],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					sendTo: 'user@example.com',
					message: '={{ $json.output.body }}',
					options: {},
					subject: '={{ $json.output.subject }}',
				},
				position: [1856, 1248],
				name: 'Send a message1',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.tavily.com/search',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "query": "hollywood movies releasing this week",\n  "search_depth": "basic",\n  "time_range": "week",\n  "max_results": 5\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Content-Type', value: 'application/json' },
							{
								name: 'Authorization',
								value: '{{$credentials.TavilyApiKey}}',
							},
						],
					},
				},
				position: [1024, 624],
				name: 'Fetch Weekly Releases (Tavily)',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.tavily.com/search',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "query": "hollywood box office results last week",\n  "search_depth": "basic",\n  "time_range": "week",\n  "max_results": 5\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Content-Type', value: 'application/json' },
							{
								name: 'Authorization',
								value: '{{$credentials.TavilyApiKey}}',
							},
						],
					},
				},
				position: [1216, 624],
				name: 'Fetch Weekly Box Office (Tavily)',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.tavily.com/search',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "query": "hollywood news latest casting director production",\n  "search_depth": "basic",\n  "time_range": "week",\n  "max_results": 5\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Content-Type', value: 'application/json' },
							{
								name: 'Authorization',
								value: '{{$credentials.TavilyApiKey}}',
							},
						],
					},
				},
				position: [1408, 624],
				name: 'Fetch Hollywood News (Tavily)',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.tavily.com/search',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "query": "best hollywood movies playing in theatres",\n  "search_depth": "basic",\n  "time_range": "week",\n  "max_results": 5\n}\n',
					sendBody: true,
					sendHeaders: true,
					specifyBody: 'json',
					headerParameters: {
						parameters: [
							{ name: 'Content-Type', value: 'application/json' },
							{
								name: 'Authorization',
								value: '{{$credentials.TavilyApiKey}}',
							},
						],
					},
				},
				position: [1600, 624],
				name: 'Fetch Must-Watch Movies (Tavily)',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.3,
			config: {
				parameters: {
					jsonSchemaExample:
						'{\n  "subject": "Daily Hollywood Film Industry Briefing – July 25, 2025",\n  "body": "<html> ... formatted content ... </html>"\n}\n',
				},
				position: [1808, 624],
				name: 'Format Output for Email',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: { options: {} },
				position: [816, 624],
				name: 'Google Gemini 2.5 Flash',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
					options: {},
				},
				position: [1248, 1472],
				name: 'OpenAI Chat Model',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: { method: 'POST', options: {} },
				position: [1520, 1472],
				name: 'HTTP Request',
			},
		}),
	)
	.add(
		sticky(
			'## Try It Out! 🎬(for free)\n\n### This n8n template demonstrates how to build a **weekly Hollywood film industry briefing** using Tavily for real-time search and Google Gemini for summarization. It sends a concise, emoji‑styled email with **movie releases, box office results, industry news, and must‑watch recommendations**.\n\nUse cases: Perfect for **film journalists, entertainment blogs, or movie fans** who want an automated weekly update in their inbox.\n\n### How it works\n\n* **Trigger:** Scheduled every Thursday morning (configurable).\n* **Search:** Four Tavily API calls fetch:\n  * Movies releasing this week\n  * Last week’s box office results\n  * Hollywood industry news\n  * Must-watch movies currently in theatres\n* **Summarization:** Google Gemini processes the search results and formats them into Gmail‑friendly HTML with emojis and bullet points.\n* **Output:** Email sent automatically via Gmail node with subject and formatted briefing.\n\n### How to use\n\n* Configure **Tavily API** and **Gmail OAuth2** credentials in n8n.\n* (Optional) Edit search queries in Tavily nodes to focus on specific genres or regions.\n* Adjust the **schedule trigger** to your preferred day/time.\n\n### Requirements\n\n* Tavily API account (free tier available)\n* Google Gemini API key for summarization\n* Gmail account (OAuth2 credentials)\n\n### Need Help?\n\nDM me on [X (formerly Twitter)](https://x.com/manav170303) or email [titanfactz@gmail.com](mailto:titanfactz@gmail.com).\n\nAlways open to feedback and improvements!\n',
			{ width: 576, height: 992 },
		),
	)
	.add(
		sticky(
			'## Example Email Output\n\n**Daily Hollywood Film Industry Briefing – 2025, 07:00 am**\nInbox\n\n[titanfactz@gmail.com](mailto:titanfactz@gmail.com)\n07:00am (0 minutes ago)\nto me\n\n## 🎬 **Releases**\n* Dora and the Search for Sol Dorado (July 2, 2025)\n* Jurassic World Rebirth (July 2, 2025)\n* The Old Guard 2 (July 2, 2025)\n* The Sound (June 27, 2025)\n\n## 📊 **Box Office**\n* Fantastic Four: First Steps – estimated \\$40M-\\$45M opening\n* Bad Guys 2 – estimated \\$22M opening\n* Naked Gun – estimated \\$16M opening\n* Together – estimated \\$10M+ over 5-day opening\n* Superman – \\$24.8 million last week (\\$289.5 million total)\n* Jurassic World: Rebirth – \\$13.0 million last week (\\$301.5 million total)\n* F1: The Movie – \\$6.2 million last week (\\$165.5 million total)\n\n## 📰 **News**\n* Michael Peña joins Chris Hemsworth and Lily James in Amazon’s new submarine action film, *Subversion*.\n* Casting director seeks 2,000 extras for a massive concert scene in the new TV series *9-1-1*.\n* *Emily in Paris* casting director Juliette Menager discusses finding Sylvie and Camille Razat’s exit.\n\n## 🎥 **Must-Watch Movies**\n* Caught by the Tides – Jia Zhangke’s latest experimental film blending memories and archives.\n* Sinners – Highly rated 9.5/10, a compelling cinematic experience.\n* Fantastic Four: The First Steps – A big Marvel win, rated 9/10 with stunning visuals.\n* MI: The Final Reckoning – Rated 8.5/10, audiences are buzzing about this action-packed finale.\n* Superman – Fan-favorite franchise, rated 8.5/10, delivering powerful storytelling.\n* Ballerina – Rated 8.5/10, expected to feature breathtaking choreography and action.\n* Thunderbolts – Rated 7.5/10, thrilling ensemble film with dynamic character arcs.',
			{ name: 'Sticky Note1', color: 7, position: [2272, 0], width: 752, height: 896 },
		),
	)
	.add(
		sticky(
			"**Subject:** Daily Hollywood Film Industry Briefing – August 3, 2025\n\n---\n\nGood morning,\nHere's your daily Hollywood film briefing for August 3, 2025:\n\n---\n\n🎬 **Releases**\n\n* The Bad Guys 2 – Released Friday, August 1, 2025\n* The Naked Gun – Released Friday, August 1, 2025\n\nThese are the confirmed new wide theatrical Hollywood releases this week (Monday through Sunday of current week). No additional new Hollywood theatrical releases found for this week.\n\n---\n\n📊 **Box Office**\n\n**Highest‑grossing Hollywood films of 2025 (worldwide):**\n\n* Ne Zha 2 – approx. \\$1.90 billion (non‑Hollywood Chinese animated film leads)\n* Lilo & Stitch – approx. \\$1.02 billion\n* A Minecraft Movie – approx. \\$955 million\n* Jurassic World Rebirth – approx. \\$731 million\n* How to Train Your Dragon – approx. \\$610 million\n\n**Last week’s box office performance (Monday–Sunday):**\n\n* The Fantastic Four: First Steps – domestic debut \\~\\$118 M; global \\~\\$218 M, Marvel’s biggest opening of 2025\n* Superman – added \\~\\$94 M worldwide last week, passing \\$500 M global total\n* Jurassic World Rebirth – up \\~\\$70 M worldwide last week, despite \\~40 % drop week‑on‑week\n* F1: The Movie – up \\~\\$48 M last week internationally/domestically growth visible\n* Lilo & Stitch – added \\~\\$10 M worldwide last week, slower tail but still billion‑plus gross\n\n**Highlights & trends:**\nFantastic Four’s strong debut reboots Marvel success, signaling resumed audience interest; Superman continues to hold strong; Jurassic World Rebirth remains durable after holiday surge; surge in box office recovery noted across key titles. Overall box office up \\~12–15 % year‑on‑year.\n\n---\n\n📰 **Industry Buzz**\n\n1. Christopher Nolan has signed to direct a massive \\$250 million adaptation of Homer’s *The Odyssey*, starring Matt Damon and Tom Holland, with Imax pre‑sales at 95 % capacity across major locations.\n2. Marvel has relaunched the *Fantastic Four* franchise successfully with *First Steps*; positive CinemaScore and strong visuals marking a fresh start.\n3. DC’s *Superman* continues strong with over \\$500 M global, solidifying DC’s summer comeback.\n4. Universal’s *Jurassic World Rebirth* continues strong overseas, especially in China, contributing to \\$318 M global in opening holiday weekend.\n5. Warner Bros.–Discovery stock surges (\\~30 %) amid box office rebound, with Disney, IMAX and Cinemark also seeing robust growth in 2025.\n6. *Ne Zha 2* becomes highest‑grossing animated and non‑Hollywood film ever, crossing \\$2 billion globally—though not Hollywood, its impact on global trends is notable.\n7. *Mission: Impossible – The Final Reckoning* quietly solidifies strong global numbers (\\~\\$562 M) and continues reliable franchise performance.\n\n---\n\n🎥 **Must‑Watch in Theatres (Surat, India)**\n\n* **The Fantastic Four: First Steps** – Currently showing in English/Hindi/Tamil/Telugu in Surat cinemas; hyped globally, strong visuals, action‑heavy, best experienced in IMAX or premium formats if available in Surat multiplexes. Runs this week.\n* **F1: The Movie** – Available in Surat in multiple languages, strong reviews praising adrenaline‑fuelled direction and visuals and growing fan hype; ideal in standard or Dolby formats for immersive sound and speed feel.\n* **Jurassic World Rebirth** – Still playing in Surat, popular with family audiences; grand visuals and dinosaur action well‑suited to IMAX or large format screens.\n\n---\n\nThat’s all for today’s briefing. Have a great theatrical weekend ahead!",
			{ name: 'Sticky Note2', color: 7, position: [2160, 1104], width: 944, height: 1504 },
		),
	)
	.add(
		sticky(
			'### Cool, right? But here’s the twist:\nSwap in ChatGPT — GPT‑3.5 Turbo (≈ $0.002/run), GPT‑4o (≈ $0.009/run), or GPT‑4.5 (≈ $0.15/run) — and the briefing goes nuclear: cleaner, richer, straight‑up “did‑a‑human‑write‑this?” energy.\nBasically IMAX‑grade output for the cost of a coffee… or a flex if you go full 4.5.',
			{ name: 'Sticky Note3', position: [272, 1232], width: 480 },
		),
	);
