const wf = workflow('', '')
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: 'my-calendar' },
				subnodes: {
					tools: [
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									end: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('End', ``, 'string') }}",
									start:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Start', ``, 'string') }}",
									calendar: {
										__rl: true,
										mode: 'list',
										value: 'user@example.com',
										cachedResultName: 'user@example.com',
									},
									additionalFields: {
										summary: '={{ $fromAI("event_title", "The event title", "string") }}',
										description:
											'={{ $fromAI("event_description", "The event description", "string") }}',
									},
								},
								name: 'CreateEvent',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									eventId:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Event_ID', ``, 'string') }}",
									options: {},
									calendar: {
										__rl: true,
										mode: 'list',
										value: 'user@example.com',
										cachedResultName: 'user@example.com',
									},
									operation: 'delete',
								},
								name: 'DeleteEvent',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									limit:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Limit', ``, 'number') }}",
									options: {},
									timeMax:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Before', ``, 'string') }}",
									timeMin:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('After', ``, 'string') }}",
									calendar: {
										__rl: true,
										mode: 'list',
										value: 'user@example.com',
										cachedResultName: 'user@example.com',
									},
									operation: 'getAll',
								},
								name: 'SearchEvent',
							},
						}),
						tool({
							type: 'n8n-nodes-base.googleCalendarTool',
							version: 1.3,
							config: {
								parameters: {
									eventId:
										"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Event_ID', ``, 'string') }}",
									calendar: {
										__rl: true,
										mode: 'list',
										value: 'user@example.com',
										cachedResultName: 'user@example.com',
									},
									operation: 'update',
									updateFields: {
										end: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('End', ``, 'string') }}",
										start:
											"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Start', ``, 'string') }}",
										summary: '={{ $fromAI("event_title", "The event title", "string") }}',
										description:
											'={{ $fromAI("event_description", "The event description", "string") }}',
									},
								},
								name: 'UpdateEvent',
							},
						}),
					],
				},
				position: [2060, -20],
				name: 'Google Calendar MCP',
			},
		}),
	)
	.add(
		trigger({
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			version: 1.1,
			config: {
				parameters: {
					workflowInputs: {
						values: [{ name: 'function_name' }, { name: 'payload', type: 'object' }],
					},
				},
				position: [1440, 880],
				name: 'When Executed by Another Workflow',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.switch',
			version: 3.2,
			config: {
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'UPPERCASE',
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
											id: 'ab18304c-4f73-430f-b9fa-2ce4d098e1fa',
											operator: { type: 'string', operation: 'equals' },
											leftValue: '={{ $json.function_name }}',
											rightValue: 'uppercase',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'LOWERCASE',
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
											id: '606bda79-f401-4de2-be9d-51368c794479',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.function_name }}',
											rightValue: 'lowercase',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'RANDOM DATA',
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
											id: '4b22e689-e652-47d2-b737-7be00da9f185',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.function_name }}',
											rightValue: 'random_user_data',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'JOKE',
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
											id: '27a75a2c-8058-4a7c-85c1-898cabeac4a1',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.function_name }}',
											rightValue: 'joke',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [1660, 860],
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
								id: '42333f26-8e14-438a-9965-eec31bf4b6a3',
								name: 'converted_text',
								type: 'string',
								value: '={{ $json.payload.text.toUpperCase() }}',
							},
						],
					},
				},
				position: [2000, 520],
				name: 'Convert Text to Upper Case',
			},
		}),
	)
	.output(1)
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
								id: '42333f26-8e14-438a-9965-eec31bf4b6a3',
								name: 'converted_text',
								type: 'string',
								value: '={{ $json.payload.text.toLowerCase() }}',
							},
						],
					},
				},
				position: [2000, 720],
				name: 'Convert Text to Lower Case',
			},
		}),
	)
	.output(2)
	.then(
		node({
			type: 'n8n-nodes-base.debugHelper',
			version: 1,
			config: {
				parameters: {
					category: 'randomData',
					randomDataCount: '={{ $json.payload.number }}',
				},
				position: [2000, 1020],
				name: 'Random user data',
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
								id: 'b4548cbe-f3fc-4911-901a-d73182d710a9',
								name: 'First name',
								type: 'string',
								value: '={{ $json.firstname }}',
							},
							{
								id: '6e573a27-ef03-4254-8f9b-2c471e1540c2',
								name: 'Last name',
								type: 'string',
								value: '={{ $json.lastname }}',
							},
							{
								id: 'ac5b5806-bf8e-4e1a-a47d-e7180d31e98a',
								name: 'Email',
								type: 'string',
								value: '={{ $json.email }}',
							},
						],
					},
				},
				position: [2220, 1020],
				name: 'Return only some fields',
			},
		}),
	)
	.output(3)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://official-joke-api.appspot.com/jokes/random/{{ $json.payload.number }}',
					options: {},
				},
				position: [2000, 1220],
				name: 'Joke Request',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [240, -180],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.8,
			config: {
				parameters: {
					options: {
						systemMessage:
							'=You are a helpful assistant.\nCurrent datetime is {{ $now.toString() }}',
					},
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4o',
									cachedResultName: 'gpt-4o',
								},
								options: {},
							},
							name: 'OpenAI 4o',
						},
					}),
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.mcpClientTool',
							version: 1,
							config: {
								parameters: { sseEndpoint: 'https://n8n.yourdomain/mcp/my-calendar/sse' },
								name: 'Calendar MCP',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.mcpClientTool',
							version: 1,
							config: {
								parameters: { sseEndpoint: 'https://n8n.yourdomain/mcp/my-functions/sse' },
								name: 'My Functions',
							},
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: { name: 'Simple Memory' },
					}),
				},
				position: [440, -180],
				name: 'AI Agent',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: 'my-functions' },
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.1,
							config: {
								parameters: {
									name: 'convert_text_case',
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description: 'Call this tool to convert text to lower case or upper case.',
									workflowInputs: {
										value: {
											payload:
												'={\n  "text": "{{ $fromAI("text_to_convert", "The text to convert", "string") }}"\n}\n',
											function_name:
												'={{ $fromAI("function_name", "Either lowercase or uppercase", "string") }}',
										},
										schema: [
											{
												id: 'function_name',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'function_name',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'payload',
												type: 'object',
												display: true,
												removed: false,
												required: false,
												displayName: 'payload',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Convert Text',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.1,
							config: {
								parameters: {
									name: 'obtain_jokes',
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description: 'Call this tool to obtain random jokes',
									workflowInputs: {
										value: {
											payload:
												'={\n  "number": {{ $fromAI("amount", "The amount of jokes to request", "number") }}\n}',
											function_name: 'joke',
										},
										schema: [
											{
												id: 'function_name',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'function_name',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'payload',
												type: 'object',
												display: true,
												removed: false,
												required: false,
												displayName: 'payload',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Random Jokes',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.1,
							config: {
								parameters: {
									name: 'random_user_data',
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description: 'Generate random user data',
									workflowInputs: {
										value: {
											payload:
												'={\n  "number": {{ $fromAI("amount", "The amount of user data to generate in integer format", "number") }}\n}',
											function_name: 'random_user_data',
										},
										schema: [
											{
												id: 'function_name',
												type: 'string',
												display: true,
												removed: false,
												required: false,
												displayName: 'function_name',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'payload',
												type: 'object',
												display: true,
												removed: false,
												required: false,
												displayName: 'payload',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
										],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Generate random user data',
							},
						}),
					],
				},
				position: [1440, -20],
				name: 'My Functions Server',
			},
		}),
	)
	.add(
		sticky(
			'## Activate the workflow to make the MCP Trigger work\nIn order to make the MCP server available, you need to activate the workflow.\n\nThen copy the Production URL of the MCP Trigger and paste it in the corresponding MCP Client tool.',
			{ color: 3, position: [1320, -180], width: 620, height: 520 },
		),
	)
	.add(
		sticky(
			'## MCP Clients\nFor every tool here you need to obtain he corresponding Production URL from the MCP Triggers on the right 👉',
			{ name: 'Sticky Note1', color: 7, position: [820, -180], width: 440, height: 520 },
		),
	)
	.add(
		sticky(
			'# Try these example requests with the AI Agent\n\n### My Functions MCP\n1. Use your tools to convert this text to lower case: `EXAMPLE TeXt`\n\n2. Use your tools to convert this text to upper case: `example TeXt`\n\n3. Generate 5 random user data, please.\n\n4. Please obtain 3 jokes.\n\n\n\n\n### Calendar MCP\n5. What is my schedule for next week?\n\n6. I have a meeting with John tomorrow at 2pm. Please add it to my Calendar.\n\n7. Adjust the time of my meeting with John tomorrow from 2pm to 4pm, please.\n\n8. Cancel my meeting with John, tomorrow.',
			{ name: 'Sticky Note2', color: 7, position: [-480, -180], width: 660, height: 640 },
		),
	)
	.add(
		sticky(
			'## The My Functions MCP calls this sub-workflow every time.\nA subworkflow is a separate workflow that can be called by other workflows and is able to receive parameters.\nLearn more about sub-workflows **[here](https://docs.n8n.io/flow-logic/subworkflows/)**',
			{ name: 'Sticky Note3', color: 7, position: [1320, 360], width: 1260, height: 1060 },
		),
	)
	.add(
		sticky(
			"## Google Calendar tools require credentials\nIf you don't have your Google Credentials set up in n8n yet, watch [this](https://www.youtube.com/watch?v=3Ai1EPznlAc) video to learn how to do it.\n\nIf you are using n8n Cloud plans, it's very intuitive to setup and you may not even need the tutorial.",
			{ name: 'Sticky Note4', color: 5, position: [1960, -180], width: 620, height: 520 },
		),
	)
	.add(
		sticky(
			'# Need help?\nFor getting help with this workflow, please create a topic on the community forums here:\nhttps://community.n8n.io/c/questions/',
			{ name: 'Sticky Note6', position: [-480, 1160], width: 660, height: 180 },
		),
	)
	.add(
		sticky(
			'## Why model 4o? 👆\nAfter testing 4o-mini it had some difficulties handling the calendar requests, while the 4o model handled it with ease.\n\nDepending on your prompt and tools, 4o-mini might be able to work well too, but it requires further testing.',
			{ name: 'Sticky Note7', color: 7, position: [240, 160], height: 240 },
		),
	)
	.add(
		sticky('', {
			name: 'Sticky Note8',
			color: 4,
			position: [-480, -340],
			width: 3060,
			height: 140,
		}),
	)
	.add(
		sticky('# Learn How to Build an MCP Server and Client', {
			name: 'Sticky Note9',
			color: 4,
			position: [640, -300],
			width: 800,
			height: 80,
		}),
	)
	.add(
		sticky(
			'# Author\n![Solomon](https://gravatar.com/avatar/79aa147f090807fe0f618fb47a1de932669e385bb0c84bf3a7f891ae7d174256?r=pg&d=retro&size=200)\n### Solomon\nFreelance consultant from Brazil, specializing in automations and data analysis. I work with select clients, addressing their toughest projects.\n\nFor business inquiries, email me at automations.solomon@gmail.com\nOr message me on [Telegram](https://t.me/salomaoguilherme) for a faster response.\n\n### Check out my other templates\n### 👉 https://n8n.io/creators/solomon/\n',
			{ name: 'Sticky Note10', color: 7, position: [-480, 480], width: 660, height: 660 },
		),
	)
	.add(
		sticky(
			'### 💡 **Want to learn advanced n8n skills and earn money building workflows?**\n‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎Check out [Scrapes Academy](https://www.skool.com/scrapes/about?ref=21f10ad99f4d46ba9b8aaea8c9f58c34)',
			{ name: 'Sticky Note16', color: 4, position: [-460, 1020], width: 620, height: 80 },
		),
	);
