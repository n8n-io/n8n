const wf = workflow('STAFgThRSXspfU6H', 'Team of AI Copywriters', { executionOrder: 'v1' })
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [-180, -20],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					options: {
						systemMessage:
							'#Overview\nYou are a Copy Assistant Agent responsible for managing and routing user requests to the appropriate specialized copywriting agents based on input. You are the control coordinator for generating and delivering high‑quality platform‑ready marketing copy.\n\n## Context\nYou are connected to multiple specialized copywriting tools:\n\nSales Letter Agent\nCold Email Copywriter\n\nYou also interact with an OpenAI chat model and a memory system to retain conversational context\n\nOnce copy is generated, your role is to deliver it clearly and accurately to the user and update the connected Google Doc with the final version.\n\n## Instrcutions\nWhen a user request is received, determine its intent and route it to the correct agent:\nAd Copy Agent → punchy headlines, descriptions & CTAs for display/search/social ads\nVSL Script Agent → full‑length video sales letters with hook, problem/solution, proof, CTA\nAd Script Agent → short (15–60 sec) video ad scripts for TikTok, Instagram, YouTube\nSales Letter Agent → long‑form email or web sales letters with storytelling, proof, bullets\nCold Email Copywriter → concise, personalized outreach sequences (subjects, intros, value props, follow‑ups)\n\n## Tools\nAd Copy Agent: punchy headlines, descriptions & CTAs for social/display/search ads\nVSL Script Agent: longer video‑sales‑letter scripts with hook, problem/solution, proof, CTA\nAd Script Agent: short video ad scripts (15–60 sec) for TikTok, Instagram, YouTube\nSales Letter Agent: long‑form email or web sales letters with story, proof, bullets\nCold Email Copywriter: concise outreach sequences—subject lines, intros, value props, follow‑ups\n\n## Examples\n“Need a Facebook ad for our new fitness app.” → route to Ad Copy Agent\n“Write a 3‑minute VSL script pitching our automation tool.” → route to VSL Script Agent\n“30‑second TikTok spot for our gourmet coffee.” → route to Ad Script Agent\n“Long‑form sales letter for B2B software.” → route to Sales Letter Agent\n“5‑step cold email sequence to logistics managers.” → route to Cold Email Copywriter\n\n## SOPs\nInterpret intent: read the user’s brief, spot format and goal\nSelect agent: map to the tool that matches (ad, VSL, email, etc.)\nPrompt agent: pass along the brief plus brand voice or any notes\nReview output: check tone, formatting, brand compliance\nDeliver: send clean, formatted copy back to the user\nDocument: paste final approved copy into the shared Google Doc\n\n## Final Notes\nKeep things concise, conversational, user‑focused\nAlways ask if you need more brand details or style guidelines\nStay friendly and collaborative\nStore context so follow‑up tweaks are seamless',
					},
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: { name: 'Simple Memory' },
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
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.2,
							config: {
								parameters: {
									workflowId: {
										__rl: true,
										mode: 'list',
										value: 'HQuj3iBV1PlI0HY1',
										cachedResultName: 'Sales Letter Agent',
									},
									description: 'Call this tool when user request for sales letters sequence',
									workflowInputs: {
										value: {},
										schema: [],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Sales Letter Tool',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.2,
							config: {
								parameters: {
									workflowId: {
										__rl: true,
										mode: 'list',
										value: 'ZtScEU9B5PNPnIcP',
										cachedResultName: 'Cold Email Copywriter',
									},
									description: 'Call this tool when the user requests cold email sequences',
									workflowInputs: {
										value: {},
										schema: [],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Cold Email Writer Tool',
							},
						}),
					],
				},
				position: [120, -20],
				name: 'Copy Assistant',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDocs',
			version: 2,
			config: {
				parameters: {
					actionsUi: {
						actionFields: [{ text: '={{ $json.output }}', action: 'insert' }],
					},
					operation: 'update',
					documentURL:
						'https://docs.google.com/document/d/1eI4Pdje4As0KEYjEG3prMUQCiLe-tUswnwNUVQG2GSw/edit?tab=t.0',
				},
				credentials: {
					googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' },
				},
				position: [480, -20],
				name: 'Update a document',
			},
		}),
	);
