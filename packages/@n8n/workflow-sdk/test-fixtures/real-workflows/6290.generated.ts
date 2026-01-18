const wf = workflow('wnDz3dZ455lkg5la', 'Website Chatbot Agent', {
	timezone: 'America/Chicago',
	callerPolicy: 'workflowsFromSameOwner',
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { mode: 'webhook', public: true, options: {} },
				position: [60, 80],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					options: {
						systemMessage:
							"=You are Dan Bot, the helpful, friendly chatbot assistant for Marketing Ladder, a marketing agency. You don’t answer questions yourself, you send every request to the right tool. \n\nAvailable Tools\nRAGagent – Use to answer FAQs and anything about Marketing Ladder.\ncalendarAgent – Use to check availability and book consultations.\nticketAgent – Use when the user wants a human, you don’t have enough info, or you can’t complete the request.\n\n\nCore Capabilities\n1. Answer FAQs\nIf a user asks a question, immediately query the RAGagent.\nNever guess, improvise, or answer on your own.\nNo tool call = no answer.\n\n2. Book Consultations\nIf a user wants to book a consultation, collect the following information:\nFull name, Company Name, Email address, their goal for the consultation, preferred day and time (remember: Chicago timezone, 30-min meetings)\n\nProcess:\n-Check their preferred slot with calendarAgent.\n-If unavailable, offer the closest alternate available times on the same day. \n-Once they pick a slot, confirm all details (name, email, goal, time).\n-After confirmation, use calendarAgent to book and send them confirmation.\nGolden Rule: Never double book. Always check availability first.\n\n3. Escalate to a Human Agent if any of these happen:\n\n-RAGagent can’t find an answer\n-User wants to talk to a human\n-You can’t complete their request\n\nThen:\nAsk if they’d like to be contacted by a human agent. If yes, collect:\nFirst name, Email address, Description of their issue or question\nThen, use ticketAgent to create a support ticket.\n\nRules of Engagement:\n-No improvisation. Tools only.\n-Always clarify if info is missing or unclear.\n-The current date is {{ $now.format('yyyy-MM-dd') }}. You are in the Chicago timezone. Always confirm this when talking about times.\n-Redirect trolls. If someone derails the convo away from Marketing Ladder, steer them back or offer to escalate to a human.\n-Have a friendly, conversational tone of voice, but stick to the point.\n-Default CTA: Always try to book them in for a consultation. That’s your north star.\n",
					},
				},
				position: [560, 80],
				name: 'Ultimate Website Chatbot Agent',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.2,
			config: {
				parameters: {
					model: {
						__rl: true,
						mode: 'list',
						value: 'gpt-4o-mini',
						cachedResultName: 'gpt-4o-mini',
					},
					options: {},
				},
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [200, 460],
				name: 'OpenAI Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.toolWorkflow',
			version: 2,
			config: {
				parameters: {
					name: 'calendarAgent',
					workflowId: {
						__rl: true,
						mode: 'list',
						value: 'LpmYLHWdvevdwt5e',
						cachedResultName: 'Calendar Agent',
					},
					description: 'Call this tool for any calendar action.',
					workflowInputs: {
						value: {},
						schema: [],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
				},
				position: [1140, 500],
				name: 'calendarAgent',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.toolWorkflow',
			version: 2,
			config: {
				parameters: {
					name: 'RAGagent',
					workflowId: {
						__rl: true,
						mode: 'list',
						value: 'IkEdDr98G9p54XDT',
						cachedResultName: 'RAG Agent',
					},
					description:
						"=Call this tool to get answers for FAQs regarding Kamexa. \nThe input should always be the question you want answered along with the following sessionId - {{ $('When chat message received').item.json.sessionId }}",
					workflowInputs: {
						value: {},
						schema: [],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
				},
				position: [940, 580],
				name: 'RAGagent',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.toolWorkflow',
			version: 2,
			config: {
				parameters: {
					name: 'ticketAgent',
					workflowId: {
						__rl: true,
						mode: 'list',
						value: 'tMyGGwgRHFuqYKg3',
						cachedResultName: 'Ticket Agent',
					},
					description:
						'Call this tool to create a support ticket for a human agent to followup on via email. \n\nThe input should be the users name and email address and a snippet of the users request. ',
					workflowInputs: {
						value: {},
						schema: [],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
				},
				position: [680, 620],
				name: 'ticketAgent',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: { contextWindowLength: 10 },
				position: [440, 540],
				name: 'Simple Memory',
			},
		}),
	)
	.add(
		sticky(
			'# Website Chatbot Agent with Modular Sub-Agent Architecture\n\n#### Overview \nThis workflow implements a modular **Website AI Chatbot Assistant** capable of handling multiple types of customer interactions autonomously. Instead of relying on a single large agent to handle all logic and tools, this system routes user queries to specialized sub-agents—each dedicated to a specific function.\n\n By using a manager-style orchestration layer, this approach prevents overloading a single AI model with excessive context, leading to cleaner routing, faster execution, and easier scaling as your automation needs grow.\n\n\n#### How It Works\n\n**1. Chat Trigger**  \n- The flow is initiated when a chat message is received via the website widget.\n\n**2. Manager Agent (Ultimate Website AI Assistant)**  \n- The central LLM-based agent is responsible for parsing the message and deciding which specialized sub-agent to route it to.\n- It uses an OpenAI GPT model for natural language understanding and a lightweight memory system to preserve recent context.\n\n**3. Sub-Agent Routing**  \n- `calendarAgent`: Handles availability checks and books meetings on connected calendars.  \n- `RAGAgent`: Searches company documentation or FAQs to provide accurate responses from your internal knowledge base.  \n- `ticketAgent`: Forwards requests to human support by generating and sending support tickets to a designated email.\n\n---\n\n#### Setup Instructions\n\n1. **Embed the Chatbot**  \n   - Use a custom HTML widget or script to embed the chatbot interface on your website.  \n   - Connect the frontend to the webhook that triggers the `When chat message received` node.\n\n2. **Configure Your OpenAI Key**  \n   - Insert your API key in the `OpenAI Chat Model` node.  \n   - Adjust the model parameters for temperature, max tokens, etc., based on how formal or creative you want the bot to be.\n\n3. **Customize Sub-Agents**  \n   - `calendarAgent`: Connect to your Google or Outlook calendar.  \n   - `RAGAgent`: Link to a vector store or document database via API or native integration.  \n   - `ticketAgent`: Set the destination email and format for ticket generation (e.g. via SendGrid or SMTP).\n\n4. **Deploy in Production**  \n   - Host on n8n Cloud or your self-hosted instance.  \n   - Monitor usage through the Executions tab and refine prompts based on user behavior.\n\n---\n\n#### Benefits\n\n- Modular system with dedicated logic per function  \n- Reduces token bloat by offloading complexity to sub-agents  \n- Easy to scale by adding more tools (e.g. CRM, analytics)  \n- Fast and responsive user experience for customers on your site  \n- Cleaner code structure and easier debugging\n',
			{ position: [-700, -360], width: 660, height: 1480 },
		),
	);
