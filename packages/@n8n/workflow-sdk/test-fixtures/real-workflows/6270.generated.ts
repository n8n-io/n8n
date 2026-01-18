const wf = workflow('', '')
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: {
					public: true,
					options: {
						title: 'Your first AI Agent 🚀',
						subtitle: 'This is for demo purposes. Try me out !',
						responseMode: 'lastNode',
						inputPlaceholder: 'Type your message here...',
						showWelcomeScreen: false,
					},
					initialMessages: 'Hi there! 👋',
				},
				position: [-176, -64],
				name: 'Example Chat',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					options: {
						systemMessage:
							"=<role>\nYou are the n8n Demo AI Agent, a friendly and helpful assistant designed to showcase the power of AI agents within the n8n automation platform. Your personality is encouraging, slightly educational, and enthusiastic about automation. Your primary function is to demonstrate your capabilities by using your available tools to answer user questions and fulfill their requests. You are conversational.\n</role>\n\n<instructions>\n<goal>\nYour primary goal is to act as a live demonstration of an AI Agent built with n8n. You will interact with users, answer their questions by intelligently using your available tools, and explain the concepts behind AI agents to help them understand their potential.\n</goal>\n\n<context>\n### How I Work\nI am an AI model operating within a simple n8n workflow. This workflow gives me two key things:\n1.  **A set of tools:** These are functions I can call to get information or perform actions.\n2.  **Simple Memory:** I can remember the immediate past of our current conversation to understand context.\n\n### My Purpose\nMy main purpose is to be a showcase. I demonstrate how you can give a chat interface to various functions (my tools) without needing complex UIs. This is a great way to make powerful automations accessible to anyone through simple conversation.\n\n### My Tools Instructions\nYou must choose one of your available tools if the user's request matches its capability. You cannot perform these actions yourself; you must call the tool.\n\n### About AI Agents in n8n\n- **Reliability:** While I can use one tool at a time effectively, more advanced agents can perform multi-step tasks. However, for `complex, mission-critical processes, it's often more reliable to build structured, step-by-step workflows in n8n rather than relying solely on an agent's reasoning. Agents are fantastic for user-facing interactions, but structured workflows are king for backend reliability.\n- **Best Practices:** A good practice is to keep an agent's toolset focused, typically under 10-15 tools, to ensure reliability and prevent confusion.\n\n### Current Date & Time\n{{ $now }}\n</context>\n\n<output_format>\n- Respond in a friendly, conversational, and helpful tone.\n- When a user's request requires a tool, first select the appropriate tool. Then, present the result of the tool's execution to the user in a clear and understandable way.\n- Be proactive. If the user is unsure what to do, suggest some examples of what they can ask you based on your available tools (e.g., Talk about your tools and what you know about yourself).\n</output_format>\n</instructions>",
					},
				},
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.rssFeedReadTool',
							version: 1.2,
							config: {
								parameters: {
									url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('URL', `Use one of:\n- https://feeds.bbci.co.uk/news/world/rss.xml (BBC World – global headlines)\n- https://www.aljazeera.com/xml/rss/all.xml (Al Jazeera English – in‑depth global coverage)\n- http://rss.cnn.com/rss/edition_world.rss (CNN World – breaking news worldwide)\n- https://techcrunch.com/feed/ (TechCrunch – global tech & startup news)\n- http://news.ycombinator.com/rss (Hacker News – tech community headlines)\n- https://n8n.io/blog/rss (n8n Blog – updates & tutorials)\n- https://www.bonappetit.com/feed/recipes-rss-feed/rss (Bon Appétit – recent recipes list)\n- https://www.endsreport.com/rss/news-and-analysis (ENDS Report – environmental law & policy news)\n- https://medlineplus.gov/groupfeeds/new.xml (MedlinePlus – health topics & wellness updates)`, 'string') }}",
									options: {},
									toolDescription: 'Gets the latest blog posts about any rss feed.',
								},
								name: 'Get News',
							},
						}),
						tool({
							type: 'n8n-nodes-base.httpRequestTool',
							version: 4.2,
							config: {
								parameters: {
									url: 'https://api.open-meteo.com/v1/forecast',
									options: {},
									sendQuery: true,
									queryParameters: {
										parameters: [
											{
												name: 'latitude',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', `Latitude of the location, e.g. 45.75 for Lyon. Do not ask the user just infer it automatically.`, 'string') }}",
											},
											{
												name: 'longitude',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', `Longitude of the location, e.g. 4.85 for Lyon. Do not ask the user just infer it automatically.`, 'string') }}",
											},
											{
												name: 'current',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters2_Value', `Comma-separated list of current weather variables (no whitespace).\n\nExample: temperature_2m,windspeed_10m,rain.\n\nOptions: temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weathercode,cloudcover_total,pressure_msl,surface_pressure,windspeed_10m,winddirection_10m,windgusts_10m.`, 'string') }}",
											},
											{
												name: 'hourly',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters3_Value', `Comma-separated list of hourly weather variables (no whitespace). Hourly is only useful to get one day's information. For weakly overview please use daily.\n\nExample: temperature_2m,precipitation.\n\nOptions: temperature_2m,relative_humidity_2m,dewpoint_2m,apparent_temperature,precipitation,rain,showers,snowfall,snow_depth,pressure_msl,surface_pressure,cloudcover_total,cloudcover_low,cloudcover_mid,cloudcover_high,windspeed_10m,winddirection_10m,windgusts_10m,visibility,is_day,sunshine_duration,soil_temperature,soil_moisture,PM10,PM2_5,carbon_monoxide,ozone,us_aqi,UV_index.`, 'string') }}",
											},
											{
												name: 'daily',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters4_Value', `Comma-separated list of daily weather variables (no whitespace).\n\nExample: temperature_2m_max,precipitation_sum.\n\nOptions: weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,sunrise,sunset,daylight_duration,sunshine_duration,pressure_msl_max,pressure_msl_min,surface_pressure_max,surface_pressure_min,windgusts_10m_max,windspeed_10m_max,winddirection_10m_dominant,shortwave_radiation_sum.`, 'string') }}",
											},
											{
												name: 'start_date',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters5_Value', `Start date in YYYY-MM-DD format. Example: 2025-07-15`, 'string') }}",
											},
											{
												name: 'end_date',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters6_Value', `End date in YYYY-MM-DD format. Must be after start_date. Example: 2025-07-18`, 'string') }}",
											},
											{
												name: 'temperature_unit',
												value:
													"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters7_Value', `Unit for temperature. Options: celsius (default), fahrenheit.`, 'string') }}",
											},
										],
									},
									toolDescription:
										'Get weather forecast anywhere, anytime. You can make requests by assuming most information, the only thing you need is the location (use the city name to infer lat and long automatically) and time period (assume today if not specified)',
								},
								name: 'Get Weather',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: { parameters: { options: { temperature: 0 } }, name: 'Connect Gemini' },
					}),
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: { parameters: { contextWindowLength: 30 }, name: 'Conversation Memory' },
					}),
				},
				position: [192, -64],
				name: 'Your First AI Agent',
			},
		}),
	)
	.add(
		sticky('## [Video Tutorial](https://youtu.be/laHIzhsz12E)\n@[youtube](laHIzhsz12E)', {
			name: 'Sticky Note2',
			color: 7,
			position: [592, -256],
			width: 512,
			height: 352,
		}),
	)
	.add(
		sticky(
			'## Try It Out!\n\n**Launch your first AI agent—a chatbot that uses tools to fetch live info, send emails, and automate tasks.**\n\n### To get started:\n1.  **Connect Gemini** (see red sticky note below)\n2.  Click the **🗨 Open chat** button and try asking:\n    *   “What’s the weather in Paris?”\n    *   “Get me the latest tech news.”\n    *   “Give me ideas for n8n AI agents.”\n\n### Questions or Feedback?\nFor feedback, coaching, buit-for-you workflows or any questions, use my unified AI-powered contact form.\n\n➡️ **[Get in Touch Here](https://api.ia2s.app/form/templates/academy)**\n\n*Happy Automating! —Lucas Peyrin*',
			{ name: 'Introduction Note', position: [-752, -256], width: 392, height: 460 },
		),
	)
	.add(
		sticky(
			'💡 Later, activate this workflow and share the public chat URL to let others talk to your AI Agent!',
			{ name: 'Sticky Note12', color: 7, position: [-272, -160], width: 300, height: 252 },
		),
	)
	.add(
		sticky(
			'Your AI agent can:\n1. **Receive** messages from the chat\n2. **Select** the right tools (e.g., weather, news, email)\n3. **Respond** with live, helpful answers\n\n\n**Open the AI agent node** and edit the **System Message** to adjust your agent’s thinking, behavior, and replies.\n\n\n\n\n\n\n\n\n\n\n',
			{ name: 'Sticky Note13', color: 7, position: [112, -256], width: 396, height: 348 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\nThis node helps your agent remember the last few messages to stay on topic.',
			{ name: 'Sticky Note15', color: 7, position: [112, 176], width: 308, height: 260 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\nThese tools let your agent access real-world data or take actions. Add more to expand its abilities!\n\nClick the ➕ under the agent’s Tool input to add:\n- Google Calendar (Get Upcoming Events)\n- Gmail (Send an Email) (Gmail)',
			{ name: 'Sticky Note16', color: 7, position: [512, 176], width: 372, height: 324 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n1. [In Google AI Studio](https://aistudio.google.com/app/apikey) click **“Create API key in new project”** and copy it.\n\n2. Open the ```Connect Gemini``` node:\n   * **Select Credential → Create New**\n   * Paste into **API Key** and **Save**\n',
			{ color: 3, position: [-272, 176], width: 294, height: 316 },
		),
	);
