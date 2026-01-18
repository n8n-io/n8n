const wf = workflow('', 'LinkedIn AI Content Automation - Agentic Vibe', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.scheduleTrigger',
			version: 1.2,
			config: {
				parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 6 }] } },
				position: [-840, 640],
				name: 'Schedule Trigger',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: 'You are a Content Researcher Assistant at Agentic Vibe, an AI-first automation agency helping solopreneurs, creators, and digital-first founders grow their online presence — especially on LinkedIn — through scalable, hands-free content systems.\n\nYour task is to generate high-value content topics that align with our brand pillars and resonate deeply with our audience. These topics will later be expanded into posts by another agent.\n\n🔍 What to Focus On:\nGenerate content topics (not full content) based on these strategic themes:\n\nAI for Content Creation & Workflow Automation\n\nLinkedIn Automation Tools, Tactics & Growth Strategies\n\nSolopreneur Productivity Hacks Using AI & Automation\n\nSystems Thinking for Scaling Personal Brands\n\nThe Future of Work, Creators, and Automated Influence\n\nNo-Code Tools for Content & Lead Gen Automation\n\n✅ Your Output Per Topic:\nFor each idea, generate the following:\n\nTopic Title or Core Idea (1 line)\n\nShort Rationale (1–2 sentences on why this topic matters)\n\nSuggested Angle or Hook (1 LinkedIn-style framing or contrarian take)\n\n💡 Style Guide:\nKeep ideas insightful, actionable, and future-minded\n\nFavor founder-style energy: confident, sharp, and slightly contrarian when it adds value\n\nAvoid hype or jargon — focus on clarity, systemized insight, and utility',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-500, 640],
				name: 'Content topic generator2',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: '=You are a linkedin content creator and copywriter. Given the title {{ $json.output[0].title }}, the rationale {{ $json.output[0].rationale }}, suggested hook. Generate text content for a linkedin post. Also describe a suitable image for the post.',
					batching: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [-80, 640],
				name: 'Content creator',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.openAi',
			version: 1.8,
			config: {
				parameters: {
					prompt:
						"=Generate an image for a linkedin post this is the description: {{ $json.output['image description'] }} .The images should be realistic for linkedin.",
					options: {},
					resource: 'image',
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [420, 460],
				name: 'OpenAI',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: { position: [780, 640], name: 'Merge' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.linkedIn',
			version: 1,
			config: {
				parameters: {
					postAs: 'organization',
					additionalFields: {},
					shareMediaCategory: 'IMAGE',
				},
				credentials: {
					linkedInOAuth2Api: { id: 'credential-id', name: 'linkedInOAuth2Api Credential' },
				},
				position: [1060, 620],
				name: 'LinkedIn',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "=You are an SEO specialist for LinkedIn. Your task is to generate highly relevant and effective hashtags for the following post. Consider the post's content, target audience, and current LinkedIn trends to maximize visibility and engagement.\n\n<post_title>{{ $json.output['post title'] }}</post_title>\n<post_content>{{ $json.output['post content'] }}</post_content>\n\nPlease generate:\n1. **3-5 broad, high-volume hashtags** (e.g., #AI, #Marketing, #Business)\n2. **3-5 niche-specific hashtags** that are directly relevant to the post's core topic (e.g., #SocialMediaAutomation, #ContentCreationAI, #LinkedInMarketingTips)\n3. **1-2 trending/topical hashtags** if applicable (e.g., #FutureOfWork, #DigitalTransformation)\n\nPresent them as a comma-separated list.",
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				position: [420, 900],
				name: 'Hashtag generator /SEO',
			},
		}),
	)
	.add(
		node({
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
				position: [-500, 880],
				name: 'OpenAI Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: {
					jsonSchemaExample:
						'[{\n "title": "AI as Your First Content Hire: Why Founders Shouldn\'t Wait to Outsource Creation",\n            "rationale": "Most solopreneurs delay content scaling because they think hiring a ghostwriter is the next step — but AI can handle 80% with proper systems. This shifts content from a creative bottleneck to a scalable growth lever.",\n            "hook": "Ghostwriters are outdated. Train GPT once, and it ships LinkedIn gold in your voice daily. Welcome to hands-free thought leadership."\n          }]',
				},
				position: [-320, 860],
				name: 'Structured Output Parser',
			},
		}),
	)
	.add(
		node({
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
				position: [-80, 820],
				name: 'OpenAI Chat Model1',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: {
					jsonSchemaExample:
						'{\n  "post title": "Exciting New Feature Launch 🚀",\n  "post content": "After months of collaboration, testing, and fine-tuning, we\'re thrilled to introduce our latest product feature: Smart Insights. It helps users uncover meaningful patterns in their data with just a few clicks. This wouldn\'t have been possible without our incredible team and supportive community. We\'re excited for what\'s next — and we\'d love your feedback!",\n  "image description": "A laptop screen showcasing the new Smart Insights dashboard with colorful charts and graphs, surrounded by a team clapping in the background."\n}',
				},
				position: [80, 820],
				name: 'Structured Output Parser1',
			},
		}),
	)
	.add(
		node({
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
				position: [420, 1100],
				name: 'OpenAI Chat Model2',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1.2,
			config: {
				parameters: {
					jsonSchemaExample:
						'{\n  "post title": "Exciting New Feature Launch 🚀",\n  "post content": "After months of collaboration, testing, and fine-tuning, we\'re thrilled to introduce our latest product feature: Smart Insights. It helps users uncover meaningful patterns in their data with just a few clicks. This wouldn\'t have been possible without our incredible team and supportive community. We\'re excited for what\'s next — and we\'d love your feedback!",\n  "image description": "A laptop screen showcasing the new Smart Insights dashboard with colorful charts and graphs, surrounded by a team clapping in the background.",\n"Hashtags":["#AI","#Automation"]\n}',
				},
				position: [600, 1100],
				name: 'Structured Output Parser2',
			},
		}),
	);
