const wf = workflow('abSdfsaYgkssXX7g', 'Dynamically Selects Models Based on Input Type', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [-528, -112],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					batching: {},
					messages: {
						messageValues: [
							{
								message:
									'=Your task is to classify the type of request you receive as input.\nYou must provide the following output:\n- general: if it is a general request\n- reasoning: if it is a reasoning request\n- coding: if it is a request related to code development\n- search: if it is a request that involves the use of Google tools',
							},
						],
					},
					hasOutputParser: true,
				},
				subnodes: {
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
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.3,
						config: {
							parameters: {
								schemaType: 'manual',
								inputSchema:
									'{\n	"type": "object",\n	"properties": {\n		"request_type": {\n			"type": "string"\n		}\n	}\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [-288, -112],
				name: 'Request Type',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2.1,
			config: {
				parameters: {
					text: "={{ $('When chat message received').item.json.chatInput }}",
					options: { returnIntermediateSteps: true },
					promptType: 'define',
				},
				subnodes: {
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: {
							parameters: {
								sessionKey: "={{ $('When chat message received').item.json.sessionId }}",
								sessionIdType: 'customKey',
							},
							name: 'Simple Memory',
						},
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.modelSelector',
						version: 1,
						config: {
							parameters: {
								rules: {
									rule: [
										{
											conditions: {
												options: {
													version: 2,
													leftValue: '',
													caseSensitive: true,
													typeValidation: 'strict',
												},
												combinator: 'and',
												conditions: [
													{
														id: '976d83bb-7e9e-4aab-9722-25a9e238164f',
														operator: {
															name: 'filter.operator.equals',
															type: 'string',
															operation: 'equals',
														},
														leftValue: '={{ $json.output.request_type }}',
														rightValue: 'coding',
													},
												],
											},
										},
										{
											conditions: {
												options: {
													version: 2,
													leftValue: '',
													caseSensitive: true,
													typeValidation: 'strict',
												},
												combinator: 'and',
												conditions: [
													{
														id: '1e68688d-73fe-47c1-9b35-a1e226220bcd',
														operator: {
															name: 'filter.operator.equals',
															type: 'string',
															operation: 'equals',
														},
														leftValue: '={{ $json.output.request_type }}',
														rightValue: 'reasoning',
													},
												],
											},
											modelIndex: 2,
										},
										{
											conditions: {
												options: {
													version: 2,
													leftValue: '',
													caseSensitive: true,
													typeValidation: 'strict',
												},
												combinator: 'and',
												conditions: [
													{
														id: '61d58197-db59-4cd7-bc41-bbeaf5e7b069',
														operator: {
															name: 'filter.operator.equals',
															type: 'string',
															operation: 'equals',
														},
														leftValue: '={{ $json.output.request_type }}',
														rightValue: 'general',
													},
												],
											},
											modelIndex: 3,
										},
										{
											conditions: {
												options: {
													version: 2,
													leftValue: '',
													caseSensitive: true,
													typeValidation: 'strict',
												},
												combinator: 'and',
												conditions: [
													{
														id: 'fca2ec99-fd1d-458f-9919-73bfbba55c4f',
														operator: {
															name: 'filter.operator.equals',
															type: 'string',
															operation: 'equals',
														},
														leftValue: '={{ $json.output.request_type }}',
														rightValue: 'search',
													},
												],
											},
											modelIndex: 4,
										},
									],
								},
								numberInputs: 4,
							},
							subnodes: {
								model: [
									languageModel({
										type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
										version: 1.3,
										config: {
											parameters: {
												model: {
													__rl: true,
													mode: 'list',
													value: 'claude-sonnet-4-20250514',
													cachedResultName: 'Claude 4 Sonnet',
												},
												options: {},
											},
											credentials: {
												anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
											},
											name: 'Opus 4',
										},
									}),
									languageModel({
										type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
										version: 1,
										config: {
											parameters: { model: 'perplexity/sonar', options: {} },
											credentials: {
												openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
											},
											name: 'Perplexity',
										},
									}),
									languageModel({
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
											name: 'GPT 4.1 mini',
										},
									}),
									languageModel({
										type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
										version: 1,
										config: {
											parameters: {
												options: {},
												modelName: 'models/gemini-2.0-flash-thinking-exp',
											},
											credentials: {
												googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
											},
											name: 'Gemini Thinking Pro',
										},
									}),
								],
							},
						},
					}),
				},
				position: [160, -112],
				name: 'AI Agent',
			},
		}),
	)
	.add(
		sticky(
			'## AI Orchestrator: dynamically Selects Models Based on Input Type\n\nThis workflow is designed to intelligently **route user queries to the most suitable large language model (LLM)** based on the type of request received in a chat environment. It uses structured classification and model selection to optimize both performance and cost-efficiency in AI-driven conversations.\n\nIt dynamically routes requests to specialized AI models based on content type, optimizing response quality and efficiency.',
			{ position: [-528, -416], width: 624, height: 256 },
		),
	);
