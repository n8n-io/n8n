const wf = workflow(
	'STzi96JfL52BUuQD',
	'AI Voice Chat Agent with ElevenLabs and InfraNodus Graph RAG Knowledge',
	{ executionOrder: 'v1' },
)
	.add(
		trigger({
			type: 'n8n-nodes-base.webhook',
			version: 2,
			config: {
				parameters: {
					path: '171bf9a6-1390-4195-bd6b-ff3df2e27d1c',
					options: {},
					httpMethod: 'POST',
					responseMode: 'responseNode',
				},
				position: [60, 60],
				name: 'Webhook',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					text: '={{ $json.body.prompt }}',
					options: {
						systemMessage:
							"You are well-versed on Dmitry Paranyushkin's books through the tools you have access to. When you receive a user's query, assess which tools you have access to, decide on the tools to access (minimum 1, maximum 3), modify the query to better suit each tool's context, and send the request to the tool. \n\nIMPORTANT: Always access at least one of the tools and use the response to get the best possible answer.\n\nWhen you're generating a response, combine perspectives where they fit and point out discrepancies when they exist.",
					},
					promptType: 'define',
				},
				position: [520, -20],
				name: 'AI Agent',
			},
		}),
	)
	.then(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.2,
			config: { parameters: { options: {} }, position: [1060, -20], name: 'Respond to Webhook' },
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.respondToWebhook',
			version: 1.2,
			config: { parameters: { options: {} }, position: [1060, -20], name: 'Respond to Webhook' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1,
			config: {
				parameters: { model: 'gpt-4o', options: {} },
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [400, 540],
				name: 'OpenAI Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1.3,
			config: {
				parameters: {
					sessionKey: '={{ $json.body.sessionId }}',
					sessionIdType: 'customKey',
				},
				position: [680, 300],
				name: 'Simple Memory',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://infranodus.com/api/v1/graphAndAdvice?doNotSave=true&addStats=true&optimize=develop&includeGraph=false&includeGraphSummary=true&includeStatements=true',
					method: 'POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'name', value: 'waves_into_patterns' },
							{
								name: 'prompt',
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', `User's request adjusted to suit this context`, 'string') }}",
							},
							{ name: 'requestMode', value: 'response' },
							{ name: 'aiTopics', value: 'true' },
						],
					},
					genericAuthType: 'httpBearerAuth',
					toolDescription:
						'Make a request to The Waves into Patterns book which is well-versed in the questions of natural cycles, variability, fractal states, dynamics, and nonequilibrium stability. Including the following topics:\n\n<MainTopics>: \n1. System Influence: scale influence multiple \n2. Pattern Dynamics: pattern variability fractal \n3. Change Balance: dynamic wave time \n4. Center Transformation: center cycle dominant \n5. Growth Stages: growth exploration period \n6. Long Strategy: term state long \n7. Seasonal Relations: moon summer natural \n8. Flow Connection: exist breaking exploring \n</MainTopics>',
				},
				credentials: {
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
				},
				position: [1120, 300],
				name: 'Waves into Patterns Book Expert',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://infranodus.com/api/v1/graphAndAdvice?doNotSave=true&addStats=true&optimize=develop&includeGraph=false&includeGraphSummary=true&includeStatements=true',
					method: 'POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'name', value: 'special_agents_manual' },
							{
								name: 'prompt',
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', `User's request adjusted to suit this context`, 'string') }}",
							},
							{ name: 'requestMode', value: 'response' },
							{ name: 'aiTopics', value: 'true' },
						],
					},
					genericAuthType: 'httpBearerAuth',
					toolDescription:
						"Make a request to The Special Agent's Manual book which is well-versed in the questions of human agency, speciality, infiltration and tension dynamics, strategies, identities, finding the special in you as well as the following topics:\n\n<MainTopics>: \n1. Agent Activation: agent special activation \n2. System Dynamics: system body operating \n3. Order Flow: action time order \n4. Creative Process: create identity entity \n5. Movement Patterns: movement wave breathing \n6. Incoming Impact: incoming impulse impact \n7. Fiction Venture: fiction high risk \n8. Social Framework: preset possibility level \n</MainTopics>",
				},
				credentials: {
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
				},
				position: [900, 300],
				name: "Special Agent's Manual Book Expert",
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://infranodus.com/api/v1/graphAndAdvice?doNotSave=true&addStats=true&optimize=develop&includeGraph=false&includeGraphSummary=true&includeStatements=true',
					method: 'POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'name', value: 'the_flow_and_notion' },
							{
								name: 'prompt',
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', `User's request adjusted to suit this context`, 'string') }}",
							},
							{ name: 'requestMode', value: 'response' },
							{ name: 'aiTopics', value: 'true' },
						],
					},
					genericAuthType: 'httpBearerAuth',
					toolDescription:
						"The Flow and the Notion book which is well-versed in the questions of creating with someone, dreaming, making new shapes, dissipating ideas, art, and life. Including the following topics:\n\n<MainTopics>: \n1. Shape Dynamics: shape outline concentric \n2. Time Alignment: long practice time \n3. Man's Journey: bow man candle \n4. Notion Flow: image flow paranyushkin \n5. Essence Realization: process essence essential \n6. Life Choices: slave thing trace \n7. Wave Patterns: found light movement \n8. Synchrony Mediation: book circadian word \n9. Complete Vision: multiple synchrony mediate \n10. Instruction Guide: full \ninstruction foreword : instruction foreword \n</MainTopics>",
				},
				credentials: {
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
				},
				position: [1340, 300],
				name: 'The Flow and the Notion Book',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://infranodus.com/api/v1/graphAndAdvice?doNotSave=true&addStats=true&optimize=develop&includeGraph=false&includeGraphSummary=true&includeStatements=true',
					method: 'POST',
					options: {},
					sendBody: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{ name: 'name', value: 'polysingularity_letters' },
							{
								name: 'prompt',
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters1_Value', `User's request adjusted to suit this context`, 'string') }}",
							},
							{ name: 'requestMode', value: 'response' },
							{ name: 'aiTopics', value: 'true' },
						],
					},
					genericAuthType: 'httpBearerAuth',
					toolDescription:
						'The Polysingularity Letters book which is well-versed in the questions of polysingularity, multiplicity, networks, networking, art, and creative approach. And also these topics:\n\n<MainTopics>: \n1. Community Dynamics: network community connected \n2. Global Equilibrium: state global change \n3. Polysingular Practice: polysingularity thinking exist \n4. Temporal Relations: time moment thing \n5. Consciousness Source: social cognition view \n6. Meaning Creation: make orthodox meaning \n7. Dmitry Connections: post dmitry minute \n8. Linguistic Variations: wa ë ww \n</MainTopics>',
				},
				credentials: {
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
				},
				position: [1540, 300],
				name: 'The Polysingularity Letters Book',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			version: 1,
			config: {
				parameters: {
					options: {},
					modelName: 'models/gemini-2.5-flash-preview-04-17',
				},
				credentials: {
					googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
				},
				position: [400, 340],
				name: 'Google Gemini Chat Model',
			},
		}),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Expert #1\n\nAdd your InfraNodus graph here via the HTTP node using its name in the `body.name` field.\n\nDescribe what the expert does in the Description of the tool. You can use auto-generated Graph RAG summary from InfraNodus > Graph > Project Notes\n\n![Book Screenshot](https://i.ibb.co/rfxsJ4MV/circadian-special-agents-manual.png)',
			{ name: 'Sticky Note1', position: [840, 260], width: 200, height: 740 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Expert #2\n\nAdd your InfraNodus graph here via the HTTP node using its name in the `body.name` field.\n\nDescribe what the expert does in the Description of the tool. You can use auto-generated Graph RAG summary from InfraNodus > Graph > Project Notes\n\n![waves into patterns screen](https://i.ibb.co/1tDJSgVq/circadian-waves-into-patterns.png)',
			{ name: 'Sticky Note2', position: [1060, 260], width: 200, height: 740 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Expert #3\n\nYou can add more experts here. Just make to give them descriptive names, so the agent knows which one to connect to when it has a question. \n\n![flow and notion image](https://i.ibb.co/prLbFG0w/circadian-the-flow-and-notion.png)\n',
			{ name: 'Sticky Note3', position: [1280, 260], width: 200, height: 640 },
		),
	)
	.add(
		sticky(
			"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Chat Memory\n\nWe use the Simple Memory node to track the conversation's context so that the user can refer to previous messages as they converse with the model.",
			{ name: 'Sticky Note4', position: [620, 260], width: 200, height: 540 },
		),
	)
	.add(
		sticky(
			"## 2. AI Agent Workflow\n\n### Chooses which tool (expert) to use, depending on the user's message. Then receives the responses and synthesizes the final answer.\n\nMake sure you describe the tools available well both in the Agent's System Prompt and in the tools' descriptions. ",
			{ name: 'Sticky Note5', position: [420, -360], width: 460, height: 500 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## 1. Chat Trigger\n\nThe conversation will be triggered when you send a message via a webhook from your Elevenlabs AI Conversational agent. \n\n### 🚨 SEE THE NOTE AND THE LINK BELOW ON SETTING UP YOUR ELEVENLABS AGENT',
			{ name: 'Sticky Note6', position: [0, 40], height: 580 },
		),
	)
	.add(
		sticky(
			"## 3. Respond to the User\n\nOnce the response is generated, send it back to the user's chat in Telegram.",
			{ name: 'Sticky Note8', position: [980, -360], width: 260, height: 500 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## Expert #4\n\nYou can add more experts here. Just make to give them descriptive names, so the agent knows which one to connect to when it has a question. \n\n![infranodus graph](https://i.ibb.co/hRqxn8JN/circadian-conversation-book.png)',
			{ name: 'Sticky Note9', position: [1500, 260], width: 200, height: 640 },
		),
	)
	.add(
		sticky(
			"## Setting up ElevenLabs Conversational AI Agent\n\n### You will need to connect the Webhook trigger above to the Conversational AI agent of ElevenLabs. Then you can use their agent (and website widget) to converse with the experts in this workflow. Read the full tutorial at [ElevenLabs AI voice agent setup guide](https://support.noduslabs.com/hc/en-us/articles/20318967066396-How-to-Build-a-Text-Voice-AI-Agent-Chatbot-with-n8n-Elevenlabs-and-InfraNodus)\n\n1. Create an account at [https://elevenlabs.io/](https://elevenlabs.io/)\n\n2. Go to the **Conversational AI** section in the menu\n\n3. Go to **Agent > Create New Agent > Use Blank Template**\n\n4. In the **System Prompt** of the agent put the following text modified to relate to your content:\n\n```\nYou are well-versed on ... through the tools you have access to.\n1) When you receive a user's message, first answer something like \"I am consulting my knowledge and will respond soon\" or \"let me think about it and i'll get back to you\" or any other similar in meaning phrase\n2) Then forward the user's message, without any changes, to the knowledge_base tool.\n3) When you receive a response from the knowledge_base use this answer to respond to the user, use exactly the answer you received to respond.\nIMPORTANT: make the response more suitable for the conversational format making it more succint and shorter but maintaining all the specifics.\n```\n\n5. IMPORTANT: keep the reference to the `knowledge_base` tool above to let the ElevenLabs agent know that it's exactly that tool it needs to be using to access the knowledge. Replace `...` with your content. \n\n6. In the **Tools section** of the Agent's setup, click **Create a new tool**\n\n7. The name of the tool should be: **`knowledge_base`** (as you're referring to it in the system prompt)\n\n8. In the tool's description put in: \"A knowledge base on ....\" (replace ... with your topic)\n\n9. Choose the **POST method** and in the URL put the Webhook link from the n8n workflow you created in the Step 3 above. E.g. https://infranodus.app.n8n.cloud/webhook/your_hook_url\n\n10. Scroll to the **Body Parameters** and add the following parameters that will be submitted with the POST request:\n\na.  Identifier: `prompt`, Value type: LLM prompt, Description: The user's message. \n*You will use this value in the **AI Agent** node.*\n\nb. Identifier: `sessionId`, Value type: Dynamic variable, Variable name: system__conversation_id\n*You will use this in the **Chat Memory** node to keep the history of the interaction.*\n\n10. Save the tool, save the agent\n\n11. Run the test in ElevenLabs\n\n12. Check the n8n workflow logs (from Step 3) to see if the execution went well ",
			{ color: 3, position: [-820, 680], width: 1060, height: 980 },
		),
	)
	.add(
		sticky(
			'# AI Voice Agent that Chats to Your Experts (e.g. Books, Articles, etc)\n\n## Uses InfraNodus Knowledge Graphs as Experts (AI Agent tools)\n\n## Uses ElevenLabs for voice chat functionality\n\n## Uses an orchestrating AI Agent in n8n to choose the expert based on the query\n\n[Detailed tutorial](https://support.noduslabs.com/hc/en-us/articles/20318967066396-How-to-Build-a-Text-Voice-AI-Agent-Chatbot-with-n8n-Elevenlabs-and-InfraNodus)\n\n[Video Tutorial](https://www.youtube.com/watch?v=07-HZZQs5h0)\n\n\n[![Video tutorial](https://img.youtube.com/vi/07-HZZQs5h0/sddefault.jpg)](https://www.youtube.com/watch?v=07-HZZQs5h0)',
			{ name: 'Sticky Note7', color: 5, position: [-820, -360], width: 740, height: 980 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n## LLM to Use\n\nGoogle Flash Pro models are much faster than OpenAI. However, OpenAI can be more precise in function (expert) calling.',
			{ name: 'Sticky Note10', position: [340, 260], width: 200, height: 660 },
		),
	);
