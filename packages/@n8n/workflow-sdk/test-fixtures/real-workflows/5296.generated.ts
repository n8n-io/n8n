const wf = workflow('FPkat5e1rGZqpC29', 'YouTube - Trend Explorer', { executionOrder: 'v1' })
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [140, 0],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.6,
			config: {
				parameters: {
					options: {
						systemMessage:
							'=You are an assistant that helps YouTube creators uncover what topics are trending in a given niche over the past two days.\n\n1. Niche Check\n\nIf the user has not yet specified a niche, respond with a short list of 5 popular niches (e.g. “fitness tips,” “tech reviews,” “kids’ crafts,” etc.) and ask them to choose one.\n\n2. Trend Search\n\nOnce you know the niche, choose up to three distinct search queries that reflect different angles of that niche.\n\nFor each query, call the youtube_search tool to retrieve videos published in the last 2 days.\n\n3. Data Handling\n\nThe tool returns multiple JSON entries, each with fields:\n  "video_id": "...", \n  "view_count": ..., \n  "like_count": ..., \n  "comment_count": ..., \n  "description": "...", \n  "channel_title": "...", \n  "tags": [...], \n  "channel_id": "..."\nVideos are delimited by ### NEXT VIDEO FOUND: ###.\n\n4. Insight Generation\n\nAggregate results across all queries. Don’t discuss individual videos; instead, synthesize overall patterns:\n\nCommon themes in titles/descriptions/tags\n\nRecurrent content formats or calls-to-action\n\nApproximate engagement ranges (views/likes/comments)\n\nProvide direct links:\n\nVideo: https://www.youtube.com/watch?v={video_id}\n\nChannel: https://www.youtube.com/channel/{channel_id}\n\n5. Final Output\n\nSummarize the top 2–3 trending topics or formats in this niche over the last 48 hours, with engagement snapshots.\n\nExplain why these themes are resonating and how the creator might leverage them.\n\nExample\n“Across the three searches, videos focusing on mental triggers in digital marketing accounted for 60–80 K views and 5 K–7 K likes. 3 out of 5 top videos used countdown lists (‘5 mental triggers…’), suggesting viewers favor bite-sized, actionable content.”',
					},
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.2,
						config: {
							parameters: {
								sessionKey: 'ai-agent-trend-explorer',
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1,
						config: {
							parameters: { options: {} },
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 1.2,
							config: {
								parameters: {
									name: 'youtube_search',
									workflowId: {
										__rl: true,
										mode: 'list',
										value: 'IktojxaOHrdHkURm',
										cachedResultName: 'Sub - Youtube Search',
									},
									description: 'Call this tool to search for trending videos based on a query.',
									jsonSchemaExample: '{\n	"search_term": "some_value"\n}',
									specifyInputSchema: true,
								},
								name: 'Workflow - Youtube Search',
							},
						}),
					],
				},
				position: [620, 0],
				name: 'AI Agent - Trend Explorer',
			},
		}),
	)
	.add(
		sticky(
			'## [n8n Automation] AI YouTube Trend Explorer – Try It Out!\n**This n8n template helps you automatically discover, analyze, and track trending topics and videos on YouTube using an AI-powered agent.**\n\nUse cases are many: This workflow is perfect for **YouTube creators** needing fresh video ideas, **digital marketers** scouting new campaign topics, **social media managers** who want to catch trends early, and **researchers** who want to analyze what’s viral.\n\n## How It Works\n- The workflow starts whenever a chat message is received (e.g., a trend question, a topic prompt, or a request for insights).\n- Incoming chat is routed to the **AI Agent – Trend Explorer** node:\n     + First, the agent triggers the **Workflow – YouTube Search** tool to gather the latest trending topics and keywords from YouTube.\n     + Next, the agent supplies this real-time YouTube data to the **OpenAI Chat Model** for deep analysis, trend interpretation, and unique insights.\n     + To provide context-aware answers and track ongoing interests, the agent also references a **Simple Memory** module, recalling past queries, and user instructions.\n- Finally, the result is a fast, data-driven, and smart trend report delivered instantly to your chat.\n\n## How To Set Up\n- Download the workflow package (including 2 .json files) and import it into your n8n interface.\n- Set up necessary access in the following components of the **AI Agent - Trend Explorer** node:\n    + **OpenAI Chat Model**: allows API connection for trend insights.\n    + **Workflow – YouTube Search**: searches for trending videos based on the query.\n    + **Simple Memory** (optional): enhances experience for ongoing sessions.\n- Start by sending a chat message on n8n.\n- Check the response from the AI agent in the same chat box.\n- Ask follow-ups, explore deeper, or trigger new searches - all in one chat thread.\n\n## Requirements\n- n8n instance (self-hosted or cloud).\n- Set up API access to **OpenAI Chat Model** for chat-based AI.\n\n## How To Customize\n- **Connect to your favorite chat platforms**: Easily integrate with additional chat triggers such as Telegram, Slack, or your preferred messaging app.\n- **Choose your preferred AI model**: If you want a different viewpoint, simply swap OpenAI Chat Model for Google Gemini, Claude, or any compatible LLM model in your workflow.\n- **Upgrade memory for smarter conversations**: For long-term recall or more advanced, context-aware chats, replace **Simple Memory** with a vector database like Pinecone or Redis.\n\n## Need Help?\nIf you’d like this workflow customized to fit your tools and platforms availability, or if you’re looking to build a tailored AI Agent for your own business - please feel free to reach out to [**Agent Circle**](https://www.agentcircle.ai/). We’re always here to support and help you to bring automation ideas to life.\n\nJoin our community on different platforms for support, inspiration and tips from others.\n\nWebsite: https://www.agentcircle.ai/\nEtsy: https://www.etsy.com/shop/AgentCircle\nGumroad: http://agentcircle.gumroad.com/\nDiscord Global: https://discord.gg/d8SkCzKwnP\nFB Page Global: https://www.facebook.com/agentcircle/\nFB Group Global: https://www.facebook.com/groups/aiagentcircle/\nX: https://x.com/agent_circle\nYouTube: https://www.youtube.com/@agentcircle\nLinkedIn: https://www.linkedin.com/company/agentcircle\n\n\n',
			{ name: 'Sticky Note1', position: [-720, -360], width: 660, height: 1420 },
		),
	)
	.add(
		sticky(
			'## 1. Start When A Chat Message Is Received\n- The workflow starts when a chat message (showing your request or trend question) is received by the system.\n',
			{ color: 4, position: [20, -360], width: 340, height: 980 },
		),
	)
	.add(
		sticky(
			'## 2. Process The Request & Return Response\n- Incoming chat is routed to the **AI Agent – Trend Explorer** node:\n     + First, the agent triggers the **Workflow – YouTube Search** tool to gather the latest trending topics and keywords from YouTube.\n     + Next, the agent supplies this real-time YouTube data to the **OpenAI Chat Model** for deep analysis, trend interpretation, and unique insights.\n     + To provide context-aware answers and track ongoing interests, the agent also references a **Simple Memory** module, recalling past queries, and user instructions.\n- Finally, the result is a fast, data-driven, and smart trend report delivered instantly to your chat.',
			{ name: 'Sticky Note2', color: 4, position: [380, -360], width: 700, height: 980 },
		),
	);
