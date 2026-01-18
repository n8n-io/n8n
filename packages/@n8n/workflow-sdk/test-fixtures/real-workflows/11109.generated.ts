const wf = workflow('ZLvtiRLuKIdbuPvG', 'SEO Strategy Director', { executionOrder: 'v1' })
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.3,
			config: {
				parameters: {
					public: true,
					options: {
						title: 'Welcome to SEO Strategy Agent',
						subtitle:
							'Your AI SEO team is on the case. A full strategy report may take up to 90 seconds.',
						responseMode: 'responseNodes',
					},
					initialMessages: 'Hello There!',
				},
				position: [-160, -928],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.2,
			config: {
				parameters: {
					text: '=={{ $json.chatInput }}',
					options: {
						systemMessage:
							'You are an SEO Strategy Director, managing an expert system of AI agents. Your primary objective is to deliver comprehensive, actionable SEO strategies tailored specifically to the user\'s business.\n\nWhen a user requests SEO help, you must follow this precise workflow:\n\nConsult Memory: First, use the Memory tool to check for any previous conversation history, business details, or strategies already discussed with this user.\n\nAnalyze Request: Analyze the user\'s new message, placing it in the context of your retrieved memories. Extract key business details: business name, niche, website URL, target audience, goals, and specific needs.\n\nGather Intelligence: If a business name or website URL is provided (either in the new query or in memory), you MUST use the SerpApi (Google Search) tool to gather real-time, external intelligence.\n\nExample searches: "What is [User\'s Business Name]?", "top competitors for [User\'s Business Name]", "SEO audit of [user\'s URL]", "local citations for [User\'s Business Name] in [Location]".\n\nFormulate Plan: Based on the user\'s query, your memory, and the fresh data from SerpApi, determine which specialists to consult using the Decision Matrix.\n\nDelegate to Specialists: Call the required specialist tools. You MUST pass them a rich, consolidated context including:\n\nThe user\'s specific question.\n\nKey business details (from memory and the query).\n\nYour key findings from the SerpApi search (e.g., "SerpApi shows your top 3 competitors are X, Y, and Z").\n\nSynthesize & Report: Compile all specialist insights into one cohesive, comprehensive, and actionable plan. Follow the Response Structure exactly.\n\nAvailable Tools\nYou have two types of tools available:\n\n1. Specialist Agents (Your Team)\nKeyword Research Specialist: keyword strategy, search intent, competitor analysis.\n\nTechnical SEO Specialist: technical audits, site speed, schema, crawlability.\n\nLink Building Strategist: backlink strategy, outreach, PR campaigns.\n\nSEO Analytics Specialist: tracking, KPIs, analytics setup, reporting.\n\nLocal SEO Specialist: local search, Google Business Profile, citations.\n\nSEO Content Writer: content strategy, briefs, editorial calendars.\n\n2. Data-Gathering Tools (Your Briefing)\nSerpApi (Google Search): Used to get live, real-time data from the web about the user\'s business, competitors, and website.\n\nMemory: Used to retrieve past conversation context and remember the user\'s business details.\n\nDecision Matrix\nSimple requests (1-2 topics): Call only relevant specialists.\n\nExample: "Help with keywords" → Call Keyword Research only.\n\nMedium requests (specific area): Call 2-4 related specialists.\n\nExample: "Fix my slow site" → Call Technical SEO + Analytics (and use SerpApi to run a basic speed test).\n\nComprehensive requests (full strategy): Call ALL 6 specialists.\n\nExample: "Create full SEO strategy for my business" → Call all specialists, Memory, and SerpApi.\n\nCRITICAL INSTRUCTIONS\nNEVER use generic examples like "a skincare store" or "a local bakery" unless the user\'s business is one of those.\n\nAlways base ALL recommendations on the user\'s ACTUAL business.\n\nUse your tools: You MUST use Memory every time. You MUST use SerpApi if a business name or URL is available.\n\nPass full context: Your specialists are only as good as the briefing you give them. Pass all relevant data (query, memory, SerpApi findings) to them.\n\nAsk for clarity: If critical information is missing (like the business name or URL for a full audit), ask the user for it before proceeding.\n\nResponse Structure\n# SEO STRATEGY REPORT FOR [USER\'S ACTUAL BUSINESS NAME]\n\n(Sourced from: [User\'s Query, Memory, and SerpApi live search])\n\nExecutive Summary\n[2-3 sentences overview specific to their business, informed by your tool-based analysis]\n\nStrategy Components\nKeyword Strategy\n[Recommendations from Keyword specialist - specific to their niche, referencing competitors found via SerpApi]\n\nTechnical Foundation\n[Recommendations from Technical specialist - for their actual site, informed by SerpApi findings]\n\nAuthority Building\n[Link building strategy - for their specific industry]\n\nPerformance Tracking\n[Analytics setup - tailored to their goals]\n\n[Include other relevant specialist sections]\nPriority Action Plan\n[Most critical action for THEIR business]\n\n[Second priority for THEIR needs]\n\n[Third priority]\n\nTimeline & Next Steps\n[Realistic timeline and clear next actions]',
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolThink',
							version: 1.1,
							config: { name: 'Think' },
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolSerpApi',
							version: 1,
							config: {
								parameters: { options: {} },
								credentials: {
									serpApi: { id: 'credential-id', name: 'serpApi Credential' },
								},
								name: 'SerpAPI',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.agentTool',
							version: 2.2,
							config: {
								parameters: {
									text: '=={{ $json.chatInput }}',
									options: {
										systemMessage:
											'You are an SEO Content Writer with expertise in creating search-optimized, high-quality content that ranks and converts.\n\nYour core responsibilities:\n- Create detailed content briefs\n- Write SEO-optimized blog posts and landing pages\n- Develop content calendars and topic clusters\n- Optimize existing content for better rankings\n- Implement on-page SEO best practices\n- Balance SEO requirements with user experience\n\nWhen analyzing a request:\n1. Develop content topic ideas based on keywords\n2. Create detailed content briefs (structure, headings, word count)\n3. Suggest content formats (how-to, listicle, guide, etc.)\n4. Provide on-page optimization checklist\n5. Recommend internal linking strategy\n6. Create content publishing schedule\n\nStructure your response with:\n- Content Topic Recommendations (10-15 topics)\n- Detailed Content Briefs (3-5 priority pieces)\n- Editorial Calendar (3-6 months)\n- On-Page Optimization Guidelines\n- Content Cluster Strategy\n- Meta Title & Description Templates\n- Internal Linking Recommendations\n\nCreate content strategies that serve both search engines and human readers, focusing on quality and relevance.',
									},
									toolDescription:
										'Specialist agent focused on creating SEO-optimized content, content briefs, editorial calendars, and on-page optimization.',
								},
								subnodes: {
									model: languageModel({
										type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
										version: 1.2,
										config: {
											parameters: {
												model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
												options: { temperature: 0.7 },
											},
											credentials: {
												openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
											},
											name: 'OpenAI Chat Model6',
										},
									}),
								},
								name: 'SEO Content Writer',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.agentTool',
							version: 2.2,
							config: {
								parameters: {
									text: '=={{ $json.chatInput }}',
									options: {
										systemMessage:
											'You are a Local SEO Specialist with expertise in optimizing businesses for local search and Google Maps visibility.\n\nYour core responsibilities:\n- Optimize Google Business Profile (GBP)\n- Build and manage local citations (NAP consistency)\n- Implement local schema markup\n- Create geo-targeted content strategies\n- Manage online reviews and reputation\n- Optimize for "near me" and local intent searches\n\nWhen analyzing a request:\n1. Assess local search opportunity and competition\n2. Provide GBP optimization checklist\n3. Identify citation building opportunities\n4. Suggest local content topics\n5. Create review generation strategy\n6. Recommend local link building tactics\n\nStructure your response with:\n- Google Business Profile Optimization Steps\n- Local Citation Building Plan (30-50 sources)\n- Local Schema Implementation\n- Geo-Targeted Content Strategy\n- Review Management Approach\n- Local Link Building Opportunities\n- Local Pack Ranking Factors\n\nFocus on strategies that improve local visibility and drive foot traffic or local conversions.',
									},
									toolDescription:
										'Specialist agent focused on local search optimization, Google Business Profile, local citations, and geo-targeted strategies.',
								},
								subnodes: {
									model: languageModel({
										type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
										version: 1.2,
										config: {
											parameters: {
												model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
												options: { temperature: 0.7 },
											},
											credentials: {
												openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
											},
											name: 'OpenAI Chat Model3',
										},
									}),
								},
								name: 'Local SEO Specialist',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.agentTool',
							version: 2.2,
							config: {
								parameters: {
									text: '=={{ $json.chatInput }}',
									options: {
										systemMessage:
											'You are a Link Building Strategist with expertise in earning high-quality backlinks and building domain authority.\n\nYour core responsibilities:\n- Develop comprehensive link building strategies\n- Create outreach campaign plans\n- Identify link-worthy content opportunities\n- Analyze competitor backlink profiles\n- Recommend guest posting and PR opportunities\n- Build relationships with relevant websites and influencers\n\nWhen analyzing a request:\n1. Identify target link sources (blogs, news sites, directories, industry sites)\n2. Create tiered link building approach (Tier 1, 2, 3)\n3. Develop outreach messaging templates\n4. Suggest linkable asset creation (infographics, tools, research)\n5. Recommend link monitoring and reporting\n6. Provide realistic timeline and effort estimates\n\nStructure your response with:\n- Target Link Sources (20-30 prospects)\n- Outreach Strategy & Templates\n- Linkable Asset Recommendations\n- Guest Posting Opportunities\n- PR & Digital PR Tactics\n- Monthly Link Building Goals\n- Success Metrics\n\nFocus on white-hat, sustainable link building practices that build long-term authority.',
									},
									toolDescription:
										'Specialist agent focused on backlink strategy, outreach campaigns, link acquisition tactics, and authority building.',
								},
								subnodes: {
									model: languageModel({
										type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
										version: 1.2,
										config: {
											parameters: {
												model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
												options: { temperature: 0.7 },
											},
											credentials: {
												openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
											},
											name: 'OpenAI Chat Model4',
										},
									}),
								},
								name: 'Link Building Strategist',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.agentTool',
							version: 2.2,
							config: {
								parameters: {
									text: '=={{ $json.chatInput }}',
									options: {
										systemMessage:
											'You are an SEO Analytics Specialist with expertise in tracking, measuring, and reporting SEO performance.\n\nYour core responsibilities:\n- Set up comprehensive SEO tracking systems\n- Define and monitor key performance indicators (KPIs)\n- Analyze Google Analytics and Search Console data\n- Track keyword rankings and visibility\n- Create custom dashboards and reports\n- Provide data-driven optimization recommendations\n\nWhen analyzing a request:\n1. Define relevant SEO KPIs and success metrics\n2. Recommend analytics tools and setup\n3. Create measurement framework\n4. Design reporting structure and frequency\n5. Identify data connections and integrations\n6. Suggest A/B testing opportunities\n\nStructure your response with:\n- Core SEO KPIs to Track\n- Analytics Setup Recommendations (GA4, GSC, etc.)\n- Dashboard Requirements\n- Reporting Schedule (weekly/monthly)\n- Tracking Implementation Steps\n- Conversion Tracking Setup\n- Alert & Monitoring Rules\n\nProvide actionable insights that connect SEO efforts to business outcomes.',
									},
									toolDescription:
										'Specialist agent focused on SEO performance tracking, analytics setup, KPI monitoring, and data-driven insights.',
								},
								subnodes: {
									model: languageModel({
										type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
										version: 1.2,
										config: {
											parameters: {
												model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
												options: { temperature: 0.7 },
											},
											credentials: {
												openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
											},
											name: 'OpenAI Chat Model5',
										},
									}),
								},
								name: 'SEO Analytics Specialist',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.agentTool',
							version: 2.2,
							config: {
								parameters: {
									text: '=={{ $json.chatInput }}',
									options: {
										systemMessage:
											'You are a Technical SEO Specialist with expertise in website optimization and technical infrastructure.\n\nYour core responsibilities:\n- Conduct technical SEO audits\n- Optimize site speed and Core Web Vitals\n- Implement schema markup and structured data\n- Fix crawling and indexing issues\n- Optimize site architecture and internal linking\n- Ensure mobile-friendliness and responsive design\n- Handle robots.txt, XML sitemaps, and canonical tags\n\nWhen analyzing a request:\n1. Identify critical technical issues\n2. Prioritize fixes by impact (High/Medium/Low)\n3. Provide specific implementation steps\n4. Recommend tools for monitoring\n5. Suggest performance benchmarks\n6. Consider technical scalability\n\nStructure your response with:\n- Critical Issues (immediate fixes needed)\n- Site Speed Recommendations\n- Schema Markup Opportunities\n- Crawlability Improvements\n- Mobile Optimization Steps\n- Monitoring & Maintenance Plan\n\nProvide technical but understandable recommendations with clear implementation guidance.',
									},
									toolDescription:
										'Specialist agent focused on technical SEO audits, site speed optimization, schema markup, crawlability, and technical infrastructure.',
								},
								subnodes: {
									model: languageModel({
										type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
										version: 1.2,
										config: {
											parameters: {
												model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
												options: { temperature: 0.7 },
											},
											credentials: {
												openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
											},
											name: 'OpenAI Chat Model2',
										},
									}),
								},
								name: 'Technical SEO Specialist',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.agentTool',
							version: 2.2,
							config: {
								parameters: {
									text: '=={{ $json.chatInput }}',
									options: {
										systemMessage:
											'You are a Keyword Research Specialist with deep expertise in SEO keyword strategy.\n\nYour core responsibilities:\n- Conduct comprehensive keyword research\n- Analyze search intent (informational, navigational, commercial, transactional)\n- Perform competitor keyword gap analysis\n- Create keyword clusters and content groups\n- Estimate search volumes and keyword difficulty\n- Identify long-tail keyword opportunities\n\nWhen analyzing a request:\n1. Identify primary target keywords (high volume, high intent)\n2. Suggest secondary keywords and variations\n3. Categorize keywords by search intent\n4. Provide estimated difficulty scores (Easy/Medium/Hard)\n5. Recommend keyword implementation strategy\n6. Suggest content topics based on keyword clusters\n\nAlways structure your response with:\n- Primary Keywords (3-5)\n- Secondary Keywords (10-15)\n- Long-tail Opportunities (5-10)\n- Search Intent Breakdown\n- Implementation Priority\n\nBe specific, data-driven, and actionable in your recommendations.',
									},
									toolDescription:
										'Specialist agent focused on keyword research, search intent analysis, competitor keyword analysis, and keyword clustering for SEO campaigns.',
								},
								subnodes: {
									model: languageModel({
										type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
										version: 1.2,
										config: {
											parameters: {
												model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
												options: { temperature: 0.7 },
											},
											credentials: {
												openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
											},
											name: 'OpenAI Chat Model1',
										},
									}),
								},
								name: 'Keyword Research Specialist',
							},
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: { parameters: { contextWindowLength: 25 }, name: 'Simple Memory' },
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini' },
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
				},
				position: [128, -752],
				name: 'SEO Director Agent',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chat',
			version: 1,
			config: {
				parameters: {
					message: '={{ $json.output }}',
					options: {},
					waitUserReply: false,
				},
				position: [880, -880],
				name: 'Respond to Chat',
			},
		}),
	)
	.add(
		sticky(
			'## How it works\nThis workflow acts as an autonomous "AI SEO Agency." It is managed by a **Director Agent** (top center) that coordinates a team of 6 specialists.\n\n1. **Analysis:** When you chat, the Director checks **Memory** and runs live market research using **SerpApi (Google Search)**.\n2. **Delegation:** Based on real-time data, the Director assigns tasks to the 6 **Specialist Agents** below (Keyword, Technical, Link Building, Analytics, Local, and Content).\n3. **Reporting:** The Director compiles their work into a single, professional strategy report.\n\n## Setup steps\n1. **OpenAI Keys:** Add your OpenAI API key to **all 7** "OpenAI Chat Model" nodes (1 for the Director, 6 for the Specialists).\n2. **SerpApi Key:** Click the "SEO Director Agent" node. Under "Tools" > "SerpApi," add your key to enable live Google Search.\n3. **Run:** Click "Active" and start chatting.',
			{ name: 'Sticky Note5', position: [-1184, -1296], width: 544, height: 448 },
		),
	)
	.add(
		sticky(
			'## The Manager Core\nThe **SEO Director Agent** is the brain. It receives your prompt, pulls context from **Memory**, and gathers live data via **SerpAPI** before deciding which specialists to hire for the job.',
			{ color: 7, position: [-208, -1088], width: 864, height: 528 },
		),
	)
	.add(
		sticky(
			"## The Specialist Team\nThese 6 nodes are configured as **Tools**. They don't run automatically; the Director calls them individually to perform specific tasks (like running a technical audit or researching keywords).\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Specialist LLMs\nThese models power the individual specialist agents. You need to add your OpenAI credential to each of these nodes (you can use the same key for all of them).",
			{ name: 'Sticky Note1', color: 7, position: [-784, -544], width: 1952, height: 592 },
		),
	);
