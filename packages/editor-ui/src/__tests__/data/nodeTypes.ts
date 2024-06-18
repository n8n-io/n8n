import type { INodeTypeDescription } from 'n8n-workflow';

export const allNodeTypes: INodeTypeDescription[] = [
	{
		displayName: 'Manual Trigger',
		name: 'n8n-nodes-base.manualTrigger',
		icon: 'fa:mouse-pointer',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow on clicking a button in n8n',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'When clicking ‘Test workflow’',
			color: '#909298',
		},
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'This node is where the workflow execution starts (when you click the ‘test’ button on the canvas).<br><br> <a data-action="showNodeCreator">Explore other ways to trigger your workflow</a> (e.g on a schedule, or a webhook)',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.manualworkflowtrigger/',
					},
				],
			},
		},
	},
	{
		displayName: 'Edit Fields (Set)',
		name: 'n8n-nodes-base.set',
		icon: 'fa:pen',
		group: ['input'],
		description: 'Modify, add, or remove item fields',
		defaultVersion: 3.3,
		iconColor: 'blue',
		version: [3, 3.1, 3.2, 3.3],
		subtitle: '={{$parameter["mode"]}}',
		defaults: {
			name: 'Edit Fields',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Manual Mapping',
						value: 'manual',
						description: 'Edit item fields one by one',
						action: 'Edit item fields one by one',
					},
					{
						name: 'JSON',
						value: 'raw',
						description: 'Customize item output with JSON',
						action: 'Customize item output with JSON',
					},
				],
				default: 'manual',
			},
			{
				displayName: 'Duplicate Item',
				name: 'duplicateItem',
				type: 'boolean',
				default: false,
				isNodeSetting: true,
			},
			{
				displayName: 'Duplicate Item Count',
				name: 'duplicateCount',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description:
					'How many times the item should be duplicated, mainly used for testing and debugging',
				isNodeSetting: true,
				displayOptions: {
					show: {
						duplicateItem: [true],
					},
				},
			},
			{
				displayName:
					'Item duplication is set in the node settings. This option will be ignored when the workflow runs automatically.',
				name: 'duplicateWarning',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						duplicateItem: [true],
					},
				},
			},
			{
				displayName: 'JSON',
				name: 'jsonOutput',
				type: 'json',
				typeOptions: {
					rows: 5,
				},
				default: '{\n  "my_field_1": "value",\n  "my_field_2": 1\n}\n',
				validateType: 'object',
				ignoreValidationDuringExecution: true,
				displayOptions: {
					show: {
						mode: ['raw'],
					},
				},
			},
			{
				displayName: 'Fields to Set',
				name: 'fields',
				placeholder: 'Add Field',
				type: 'fixedCollection',
				description: 'Edit existing fields or add new ones to modify the output data',
				displayOptions: {
					show: {
						'@version': [3, 3.1, 3.2],
						mode: ['manual'],
					},
				},
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				default: {},
				options: [
					{
						name: 'values',
						displayName: 'Values',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g. fieldName',
								description:
									'Name of the field to set the value of. Supports dot-notation. Example: data.person[0].name.',
								requiresDataPath: 'single',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								description: 'The field value type',
								options: [
									{
										name: 'String',
										value: 'stringValue',
									},
									{
										name: 'Number',
										value: 'numberValue',
									},
									{
										name: 'Boolean',
										value: 'booleanValue',
									},
									{
										name: 'Array',
										value: 'arrayValue',
									},
									{
										name: 'Object',
										value: 'objectValue',
									},
								],
								default: 'stringValue',
							},
							{
								displayName: 'Value',
								name: 'stringValue',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										type: ['stringValue'],
									},
								},
								validateType: 'string',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Value',
								name: 'numberValue',
								type: 'string',
								default: '',
								displayOptions: {
									show: {
										type: ['numberValue'],
									},
								},
								validateType: 'number',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Value',
								name: 'booleanValue',
								type: 'options',
								default: 'true',
								options: [
									{
										name: 'True',
										value: 'true',
									},
									{
										name: 'False',
										value: 'false',
									},
								],
								displayOptions: {
									show: {
										type: ['booleanValue'],
									},
								},
								validateType: 'boolean',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Value',
								name: 'arrayValue',
								type: 'string',
								default: '',
								placeholder: 'e.g. [ arrayItem1, arrayItem2, arrayItem3 ]',
								displayOptions: {
									show: {
										type: ['arrayValue'],
									},
								},
								validateType: 'array',
								ignoreValidationDuringExecution: true,
							},
							{
								displayName: 'Value',
								name: 'objectValue',
								type: 'json',
								default: '={}',
								typeOptions: {
									rows: 2,
								},
								displayOptions: {
									show: {
										type: ['objectValue'],
									},
								},
								validateType: 'object',
								ignoreValidationDuringExecution: true,
							},
						],
					},
				],
			},
			{
				displayName: 'Fields to Set',
				name: 'assignments',
				type: 'assignmentCollection',
				displayOptions: {
					hide: {
						'@version': [3, 3.1, 3.2],
					},
					show: {
						mode: ['manual'],
					},
				},
				default: {},
			},
			{
				displayName: 'Include in Output',
				name: 'include',
				type: 'options',
				description: 'How to select the fields you want to include in your output items',
				default: 'all',
				displayOptions: {
					show: {
						'@version': [3, 3.1, 3.2],
					},
				},
				options: [
					{
						name: 'All Input Fields',
						value: 'all',
						description: 'Also include all unchanged fields from the input',
					},
					{
						name: 'No Input Fields',
						value: 'none',
						description: 'Include only the fields specified above',
					},
					{
						name: 'Selected Input Fields',
						value: 'selected',
						description: 'Also include the fields listed in the parameter “Fields to Include”',
					},
					{
						name: 'All Input Fields Except',
						value: 'except',
						description: 'Exclude the fields listed in the parameter “Fields to Exclude”',
					},
				],
			},
			{
				displayName: 'Include Other Input Fields',
				name: 'includeOtherFields',
				type: 'boolean',
				default: false,
				description:
					"Whether to pass to the output all the input fields (along with the fields set in 'Fields to Set')",
				displayOptions: {
					hide: {
						'@version': [3, 3.1, 3.2],
					},
				},
			},
			{
				displayName: 'Input Fields to Include',
				name: 'include',
				type: 'options',
				description: 'How to select the fields you want to include in your output items',
				default: 'all',
				displayOptions: {
					hide: {
						'@version': [3, 3.1, 3.2],
						'/includeOtherFields': [false],
					},
				},
				options: [
					{
						name: 'All',
						value: 'all',
						description: 'Also include all unchanged fields from the input',
					},
					{
						name: 'Selected',
						value: 'selected',
						description: 'Also include the fields listed in the parameter “Fields to Include”',
					},
					{
						name: 'All Except',
						value: 'except',
						description: 'Exclude the fields listed in the parameter “Fields to Exclude”',
					},
				],
			},
			{
				displayName: 'Fields to Include',
				name: 'includeFields',
				type: 'string',
				default: '',
				placeholder: 'e.g. fieldToInclude1,fieldToInclude2',
				description:
					'Comma-separated list of the field names you want to include in the output. You can drag the selected fields from the input panel.',
				requiresDataPath: 'multiple',
				displayOptions: {
					show: {
						include: ['selected'],
					},
				},
			},
			{
				displayName: 'Fields to Exclude',
				name: 'excludeFields',
				type: 'string',
				default: '',
				placeholder: 'e.g. fieldToExclude1,fieldToExclude2',
				description:
					'Comma-separated list of the field names you want to exclude from the output. You can drag the selected fields from the input panel.',
				requiresDataPath: 'multiple',
				displayOptions: {
					show: {
						include: ['except'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Binary File',
						name: 'includeBinary',
						type: 'boolean',
						default: true,
						description: 'Whether binary data should be included if present in the input item',
					},
					{
						displayName: 'Ignore Type Conversion Errors',
						name: 'ignoreConversionErrors',
						type: 'boolean',
						default: false,
						description:
							'Whether to ignore field type errors and apply a less strict type conversion',
						displayOptions: {
							show: {
								'/mode': ['manual'],
							},
						},
					},
					{
						displayName: 'Support Dot Notation',
						name: 'dotNotation',
						type: 'boolean',
						default: true,
						description:
							'By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }. If that is not intended this can be deactivated, it will then set { "a.b": value } instead.',
					},
				],
			},
		],
		codex: {
			categories: ['Core Nodes'],
			subcategories: {
				'Core Nodes': ['Data Transformation'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/',
					},
				],
			},
			alias: ['Set', 'JS', 'JSON', 'Filter', 'Transform', 'Map'],
		},
	},
	{
		displayName: 'Chat Trigger',
		name: '@n8n/n8n-nodes-langchain.chatTrigger',
		icon: 'fa:comments',
		iconColor: 'black',
		group: ['trigger'],
		version: 1,
		description: 'Runs the workflow when an n8n generated webchat is submitted',
		defaults: { name: 'When chat message received' },
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/',
					},
				],
			},
		},
		supportsCORS: true,
		maxNodes: 1,
		inputs:
			"={{ (() => {\n\t\t\tif (!['hostedChat', 'webhook'].includes($parameter.mode)) {\n\t\t\t\treturn [];\n\t\t\t}\n\t\t\tif ($parameter.options?.loadPreviousSession !== 'memory') {\n\t\t\t\treturn [];\n\t\t\t}\n\n\t\t\treturn [\n\t\t\t\t{\n\t\t\t\t\tdisplayName: 'Memory',\n\t\t\t\t\tmaxConnections: 1,\n\t\t\t\t\ttype: 'ai_memory',\n\t\t\t\t\trequired: true,\n\t\t\t\t}\n\t\t\t];\n\t\t })() }}",
		outputs: ['main'],
		credentials: [
			{
				name: 'httpBasicAuth',
				required: true,
				displayOptions: { show: { authentication: ['basicAuth'] } },
			},
		],
		webhooks: [
			{
				name: 'setup',
				httpMethod: 'GET',
				responseMode: 'onReceived',
				path: 'chat',
				ndvHideUrl: true,
			},
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: '={{$parameter.options?.["responseMode"] || "lastNode" }}',
				path: 'chat',
				ndvHideMethod: true,
				ndvHideUrl: '={{ !$parameter.public }}',
			},
		],
		eventTriggerDescription: 'Waiting for you to submit the chat',
		activationMessage: 'You can now make calls to your production chat URL.',
		triggerPanel: false,
		properties: [
			{
				displayName: 'Make Chat Publicly Available',
				name: 'public',
				type: 'boolean',
				default: false,
				description:
					'Whether the chat should be publicly available or only accessible through the manual chat interface',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{ name: 'Hosted Chat', value: 'hostedChat', description: 'Chat on a page served by n8n' },
					{
						name: 'Embedded Chat',
						value: 'webhook',
						description: 'Chat through a widget embedded in another page, or by calling a webhook',
					},
				],
				default: 'hostedChat',
				displayOptions: { show: { public: [true] } },
			},
			{
				displayName:
					'Chat will be live at the URL above once you activate this workflow. Live executions will show up in the ‘executions’ tab',
				name: 'hostedChatNotice',
				type: 'notice',
				displayOptions: { show: { mode: ['hostedChat'], public: [true] } },
				default: '',
			},
			{
				displayName:
					'Follow the instructions <a href="https://www.npmjs.com/package/@n8n/chat" target="_blank">here</a> to embed chat in a webpage (or just call the webhook URL at the top of this section). Chat will be live once you activate this workflow',
				name: 'embeddedChatNotice',
				type: 'notice',
				displayOptions: { show: { mode: ['webhook'], public: [true] } },
				default: '',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				displayOptions: { show: { public: [true] } },
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth',
						description: 'Simple username and password (the same one for all users)',
					},
					{
						name: 'n8n User Auth',
						value: 'n8nUserAuth',
						description: 'Require user to be logged in with their n8n account',
					},
					{ name: 'None', value: 'none' },
				],
				default: 'none',
				description: 'The way to authenticate',
			},
			{
				displayName: 'Initial Message(s)',
				name: 'initialMessages',
				type: 'string',
				displayOptions: { show: { mode: ['hostedChat'], public: [true] } },
				typeOptions: { rows: 3 },
				default: 'Hi there! 👋\nMy name is Nathan. How can I assist you today?',
				description: 'Default messages shown at the start of the chat, one per line',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: { show: { mode: ['hostedChat', 'webhook'], public: [true] } },
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Allowed Origins (CORS)',
						name: 'allowedOrigins',
						type: 'string',
						default: '*',
						description:
							'Comma-separated list of URLs allowed for cross-origin non-preflight requests. Use * (default) to allow all origins.',
					},
					{
						displayName: 'Input Placeholder',
						name: 'inputPlaceholder',
						type: 'string',
						displayOptions: { show: { '/mode': ['hostedChat'] } },
						default: 'Type your question..',
						placeholder: 'e.g. Type your message here',
						description: 'Shown as placeholder text in the chat input field',
					},
					{
						displayName: 'Load Previous Session',
						name: 'loadPreviousSession',
						type: 'options',
						options: [
							{
								name: 'Off',
								value: 'notSupported',
								description: 'Loading messages of previous session is turned off',
							},
							{
								name: 'From Memory',
								value: 'memory',
								description: 'Load session messages from memory',
							},
							{
								name: 'Manually',
								value: 'manually',
								description: 'Manually return messages of session',
							},
						],
						default: 'notSupported',
						description: 'If loading messages of a previous session should be enabled',
					},
					{
						displayName: 'Response Mode',
						name: 'responseMode',
						type: 'options',
						options: [
							{
								name: 'When Last Node Finishes',
								value: 'lastNode',
								description: 'Returns data of the last-executed node',
							},
							{
								name: "Using 'Respond to Webhook' Node",
								value: 'responseNode',
								description: 'Response defined in that node',
							},
						],
						default: 'lastNode',
						description: 'When and how to respond to the webhook',
					},
					{
						displayName: 'Require Button Click to Start Chat',
						name: 'showWelcomeScreen',
						type: 'boolean',
						displayOptions: { show: { '/mode': ['hostedChat'] } },
						default: false,
						description: 'Whether to show the welcome screen at the start of the chat',
					},
					{
						displayName: 'Start Conversation Button Text',
						name: 'getStarted',
						type: 'string',
						displayOptions: { show: { showWelcomeScreen: [true], '/mode': ['hostedChat'] } },
						default: 'New Conversation',
						placeholder: 'e.g. New Conversation',
						description: 'Shown as part of the welcome screen, in the middle of the chat window',
					},
					{
						displayName: 'Subtitle',
						name: 'subtitle',
						type: 'string',
						displayOptions: { show: { '/mode': ['hostedChat'] } },
						default: "Start a chat. We're here to help you 24/7.",
						placeholder: "e.g. We're here for you",
						description: 'Shown at the top of the chat, under the title',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						displayOptions: { show: { '/mode': ['hostedChat'] } },
						default: 'Hi there! 👋',
						placeholder: 'e.g. Welcome',
						description: 'Shown at the top of the chat',
					},
				],
			},
		],
	},
	{
		displayName: 'AI Agent',
		name: '@n8n/n8n-nodes-langchain.agent',
		icon: 'fa:robot',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
		description: 'Generates an action plan and executes it. Can use external tools.',
		subtitle:
			"={{ {\ttoolsAgent: 'Tools Agent', conversationalAgent: 'Conversational Agent', openAiFunctionsAgent: 'OpenAI Functions Agent', reActAgent: 'ReAct Agent', sqlAgent: 'SQL Agent', planAndExecuteAgent: 'Plan and Execute Agent' }[$parameter.agent] }}",
		defaults: { name: 'AI Agent', color: '#404040' },
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: { AI: ['Agents', 'Root Nodes'] },
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/',
					},
				],
			},
		},
		inputs:
			'={{\n\t\t\t((agent, hasOutputParser) => {\n\t\t\t\tfunction getInputs(agent, hasOutputParser) {\n    const getInputData = (inputs) => {\n        const displayNames = {\n            ["ai_languageModel"]: \'Model\',\n            ["ai_memory"]: \'Memory\',\n            ["ai_tool"]: \'Tool\',\n            ["ai_outputParser"]: \'Output Parser\',\n        };\n        return inputs.map(({ type, filter }) => {\n            const input = {\n                type,\n                displayName: type in displayNames ? displayNames[type] : undefined,\n                required: type === "ai_languageModel",\n                maxConnections: ["ai_languageModel", "ai_memory"].includes(type)\n                    ? 1\n                    : undefined,\n            };\n            if (filter) {\n                input.filter = filter;\n            }\n            return input;\n        });\n    };\n    let specialInputs = [];\n    if (agent === \'conversationalAgent\') {\n        specialInputs = [\n            {\n                type: "ai_languageModel",\n                filter: {\n                    nodes: [\n                        \'@n8n/n8n-nodes-langchain.lmChatAnthropic\',\n                        \'@n8n/n8n-nodes-langchain.lmChatGroq\',\n                        \'@n8n/n8n-nodes-langchain.lmChatOllama\',\n                        \'@n8n/n8n-nodes-langchain.lmChatOpenAi\',\n                        \'@n8n/n8n-nodes-langchain.lmChatGooglePalm\',\n                        \'@n8n/n8n-nodes-langchain.lmChatGoogleGemini\',\n                        \'@n8n/n8n-nodes-langchain.lmChatMistralCloud\',\n                        \'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi\',\n                    ],\n                },\n            },\n            {\n                type: "ai_memory",\n            },\n            {\n                type: "ai_tool",\n            },\n            {\n                type: "ai_outputParser",\n            },\n        ];\n    }\n    else if (agent === \'toolsAgent\') {\n        specialInputs = [\n            {\n                type: "ai_languageModel",\n                filter: {\n                    nodes: [\n                        \'@n8n/n8n-nodes-langchain.lmChatAnthropic\',\n                        \'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi\',\n                        \'@n8n/n8n-nodes-langchain.lmChatMistralCloud\',\n                        \'@n8n/n8n-nodes-langchain.lmChatOpenAi\',\n                        \'@n8n/n8n-nodes-langchain.lmChatGroq\',\n                    ],\n                },\n            },\n            {\n                type: "ai_memory",\n            },\n            {\n                type: "ai_tool",\n                required: true,\n            },\n            {\n                type: "ai_outputParser",\n            },\n        ];\n    }\n    else if (agent === \'openAiFunctionsAgent\') {\n        specialInputs = [\n            {\n                type: "ai_languageModel",\n                filter: {\n                    nodes: [\n                        \'@n8n/n8n-nodes-langchain.lmChatOpenAi\',\n                        \'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi\',\n                    ],\n                },\n            },\n            {\n                type: "ai_memory",\n            },\n            {\n                type: "ai_tool",\n                required: true,\n            },\n            {\n                type: "ai_outputParser",\n            },\n        ];\n    }\n    else if (agent === \'reActAgent\') {\n        specialInputs = [\n            {\n                type: "ai_languageModel",\n            },\n            {\n                type: "ai_tool",\n            },\n            {\n                type: "ai_outputParser",\n            },\n        ];\n    }\n    else if (agent === \'sqlAgent\') {\n        specialInputs = [\n            {\n                type: "ai_languageModel",\n            },\n            {\n                type: "ai_memory",\n            },\n        ];\n    }\n    else if (agent === \'planAndExecuteAgent\') {\n        specialInputs = [\n            {\n                type: "ai_languageModel",\n            },\n            {\n                type: "ai_tool",\n            },\n            {\n                type: "ai_outputParser",\n            },\n        ];\n    }\n    if (hasOutputParser === false) {\n        specialInputs = specialInputs.filter((input) => input.type !== "ai_outputParser");\n    }\n    return ["main", ...getInputData(specialInputs)];\n};\n\t\t\t\treturn getInputs(agent, hasOutputParser)\n\t\t\t})($parameter.agent, $parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true)\n\t\t}}',
		outputs: ['main'],
		credentials: [
			{
				name: 'mySql',
				required: true,
				testedBy: 'mysqlConnectionTest',
				displayOptions: { show: { agent: ['sqlAgent'], '/dataSource': ['mysql'] } },
			},
			{
				name: 'postgres',
				required: true,
				displayOptions: { show: { agent: ['sqlAgent'], '/dataSource': ['postgres'] } },
			},
		],
		properties: [
			{
				displayName:
					'Save time with an <a href="/templates/1954" target="_blank">example</a> of how this node works',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: { show: { agent: ['conversationalAgent'] } },
			},
			{
				displayName: 'Agent',
				name: 'agent',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Conversational Agent',
						value: 'conversationalAgent',
						description:
							'Selects tools to accomplish its task and uses memory to recall previous conversations',
					},
					{
						name: 'OpenAI Functions Agent',
						value: 'openAiFunctionsAgent',
						description:
							"Utilizes OpenAI's Function Calling feature to select the appropriate tool and arguments for execution",
					},
					{
						name: 'Plan and Execute Agent',
						value: 'planAndExecuteAgent',
						description:
							'Plan and execute agents accomplish an objective by first planning what to do, then executing the sub tasks',
					},
					{
						name: 'ReAct Agent',
						value: 'reActAgent',
						description: 'Strategically select tools to accomplish a given task',
					},
					{
						name: 'SQL Agent',
						value: 'sqlAgent',
						description: 'Answers questions about data in an SQL database',
					},
				],
				default: 'conversationalAgent',
				displayOptions: { show: { '@version': [{ _cnd: { lte: 1.5 } }] } },
			},
			{
				displayName: 'Agent',
				name: 'agent',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Tools Agent',
						value: 'toolsAgent',
						description:
							'Utilized unified Tool calling interface to select the appropriate tools and argument for execution',
					},
					{
						name: 'Conversational Agent',
						value: 'conversationalAgent',
						description:
							'Selects tools to accomplish its task and uses memory to recall previous conversations',
					},
					{
						name: 'OpenAI Functions Agent',
						value: 'openAiFunctionsAgent',
						description:
							"Utilizes OpenAI's Function Calling feature to select the appropriate tool and arguments for execution",
					},
					{
						name: 'Plan and Execute Agent',
						value: 'planAndExecuteAgent',
						description:
							'Plan and execute agents accomplish an objective by first planning what to do, then executing the sub tasks',
					},
					{
						name: 'ReAct Agent',
						value: 'reActAgent',
						description: 'Strategically select tools to accomplish a given task',
					},
					{
						name: 'SQL Agent',
						value: 'sqlAgent',
						description: 'Answers questions about data in an SQL database',
					},
				],
				default: 'toolsAgent',
				displayOptions: { show: { '@version': [{ _cnd: { gte: 1.6 } }] } },
			},
			{
				displayName: 'Prompt',
				name: 'promptType',
				type: 'options',
				options: [
					{
						name: 'Take from previous node automatically',
						value: 'auto',
						description: 'Looks for an input field called chatInput',
					},
					{
						name: 'Define below',
						value: 'define',
						description:
							'Use an expression to reference data in previous nodes or enter static text',
					},
				],
				default: 'auto',
				displayOptions: { hide: { '@version': [{ _cnd: { lte: 1.2 } }], agent: ['sqlAgent'] } },
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Hello, how can you help me?',
				typeOptions: { rows: 2 },
				displayOptions: { show: { promptType: ['define'] }, hide: { agent: ['sqlAgent'] } },
			},
			{
				displayName: 'Require Specific Output Format',
				name: 'hasOutputParser',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				displayOptions: { hide: { '@version': [{ _cnd: { lte: 1.2 } }], agent: ['sqlAgent'] } },
			},
			{
				displayName:
					"Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_outputParser'>output parser</a> on the canvas to specify the output format you require",
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: { show: { hasOutputParser: [true] } },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: { show: { agent: ['toolsAgent'] } },
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'System Message',
						name: 'systemMessage',
						type: 'string',
						default: 'You are a helpful assistant',
						description:
							'The message that will be sent to the agent before the conversation starts',
						typeOptions: { rows: 6 },
					},
					{
						displayName: 'Max Iterations',
						name: 'maxIterations',
						type: 'number',
						default: 10,
						description: 'The maximum number of iterations the agent will run before stopping',
					},
					{
						displayName: 'Return Intermediate Steps',
						name: 'returnIntermediateSteps',
						type: 'boolean',
						default: false,
						description:
							'Whether or not the output should include intermediate steps the agent took',
					},
				],
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['conversationalAgent'], '@version': [1] } },
				default: '={{ $json.input }}',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['conversationalAgent'], '@version': [1.1] } },
				default: '={{ $json.chat_input }}',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['conversationalAgent'], '@version': [1.2] } },
				default: '={{ $json.chatInput }}',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: { show: { agent: ['conversationalAgent'] } },
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Human Message',
						name: 'humanMessage',
						type: 'string',
						default:
							"TOOLS\n------\nAssistant can ask the user to use tools to look up information that may be helpful in answering the users original question. The tools the human can use are:\n\n{tools}\n\n{format_instructions}\n\nUSER'S INPUT\n--------------------\nHere is the user's input (remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):\n\n{{input}}",
						description: 'The message that will provide the agent with a list of tools to use',
						typeOptions: { rows: 6 },
					},
					{
						displayName: 'System Message',
						name: 'systemMessage',
						type: 'string',
						default:
							'Assistant is a large language model trained by OpenAI.\n\nAssistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.\n\nAssistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.\n\nOverall, Assistant is a powerful system that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether you need help with a specific question or just want to have a conversation about a particular topic, Assistant is here to assist.',
						description:
							'The message that will be sent to the agent before the conversation starts',
						typeOptions: { rows: 6 },
					},
					{
						displayName: 'Max Iterations',
						name: 'maxIterations',
						type: 'number',
						default: 10,
						description: 'The maximum number of iterations the agent will run before stopping',
					},
					{
						displayName: 'Return Intermediate Steps',
						name: 'returnIntermediateSteps',
						type: 'boolean',
						default: false,
						description:
							'Whether or not the output should include intermediate steps the agent took',
					},
				],
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['openAiFunctionsAgent'], '@version': [1] } },
				default: '={{ $json.input }}',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['openAiFunctionsAgent'], '@version': [1.1] } },
				default: '={{ $json.chat_input }}',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['openAiFunctionsAgent'], '@version': [1.2] } },
				default: '={{ $json.chatInput }}',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: { show: { agent: ['openAiFunctionsAgent'] } },
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'System Message',
						name: 'systemMessage',
						type: 'string',
						default: 'You are a helpful AI assistant.',
						description:
							'The message that will be sent to the agent before the conversation starts',
						typeOptions: { rows: 6 },
					},
					{
						displayName: 'Max Iterations',
						name: 'maxIterations',
						type: 'number',
						default: 10,
						description: 'The maximum number of iterations the agent will run before stopping',
					},
					{
						displayName: 'Return Intermediate Steps',
						name: 'returnIntermediateSteps',
						type: 'boolean',
						default: false,
						description:
							'Whether or not the output should include intermediate steps the agent took',
					},
				],
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['reActAgent'], '@version': [1] } },
				default: '={{ $json.input }}',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['reActAgent'], '@version': [1.1] } },
				default: '={{ $json.chat_input }}',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['reActAgent'], '@version': [1.2] } },
				default: '={{ $json.chatInput }}',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: { show: { agent: ['reActAgent'] } },
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Human Message Template',
						name: 'humanMessageTemplate',
						type: 'string',
						default: '{input}\n\n{agent_scratchpad}',
						description: 'String to use directly as the human message template',
						typeOptions: { rows: 6 },
					},
					{
						displayName: 'Prefix Message',
						name: 'prefix',
						type: 'string',
						default:
							'Answer the following questions as best you can. You have access to the following tools:',
						description: 'String to put before the list of tools',
						typeOptions: { rows: 6 },
					},
					{
						displayName: 'Suffix Message for Chat Model',
						name: 'suffixChat',
						type: 'string',
						default:
							'Begin! Reminder to always use the exact characters `Final Answer` when responding.',
						description:
							'String to put after the list of tools that will be used if chat model is used',
						typeOptions: { rows: 6 },
					},
					{
						displayName: 'Suffix Message for Regular Model',
						name: 'suffix',
						type: 'string',
						default: 'Begin!\n\n\tQuestion: {input}\n\tThought:{agent_scratchpad}',
						description:
							'String to put after the list of tools that will be used if regular model is used',
						typeOptions: { rows: 6 },
					},
					{
						displayName: 'Return Intermediate Steps',
						name: 'returnIntermediateSteps',
						type: 'boolean',
						default: false,
						description:
							'Whether or not the output should include intermediate steps the agent took',
					},
				],
			},
			{
				displayName: 'Data Source',
				name: 'dataSource',
				type: 'options',
				displayOptions: { show: { agent: ['sqlAgent'], '@version': [{ _cnd: { lt: 1.4 } }] } },
				default: 'sqlite',
				description: 'SQL database to connect to',
				options: [
					{ name: 'MySQL', value: 'mysql', description: 'Connect to a MySQL database' },
					{ name: 'Postgres', value: 'postgres', description: 'Connect to a Postgres database' },
					{
						name: 'SQLite',
						value: 'sqlite',
						description: 'Use SQLite by connecting a database file as binary input',
					},
				],
			},
			{
				displayName: 'Data Source',
				name: 'dataSource',
				type: 'options',
				displayOptions: { show: { agent: ['sqlAgent'], '@version': [{ _cnd: { gte: 1.4 } }] } },
				default: 'postgres',
				description: 'SQL database to connect to',
				options: [
					{ name: 'MySQL', value: 'mysql', description: 'Connect to a MySQL database' },
					{ name: 'Postgres', value: 'postgres', description: 'Connect to a Postgres database' },
					{
						name: 'SQLite',
						value: 'sqlite',
						description: 'Use SQLite by connecting a database file as binary input',
					},
				],
			},
			{ displayName: 'Credentials', name: 'credentials', type: 'credentials', default: '' },
			{
				displayName:
					"Pass the SQLite database into this node as binary data, e.g. by inserting a 'Read/Write Files from Disk' node beforehand",
				name: 'sqLiteFileNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { agent: ['sqlAgent'], dataSource: ['sqlite'] } },
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				placeholder: 'e.g data',
				hint: 'The name of the input binary field containing the file to be extracted',
				displayOptions: { show: { agent: ['sqlAgent'], dataSource: ['sqlite'] } },
			},
			{
				displayName: 'Prompt',
				name: 'input',
				type: 'string',
				displayOptions: { show: { agent: ['sqlAgent'], '@version': [{ _cnd: { lte: 1.2 } }] } },
				default: '',
				required: true,
				typeOptions: { rows: 5 },
			},
			{
				displayName: 'Prompt',
				name: 'promptType',
				type: 'options',
				options: [
					{
						name: 'Take from previous node automatically',
						value: 'auto',
						description: 'Looks for an input field called chatInput',
					},
					{
						name: 'Define below',
						value: 'define',
						description:
							'Use an expression to reference data in previous nodes or enter static text',
					},
				],
				default: 'auto',
				displayOptions: {
					hide: { '@version': [{ _cnd: { lte: 1.2 } }] },
					show: { agent: ['sqlAgent'] },
				},
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. Hello, how can you help me?',
				typeOptions: { rows: 2 },
				displayOptions: { show: { promptType: ['define'], agent: ['sqlAgent'] } },
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: { show: { agent: ['sqlAgent'] } },
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Ignored Tables',
						name: 'ignoredTables',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of tables to ignore from the database. If empty, no tables are ignored.',
					},
					{
						displayName: 'Include Sample Rows',
						name: 'includedSampleRows',
						type: 'number',
						description:
							'Number of sample rows to include in the prompt to the agent. It helps the agent to understand the schema of the database but it also increases the amount of tokens used.',
						default: 3,
					},
					{
						displayName: 'Included Tables',
						name: 'includedTables',
						type: 'string',
						default: '',
						description:
							'Comma-separated list of tables to include in the database. If empty, all tables are included.',
					},
					{
						displayName: 'Prefix Prompt',
						name: 'prefixPrompt',
						type: 'string',
						default:
							'You are an agent designed to interact with an SQL database.\nGiven an input question, create a syntactically correct {dialect} query to run, then look at the results of the query and return the answer.\nUnless the user specifies a specific number of examples they wish to obtain, always limit your query to at most {top_k} results using the LIMIT clause.\nYou can order the results by a relevant column to return the most interesting examples in the database.\nNever query for all the columns from a specific table, only ask for a the few relevant columns given the question.\nYou have access to tools for interacting with the database.\nOnly use the below tools. Only use the information returned by the below tools to construct your final answer.\nYou MUST double check your query before executing it. If you get an error while executing a query, rewrite the query and try again.\n\nDO NOT make any DML statements (INSERT, UPDATE, DELETE, DROP etc.) to the database.\n\nIf the question does not seem related to the database, just return "I don\'t know" as the answer.',
						description: 'Prefix prompt to use for the agent',
						typeOptions: { rows: 10 },
					},
					{
						displayName: 'Suffix Prompt',
						name: 'suffixPrompt',
						type: 'string',
						default:
							'Begin!\nChat History:\n{chatHistory}\n\nQuestion: {input}\nThought: I should look at the tables in the database to see what I can query.\n{agent_scratchpad}',
						description: 'Suffix prompt to use for the agent',
						typeOptions: { rows: 4 },
					},
					{
						displayName: 'Limit',
						name: 'topK',
						type: 'number',
						default: 10,
						description: 'The maximum number of results to return',
					},
				],
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['planAndExecuteAgent'], '@version': [1] } },
				default: '={{ $json.input }}',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['planAndExecuteAgent'], '@version': [1.1] } },
				default: '={{ $json.chat_input }}',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				displayOptions: { show: { agent: ['planAndExecuteAgent'], '@version': [1.2] } },
				default: '={{ $json.chatInput }}',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: { show: { agent: ['planAndExecuteAgent'] } },
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Human Message Template',
						name: 'humanMessageTemplate',
						type: 'string',
						default:
							'Previous steps: {previous_steps}\n\nCurrent objective: {current_step}\n\n{agent_scratchpad}\n\nYou may extract and combine relevant data from your previous steps when responding to me.',
						description: 'The message that will be sent to the agent during each step execution',
						typeOptions: { rows: 6 },
					},
				],
			},
		],
	},
];
