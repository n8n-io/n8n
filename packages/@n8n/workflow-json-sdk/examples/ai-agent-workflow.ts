/**
 * AI Agent Workflow Example
 *
 * This example demonstrates how to create a complete AI agent workflow
 * with a chat trigger, language model, memory, and multiple tools.
 */

import { workflow } from '../src/index';

// Create a new workflow
const wf = workflow({ name: 'AI Agent Workflow' });

// Add metadata
wf.meta({
	instanceId: 'e409ea34548a2afe2dffba31130cd1cf2e98ebe2afaeed2a63caf2a0582d1da0',
	templateCredsSetupCompleted: true,
});

// Create chat trigger
const chatTrigger = wf
	.node('Example Chat')
	.type('@n8n/n8n-nodes-langchain.chatTrigger')
	.position(-176, -64)
	.parameters({
		public: true,
		options: {
			title: 'Your first AI Agent 🚀',
			subtitle: 'This is for demo purposes. Try me out !',
			responseMode: 'lastNode',
			inputPlaceholder: 'Type your message here...',
			showWelcomeScreen: false,
		},
		initialMessages: 'Hi there! 👋',
	})
	.webhookId('e5616171-e3b5-4c39-81d4-67409f9fa60a')
	.version(1.1)
	.notes('© 2025 Lucas Peyrin')
	.creator('Lucas Peyrin')
	.cid('Ikx1Y2FzIFBleXJpbiI');

// Create AI agent
const agent = wf
	.node('Your First AI Agent')
	.type('@n8n/n8n-nodes-langchain.agent')
	.position(192, -64)
	.parameters({
		options: {
			systemMessage: `<role>
You are the n8n Demo AI Agent, a friendly and helpful assistant designed to showcase the power of AI agents within the n8n automation platform. Your personality is encouraging, slightly educational, and enthusiastic about automation. Your primary function is to demonstrate your capabilities by using your available tools to answer user questions and fulfill their requests. You are conversational.
</role>

<instructions>
<goal>
Your primary goal is to act as a live demonstration of an AI Agent built with n8n. You will interact with users, answer their questions by intelligently using your available tools, and explain the concepts behind AI agents to help them understand their potential.
</goal>

<context>
### How I Work
I am an AI model operating within a simple n8n workflow. This workflow gives me two key things:
1.  **A set of tools:** These are functions I can call to get information or perform actions.
2.  **Simple Memory:** I can remember the immediate past of our current conversation to understand context.

### My Purpose
My main purpose is to be a showcase. I demonstrate how you can give a chat interface to various functions (my tools) without needing complex UIs. This is a great way to make powerful automations accessible to anyone through simple conversation.

### My Tools Instructions
You must choose one of your available tools if the user's request matches its capability. You cannot perform these actions yourself; you must call the tool.

### About AI Agents in n8n
- **Reliability:** While I can use one tool at a time effectively, more advanced agents can perform multi-step tasks. However, for complex, mission-critical processes, it's often more reliable to build structured, step-by-step workflows in n8n rather than relying solely on an agent's reasoning. Agents are fantastic for user-facing interactions, but structured workflows are king for backend reliability.
- **Best Practices:** A good practice is to keep an agent's toolset focused, typically under 10-15 tools, to ensure reliability and prevent confusion.

### Current Date & Time
{{ $now }}
</context>

<output_format>
- Respond in a friendly, conversational, and helpful tone.
- When a user's request requires a tool, first select the appropriate tool. Then, present the result of the tool's execution to the user in a clear and understandable way.
- Be proactive. If the user is unsure what to do, suggest some examples of what they can ask you based on your available tools (e.g., Talk about your tools and what you know about yourself).
</output_format>
</instructions>`,
		},
	})
	.version(2.2)
	.notes('© 2025 Lucas Peyrin')
	.creator('Lucas Peyrin')
	.cid('Ikx1Y2FzIFBleXJpbiI');

// Create language model (Gemini)
const gemini = wf
	.node('Connect Gemini')
	.type('@n8n/n8n-nodes-langchain.lmChatGoogleGemini')
	.position(-176, 224)
	.parameters({
		options: {
			temperature: 0,
		},
	})
	.version(1)
	.notes('© 2025 Lucas Peyrin')
	.creator('Lucas Peyrin')
	.cid('Ikx1Y2FzIFBleXJpbiI');

// Create conversation memory
const memory = wf
	.node('Conversation Memory')
	.type('@n8n/n8n-nodes-langchain.memoryBufferWindow')
	.position(224, 224)
	.parameters({
		contextWindowLength: 30,
	})
	.version(1.3)
	.notes('© 2025 Lucas Peyrin')
	.creator('Lucas Peyrin')
	.cid('Ikx1Y2FzIFBleXJpbiI');

// Create weather tool
const weatherTool = wf
	.node('Get Weather')
	.type('n8n-nodes-base.httpRequestTool')
	.position(544, 224)
	.parameters({
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
	})
	.version(4.2)
	.creator('Lucas Peyrin')
	.cid('Ikx1Y2FzIFBleXJpbiI')
	.notes('', true);

// Create RSS news tool
const newsTool = wf
	.node('Get News')
	.type('n8n-nodes-base.rssFeedReadTool')
	.position(656, 224)
	.parameters({
		url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('URL', `Use one of:\n- https://feeds.bbci.co.uk/news/world/rss.xml (BBC World – global headlines)\n- https://www.aljazeera.com/xml/rss/all.xml (Al Jazeera English – in‑depth global coverage)\n- http://rss.cnn.com/rss/edition_world.rss (CNN World – breaking news worldwide)\n- https://techcrunch.com/feed/ (TechCrunch – global tech & startup news)\n- http://news.ycombinator.com/rss (Hacker News – tech community headlines)\n- https://n8n.io/blog/rss (n8n Blog – updates & tutorials)\n- https://www.bonappetit.com/feed/recipes-rss-feed/rss (Bon Appétit – recent recipes list)\n- https://www.endsreport.com/rss/news-and-analysis (ENDS Report – environmental law & policy news)\n- https://medlineplus.gov/groupfeeds/new.xml (MedlinePlus – health topics & wellness updates)`, 'string') }}",
		options: {},
		toolDescription: 'Gets the latest blog posts about any rss feed.',
	})
	.version(1.2)
	.notes('© 2025 Lucas Peyrin')
	.creator('Lucas Peyrin')
	.cid('Ikx1Y2FzIFBleXJpbiI');

// Create connections

// Chat trigger to agent (main connection)
wf.connection()
	.from({ node: chatTrigger, type: 'main', index: 0 })
	.to({ node: agent, type: 'main', index: 0 })
	.build();

// Gemini to agent (language model connection)
wf.connection()
	.from({ node: gemini, type: 'ai_languageModel', index: 0 })
	.to({ node: agent, type: 'ai_languageModel', index: 0 })
	.build();

// Memory to agent (memory connection)
wf.connection()
	.from({ node: memory, type: 'ai_memory', index: 0 })
	.to({ node: agent, type: 'ai_memory', index: 0 })
	.build();

// Weather tool to agent (tool connection)
wf.connection()
	.from({ node: weatherTool, type: 'ai_tool', index: 0 })
	.to({ node: agent, type: 'ai_tool', index: 0 })
	.build();

// News tool to agent (tool connection)
wf.connection()
	.from({ node: newsTool, type: 'ai_tool', index: 0 })
	.to({ node: agent, type: 'ai_tool', index: 0 })
	.build();

// Export to JSON
const workflowJSON = wf.toJSON();

// Output the workflow JSON
console.log(JSON.stringify(workflowJSON, null, 2));
