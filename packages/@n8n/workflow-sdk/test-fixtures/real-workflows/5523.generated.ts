const wf = workflow('OvYZQiWH2KlJsFbK', 'Multi-Agent Evaluation (eval nodes)', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [-760, 40],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.9,
			config: {
				parameters: {
					options: {
						systemMessage:
							"=You are a helpful assistant who will have access to a few tools to help with responding to user queries. I am providing some instructions below on how to use the tools. Please follow the instructions carefully.\n\nFirst, check the search_db tool to check whether the query exists. The tool expects a query string. If you use this tool and find relevant information, don't use the websearch tool.\n\nUse the web search tool to search the web for relevant information if you need to. You can ONLY call this tool once. \n\nUse the calculator for math operations or tasks. \n\nUse the summarizer tool to summarize the output. It's required to use this once you have gathered all the information you need.",
						returnIntermediateSteps: true,
					},
				},
				position: [-380, -60],
				name: 'Search Agent',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.evaluation',
			version: 4.6,
			config: {
				parameters: { operation: 'checkIfEvaluating' },
				position: [320, -60],
				name: 'Evaluating?',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: 'f31d1137-3262-4d46-979a-e9fc3c24f670',
								name: 'tool_called',
								type: 'boolean',
								value:
									"={{ \n  $('When fetching a dataset row').item.json.tools_to_call\n    .split(',').map(t => t.trim())\n    .every(tool => $json.intermediateSteps.some(step => step.action.tool.toLowerCase() === tool)) \n}}",
							},
						],
					},
				},
				position: [540, -160],
				name: 'Check if tool called',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.evaluation',
			version: 4.6,
			config: {
				parameters: {
					outputs: {
						values: [
							{
								outputName: 'actual_tools_called',
								outputValue:
									"={{ $('Evaluating?').item.json.intermediateSteps.map(step => step.action.tool.toLowerCase()).join(', ') }}\n",
							},
						],
					},
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 969651976,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18F1WIEq1ykZKBO1bWYhC0YxRb2ngTurfsZ7jO6sGhLY/edit#gid=969651976',
						cachedResultName: 'Tool calling',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '18F1WIEq1ykZKBO1bWYhC0YxRb2ngTurfsZ7jO6sGhLY',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18F1WIEq1ykZKBO1bWYhC0YxRb2ngTurfsZ7jO6sGhLY/edit?usp=drivesdk',
						cachedResultName: 'n8n dataset for evaluation',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [760, -160],
				name: 'Set Outputs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.evaluation',
			version: 4.6,
			config: {
				parameters: {
					metrics: {
						assignments: [
							{
								id: '5855df91-5a74-44f9-b25b-23a111dbd7a1',
								name: 'tool_called',
								type: 'number',
								value: '={{ $json.tool_called.toNumber() }}',
							},
						],
					},
					operation: 'setMetrics',
				},
				position: [980, -160],
				name: 'Evaluation',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.noOp',
			version: 1,
			config: { position: [536, 40], name: 'Return chat response' },
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.evaluationTrigger',
			version: 4.6,
			config: {
				parameters: {
					sheetName: {
						__rl: true,
						mode: 'list',
						value: 969651976,
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18F1WIEq1ykZKBO1bWYhC0YxRb2ngTurfsZ7jO6sGhLY/edit#gid=969651976',
						cachedResultName: 'Tool calling',
					},
					documentId: {
						__rl: true,
						mode: 'list',
						value: '18F1WIEq1ykZKBO1bWYhC0YxRb2ngTurfsZ7jO6sGhLY',
						cachedResultUrl:
							'https://docs.google.com/spreadsheets/d/18F1WIEq1ykZKBO1bWYhC0YxRb2ngTurfsZ7jO6sGhLY/edit?usp=drivesdk',
						cachedResultName: 'n8n dataset for evaluation',
					},
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [-980, -160],
				name: 'When fetching a dataset row',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '3dec27ca-35df-47a7-9a53-d9b2d0b6c072',
								name: 'chatInput',
								type: 'string',
								value: '={{ $json.question }}',
							},
						],
					},
				},
				position: [-760, -160],
				name: 'Match chat format',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			version: 1,
			config: { position: [-420, 160], name: 'Calculator' },
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.toolWorkflow',
			version: 2.2,
			config: {
				parameters: {
					workflowId: {
						__rl: true,
						mode: 'list',
						value: 'fehTbkLtPtlVwDYq',
						cachedResultName: 'Summarizer Agent',
					},
					description: 'Call this tool to summarize the outputs. ',
					workflowInputs: {
						value: {
							query: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('query', ``, 'string') }}",
						},
						schema: [
							{
								id: 'query',
								type: 'string',
								display: true,
								required: false,
								displayName: 'query',
								defaultMatch: false,
								canBeUsedToMatch: true,
							},
						],
						mappingMode: 'defineBelow',
						matchingColumns: ['query'],
						attemptToConvertTypes: false,
						convertFieldsToString: false,
					},
				},
				position: [-300, 160],
				name: 'Summarizer',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequestTool',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.firecrawl.dev/v1/search',
					method: 'POST',
					options: {},
					sendBody: true,
					sendHeaders: true,
					authentication: 'genericCredentialType',
					bodyParameters: {
						parameters: [
							{
								name: 'query',
								value:
									"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters0_Value', ``, 'string') }}",
							},
							{ name: 'limit', value: '={{ "3".toNumber() }}' },
						],
					},
					genericAuthType: 'httpBearerAuth',
					headerParameters: {
						parameters: [{ name: 'content-type', value: 'application/json' }],
					},
				},
				credentials: {
					httpBearerAuth: { id: 'credential-id', name: 'httpBearerAuth Credential' },
				},
				position: [-180, 160],
				name: 'Web search',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
			version: 1,
			config: {
				parameters: { model: 'openai/o3', options: {} },
				credentials: {
					openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
				},
				position: [-540, 160],
				name: 'OpenRouter Chat Model',
			},
		}),
	)
	.add(
		node({
			type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
			version: 1.2,
			config: {
				parameters: { options: {} },
				credentials: {
					openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
				},
				position: [28, 360],
				name: 'Embeddings OpenAI',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.vectorStoreQdrant',
			version: 1.3,
			config: {
				parameters: {
					mode: 'retrieve-as-tool',
					options: {},
					toolDescription: 'Retrievel relevant results',
					qdrantCollection: {
						__rl: true,
						mode: 'list',
						value: 'search_queries',
						cachedResultName: 'search_queries',
					},
				},
				credentials: {
					qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' },
				},
				position: [-60, 160],
				name: 'Search_db',
			},
		}),
	);
