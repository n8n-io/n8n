const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			version: 1.1,
			config: {
				parameters: {
					workflowInputs: {
						values: [
							{ name: 'operation' },
							{ name: 'workflowIds' },
							{ name: 'parameters', type: 'object' },
						],
					},
				},
				position: [-3060, 600],
				name: 'When Executed by Another Workflow',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.redis',
			version: 1,
			config: {
				parameters: {
					key: 'mcp_n8n_tools',
					options: {},
					operation: 'get',
					propertyName: 'data',
				},
				credentials: { redis: { id: 'credential-id', name: 'redis Credential' } },
				position: [-2860, 600],
				name: 'Get Memory',
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
								outputKey: 'Add',
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
											id: '3254a8f9-5fd3-4089-be16-cc3fd20639b8',
											operator: { type: 'string', operation: 'equals' },
											leftValue:
												"={{ $('When Executed by Another Workflow').first().json.operation }}",
											rightValue: 'addWorkflow',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'remove',
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
											id: 'a33dd02d-5192-48c9-b569-eafddabd2462',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue:
												"={{ $('When Executed by Another Workflow').first().json.operation }}",
											rightValue: 'removeWorkflow',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'list',
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
											id: '2d68dc3f-a213-47f8-8453-1bceae404653',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue:
												"={{ $('When Executed by Another Workflow').first().json.operation }}",
											rightValue: 'listWorkflows',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'search',
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
											id: '2146a87e-1a50-4caa-a2ee-f7f6fc2b19c9',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue:
												"={{ $('When Executed by Another Workflow').first().json.operation }}",
											rightValue: 'searchWorkflows',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'execute',
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
											id: '98b25a51-2cb5-49af-9609-827245595dc9',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue:
												"={{ $('When Executed by Another Workflow').first().json.operation }}",
											rightValue: 'executeWorkflow',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				position: [-2660, 560],
				name: 'Operations',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.n8n',
			version: 1,
			config: {
				parameters: { filters: { tags: 'mcp' }, requestOptions: {} },
				credentials: { n8nApi: { id: 'credential-id', name: 'n8nApi Credential' } },
				position: [-2400, 200],
				name: 'Get MCP-tagged Workflows',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.filter',
			version: 2.2,
			config: {
				parameters: {
					options: {},
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
								id: '90c97733-48de-4402-8388-5d49e3534388',
								operator: { type: 'boolean', operation: 'true', singleValue: true },
								leftValue:
									"={{\n$json.id\n  ? $('When Executed by Another Workflow').first().json.workflowIds.split(',').includes($json.id)\n  : false\n}}",
								rightValue: '={{ $json.id }}',
							},
						],
					},
				},
				position: [-2180, 200],
				name: 'Filter Matching Ids',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
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
								id: '15aef770-639e-4df0-900f-29013ccd00c4',
								operator: { type: 'object', operation: 'notEmpty', singleValue: true },
								leftValue: '={{ $json }}',
								rightValue: '',
							},
						],
					},
				},
				position: [-1960, 200],
				name: 'Workflow Exists?',
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
								id: '821226b0-12ad-4d1d-81c3-dfa3c286cce4',
								name: 'id',
								type: 'string',
								value: '={{ $json.id }}',
							},
							{
								id: '629d95d6-2501-4ad4-a5ed-e557237e1cc2',
								name: 'name',
								type: 'string',
								value: '={{ $json.name }}',
							},
							{
								id: '30699f7c-98d3-44ee-9749-c5528579f7e6',
								name: 'description',
								type: 'string',
								value:
									"={{\n$json.nodes\n  .filter(node => node.type === 'n8n-nodes-base.stickyNote')\n  .filter(node => node.parameters.content.toLowerCase().includes('try it out'))\n  .map(node => node.parameters.content.substr(0,255) + '...')\n  .join('\\n')\n}}",
							},
							{
								id: '6199c275-1ced-4f72-ba59-cb068db54c1b',
								name: 'parameters',
								type: 'string',
								value:
									'={{\n(function(node) {\n  if (!node) return {};\n  const inputs = node.parameters.workflowInputs.values;\n  return {\n    "type": "object",\n    "required": inputs.map(input => input.name),\n    "properties": inputs.reduce((acc, input) => ({\n      ...acc,\n      [input.name]: { type: input.type ?? \'string\' }\n    }), {})\n  }\n})(\n$json.nodes\n  .filter(node => node.type === \'n8n-nodes-base.executeWorkflowTrigger\')\n  .first()\n)\n.toJsonString()\n}}',
							},
						],
					},
				},
				position: [-1740, 0],
				name: 'Simplify Workflows',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.redis',
			version: 1,
			config: {
				parameters: {
					key: 'mcp_n8n_tools',
					value:
						"={{\n($('Get Memory').item.json.data?.parseJson() ?? [])\n  .concat($input.all().map(item => item.json))\n  .toJsonString()\n}}",
					operation: 'set',
				},
				credentials: { redis: { id: 'credential-id', name: 'redis Credential' } },
				position: [-1520, 0],
				name: 'Store In Memory',
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
								id: 'd921063f-e8ed-44a8-95a0-4402ecde6c5d',
								name: '=response',
								type: 'string',
								value: "={{ $('Simplify Workflows').all().length }} tools were added successfully.",
							},
						],
					},
				},
				position: [-1300, 0],
				name: 'AddTool Success',
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
								id: '8c4e0763-a4ff-4e8a-a992-13e4e12a5685',
								name: 'response',
								type: 'string',
								value: 'Expected Tools matching Ids given, but none found.',
							},
						],
					},
				},
				position: [-1740, 200],
				name: 'AddTool Error',
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
								id: 'bce29a06-cff6-4409-96d2-04cc858a0e98',
								name: 'data',
								type: 'array',
								value: '={{ $json.data.parseJson() }}',
							},
						],
					},
				},
				position: [-2400, 400],
				name: 'Convert to JSON',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'data' },
				position: [-2180, 400],
				name: 'Split Out',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.filter',
			version: 2.2,
			config: {
				parameters: {
					options: {},
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
								id: 'd2c149fb-d115-449b-9b74-f3c2f8ff7950',
								operator: { type: 'boolean', operation: 'false', singleValue: true },
								leftValue:
									"={{\n$json.id\n  ? $('Operations').first().json.workflowIds.split(',').includes($json.id)\n  : false\n}}",
								rightValue: '',
							},
						],
					},
				},
				position: [-1960, 400],
				name: 'Filter Matching IDs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
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
								id: '2cd1b233-fb24-45d5-9efd-1db44b817809',
								operator: { type: 'array', operation: 'empty', singleValue: true },
								leftValue: '={{ $input.all().flatMap(item => item.json.data).compact() }}',
								rightValue: '',
							},
						],
					},
				},
				position: [-1740, 400],
				name: 'Is Empty Array?',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: 'n8n-nodes-base.redis',
			version: 1,
			config: {
				parameters: { key: 'mcp_n8n_tools', operation: 'delete' },
				credentials: { redis: { id: 'credential-id', name: 'redis Credential' } },
				position: [-1520, 300],
				name: 'Delete Key',
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
								id: '1368947f-6625-4e2e-ae27-0fcad0a1d12a',
								name: 'response',
								type: 'string',
								value:
									"={{ $('When Executed by Another Workflow').first().json.workflowIds.split(',').length }} tool(s) removed successfully.",
							},
						],
					},
				},
				position: [-1300, 400],
				name: 'Remove Tool Success',
			},
		}),
	)
	.output(1)
	.then(
		node({
			type: 'n8n-nodes-base.redis',
			version: 1,
			config: {
				parameters: {
					key: 'mcp_n8n_tools',
					value: '={{ $input.all().flatMap(item => item.json.data).compact() }}',
					operation: 'set',
				},
				credentials: { redis: { id: 'credential-id', name: 'redis Credential' } },
				position: [-1520, 500],
				name: 'Store In Memory1',
			},
		}),
	)
	.output(2)
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
								id: 'bce29a06-cff6-4409-96d2-04cc858a0e98',
								name: 'response',
								type: 'array',
								value: '={{\n$json.data\n  ? $json.data.parseJson()\n  : []\n}}',
							},
						],
					},
				},
				position: [-2400, 600],
				name: 'listTools Success',
			},
		}),
	)
	.output(3)
	.then(
		node({
			type: 'n8n-nodes-base.n8n',
			version: 1,
			config: {
				parameters: { filters: { tags: 'mcp' }, requestOptions: {} },
				credentials: { n8nApi: { id: 'credential-id', name: 'n8nApi Credential' } },
				position: [-2180, 600],
				name: 'Get MCP-tagged Workflows1',
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
								id: '821226b0-12ad-4d1d-81c3-dfa3c286cce4',
								name: 'id',
								type: 'string',
								value: '={{ $json.id }}',
							},
							{
								id: '629d95d6-2501-4ad4-a5ed-e557237e1cc2',
								name: 'name',
								type: 'string',
								value: '={{ $json.name }}',
							},
							{
								id: '30699f7c-98d3-44ee-9749-c5528579f7e6',
								name: 'description',
								type: 'string',
								value:
									"={{\n$json.nodes\n  .filter(node => node.type === 'n8n-nodes-base.stickyNote')\n  .filter(node => node.parameters.content.toLowerCase().includes('try it out'))\n  .map(node => node.parameters.content.substr(0,255) + '...')\n  .join('\\n')\n}}",
							},
							{
								id: '137221ef-f0a3-4441-bae7-d9d4a22e05b7',
								name: 'parameters',
								type: 'string',
								value:
									'={{\n(function(node) {\n  if (!node) return {};\n  const inputs = node.parameters.workflowInputs.values;\n  return {\n    "type": "object",\n    "required": inputs.map(input => input.name),\n    "properties": inputs.reduce((acc, input) => ({\n      ...acc,\n      [input.name]: { type: input.type ?? \'string\' }\n    }), {})\n  }\n})(\n$json.nodes\n  .filter(node => node.type === \'n8n-nodes-base.executeWorkflowTrigger\')\n  .first()\n)\n.toJsonString()\n}}',
							},
						],
					},
				},
				position: [-1960, 600],
				name: 'Simplify Workflows1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					options: {},
					aggregate: 'aggregateAllItemData',
					destinationFieldName: 'response',
				},
				position: [-1740, 600],
				name: 'listTools Success1',
			},
		}),
	)
	.output(4)
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
								id: 'bce29a06-cff6-4409-96d2-04cc858a0e98',
								name: 'data',
								type: 'array',
								value: '={{ $json.data.parseJson() }}',
							},
						],
					},
				},
				position: [-2360, 1120],
				name: 'Convert to JSON1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.if',
			version: 2.2,
			config: {
				parameters: {
					options: {},
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
								id: '9c9df00b-b090-4773-8012-1824b4eeb13f',
								operator: { type: 'object', operation: 'exists', singleValue: true },
								leftValue:
									"={{\n$json.data.find(d => d.id === $('When Executed by Another Workflow').item.json.workflowIds)\n}}",
								rightValue: '',
							},
						],
					},
				},
				position: [-2140, 1120],
				name: 'Has Workflow Available?',
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
					mode: 'raw',
					options: {},
					jsonOutput: "={{ $('When Executed by Another Workflow').first().json.parameters }}",
				},
				position: [-1920, 1020],
				name: 'Get Parameters',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.executeWorkflow',
			version: 1.2,
			config: {
				parameters: {
					options: { waitForSubWorkflow: true },
					workflowId: {
						__rl: true,
						mode: 'id',
						value: "={{ $('When Executed by Another Workflow').first().json.workflowIds }}",
					},
					workflowInputs: {
						value: {},
						schema: [],
						mappingMode: 'defineBelow',
						matchingColumns: [],
						attemptToConvertTypes: false,
						convertFieldsToString: true,
					},
				},
				position: [-1660, 1020],
				name: 'Execute Workflow with PassThrough Variables',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					options: {},
					aggregate: 'aggregateAllItemData',
					destinationFieldName: 'response',
				},
				position: [-1440, 1020],
				name: 'executeTool Result',
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
								id: '2fa3e311-e836-42f4-922a-fae19d8e0267',
								name: 'response',
								type: 'string',
								value:
									'=Expected workflow to be available but not yet added. You can only use workflows which have been added to the available pool. Use the listWorkflows tool to see available workflows.',
							},
						],
					},
				},
				position: [-1920, 1220],
				name: 'ExecuteTool Error',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [-3840, 1040],
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
							'=You are a helpful assistant who only uses workflows to answer questions and perform tasks.\n* When asked to complete a task, you will assume there is a workflow which you can use. Do not generate custom scripts or raw commands - use a workflow isntead.\n* Only use the available active workflows as listed using the "listWorkflows" tool.\n* Workflows returned by "listWorkflows" tool are active in the pool and do not need to be added again.\n* Always ask the user before adding workflows to the availble pool.\n* You do not need to confirm each step with the user when executing workflows.\n* When executing the workflow, the required parameters schema for it is listed in the workflow\'s profile. To get this profile, use the listWokflows tool.\n* If no available workflows are suitable and you are not able to complete the task, simply let the user know.\n* Do not search for workflows in the directory unless the user requests.',
					},
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.mcpClientTool',
							version: 1,
							config: {
								parameters: { sseEndpoint: '=<Production URL of MCP Server>' },
								name: 'MCP Client',
							},
						}),
					],
					memory: memory({
						type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						version: 1.3,
						config: { parameters: { contextWindowLength: 30 }, name: 'Simple Memory' },
					}),
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1.2,
						config: {
							parameters: {
								model: {
									__rl: true,
									mode: 'list',
									value: 'gpt-4.1-mini',
									cachedResultName: 'gpt-4.1-mini',
								},
								options: {},
							},
							credentials: {
								openAiApi: { id: 'credential-id', name: 'openAiApi Credential' },
							},
							name: 'OpenAI Chat Model',
						},
					}),
				},
				position: [-3600, 1040],
				name: 'AI Agent',
			},
		}),
	)
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.mcpTrigger',
			version: 1,
			config: {
				parameters: { path: '4625bcf4-0dd9-4562-a70f-6fee41f6f12d' },
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.1,
							config: {
								parameters: {
									name: 'addWorkflow',
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description:
										'Adds one or more workflows by ID to the available pool of workflows for the agent. You can get a list of workflows by calling the listTool tool.',
									workflowInputs: {
										value: {
											operation: 'addWorkflow',
											parameters: 'null',
											workflowIds:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('workflowIds', ``, 'string') }}",
										},
										schema: [
											{
												id: 'operation',
												type: 'string',
												display: true,
												required: false,
												displayName: 'operation',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'workflowIds',
												type: 'string',
												display: true,
												required: false,
												displayName: 'workflowIds',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'parameters',
												type: 'object',
												display: true,
												required: false,
												displayName: 'parameters',
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
								name: 'Add Workflow',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.1,
							config: {
								parameters: {
									name: 'listTool',
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description: 'Lists the available pool of workflows for the agent.',
									workflowInputs: {
										value: {
											operation: 'listWorkflows',
											parameters: 'null',
											workflowIds: 'null',
										},
										schema: [
											{
												id: 'operation',
												type: 'string',
												display: true,
												required: false,
												displayName: 'operation',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'workflowIds',
												type: 'string',
												display: true,
												required: false,
												displayName: 'workflowIds',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'parameters',
												type: 'object',
												display: true,
												required: false,
												displayName: 'parameters',
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
								name: 'List Workflows',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.1,
							config: {
								parameters: {
									name: 'removeWorkflow',
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description:
										'Removes one or more workflows by ID from the available pool of workflows for the agent.',
									workflowInputs: {
										value: {
											operation: 'removeWorkflow',
											parameters: 'null',
											workflowIds:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('workflowIds', ``, 'string') }}",
										},
										schema: [
											{
												id: 'operation',
												type: 'string',
												display: true,
												required: false,
												displayName: 'operation',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'workflowIds',
												type: 'string',
												display: true,
												required: false,
												displayName: 'workflowIds',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'parameters',
												type: 'object',
												display: true,
												required: false,
												displayName: 'parameters',
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
								name: 'RemoveWorkflow',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.1,
							config: {
								parameters: {
									name: 'executeTool',
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description:
										'Executes a workflow which has been added to the pool of available workflows for the agent.',
									workflowInputs: {
										value: {
											operation: 'executeWorkflow',
											parameters:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('parameters', ``, 'string') }}",
											workflowIds:
												"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('workflowIds', ``, 'string') }}",
										},
										schema: [
											{
												id: 'operation',
												type: 'string',
												display: true,
												required: false,
												displayName: 'operation',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'workflowIds',
												type: 'string',
												display: true,
												required: false,
												displayName: 'workflowIds',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'parameters',
												type: 'object',
												display: true,
												required: false,
												displayName: 'parameters',
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
								name: 'ExecuteWorkflow',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2.1,
							config: {
								parameters: {
									name: 'searchTool',
									workflowId: { __rl: true, mode: 'id', value: '={{ $workflow.id }}' },
									description:
										'Returns all workflows which can be added to the pool of available workflows for the agent.',
									workflowInputs: {
										value: {
											operation: 'searchWorkflows',
											parameters: 'null',
											workflowIds: 'null',
										},
										schema: [
											{
												id: 'operation',
												type: 'string',
												display: true,
												required: false,
												displayName: 'operation',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'workflowIds',
												type: 'string',
												display: true,
												required: false,
												displayName: 'workflowIds',
												defaultMatch: false,
												canBeUsedToMatch: true,
											},
											{
												id: 'parameters',
												type: 'object',
												display: true,
												required: false,
												displayName: 'parameters',
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
								name: 'SearchWorkflows',
							},
						}),
					],
				},
				position: [-3720, 240],
				name: 'N8N Workflows MCP Server',
			},
		}),
	)
	.add(
		sticky(
			'## 1. Add MCP Server Trigger\n[Read more about the MCP server trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/)',
			{ color: 7, position: [-3920, 80], width: 720, height: 740 },
		),
	)
	.add(
		sticky(
			"## 2. Dynamically manage a list of \"Available\" Workflows\n[Learn more about the n8n node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.n8n)\n\nThe idea is to limit the number of workflows the agent has access to in order to ensure undesired workflows or duplication of similar workflows are avoided. Here, we do this by managing a virtual list of workflows in memory using Redis - under the hood, it's just an array to store Workflow details.\n\nGood to note, the intended workflows must have **Subworkflow triggers** and ideally, with input schema set as well. This template analyses each workflow's JSON and captures its input schema as part of the workflow's description. Doing so,  when it comes time to execute, the agent will know in what format to set the parameters when calling the subworkflow.\n",
			{ name: 'Sticky Note1', color: 7, position: [-2600, -140], width: 740, height: 300 },
		),
	)
	.add(
		sticky(
			'## 3. Let the Agent execute any N8N Workflow\n[Learn more about the Execute Workflow node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/)\n\nFinally once the agent has gathered the required workflows, it will start performing the requested task by executing one or more available workflows. The desired behaviour is that the agent will use "listWorkflows" to see which workflows are "active" and then plan out how to use them. Attempts to use a workflow before adding it to the available pool will result in an error response.',
			{ name: 'Sticky Note2', color: 7, position: [-2420, 820], width: 1160, height: 600 },
		),
	)
	.add(
		sticky(
			'## 4. Connect any Agent with a MCP Client\nUse this agent to test your MCP server. Note, i',
			{ name: 'Sticky Note3', color: 7, position: [-3920, 860], width: 740, height: 560 },
		),
	)
	.add(
		sticky(
			'* **AddWorkflow**\n  This tool adds (or rather, appends) workflows to our "available" list.\n* **RemoveWorkflow**\n  This tool removes a workflow entry from our list.\n* **listWorkflows**\n  This tool displays the current state of the workflows list and the available workflows within it. Useful for checking which workflows have been added to the list.\n* **searchWorkflows**\n  For now, this tools just pulls the existing workflows from the n8n instance and returns it to the agent. Given more resources, you may want to swap this out for a indexed search instead (you\'ll need to build this yourself!).',
			{ name: 'Sticky Note4', color: 5, position: [-2880, 820], width: 320, height: 400 },
		),
	)
	.add(
		sticky(
			'## Try it out!\n### This n8n template shows you how to create an MCP server out of your existing n8n workflows. With this, any MCP client connected can get more done with powerful end-to-end workflows rather than just simple tools.\n\nDesigning agent tools for outcome rather than utility has been a long recommended practice of mine and it applies well when it comes to building MCP servers; In gist, it prefers agents to be making the least calls possible to complete a task.\n\nThis is why n8n can be a great fit for MCP servers! This template connects your agent/MCP client (like Claude Desktop) to your existing workflows by allowing the AI to discover, manage and run these workflows indirectly.\n\n### How it works\n* An MCP trigger is used and attaches 4 custom workflow tools to discover and manage existing workflows to use and 1 custom workflow tool to execute them.\n* We\'ll introduce an idea of "available" workflows which the agent is allowed to use. This will help limit and avoid some issues when trying to use every workflow such as clashes or non-production.\n* The n8n node is a core node which taps into your n8n instance API and is able to retrieve all workflows or filter by tag. For our example, we\'ve tagged the workflows we want to use with "mcp" and these are exposed through the tool "search workflows".\n* Redis is used as our main memory for keeping track of which workflows are "available". The tools we have are "add Workflow", "remove workflow" and "list workflows". The agent should be able to manage this autonomously.\n* Our approach to allow the agent to execute workflows is to use the Subworkflow trigger. The tricky part is figuring out the input schema for each but was eventually solved by pulling this information out of the workflow\'s template JSON and adding it as part of the "available" workflow\'s description. To pass parameters through the Subworkflow trigger, we can do so via the passthrough method - which is that incoming data is used when parameters are not explicitly set within the node.\n* When running, the agent will not see the "available" workflows immediately but will need to discover them via "list" and "search". The human will need to make the agent aware that these workflows will be preferred when answering queries or completing tasks.\n\n### How to use\n* First, decide which workflows will be made visible to the MCP server. This example uses the tag of "mcp" but you can all workflows or filter in other ways.\n* Next, ensure these workflows have Subworkflow triggers with input schema set. This is how the MCP server will run them.\n* Set the MCP server to "active" which turns on production mode and makes available to production URL.\n* Use this production URL in your MCP client. For Claude Desktop, see the instructions here - https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger/#integrating-with-claude-desktop.\n* There is a small learning curve which will shape how you communicate with this MCP server so be patient and test. The MCP server will work better if there is a focused goal in mind ie. Research and report, rather than just a collection of unrelated tools.\n\n### Requirements\n* N8N API key to filter for selected workflows.\n* N8N workflows with Subworkflow triggers!\n* Redis for memory and tracking the "available" workflows.\n* MCP Client or Agent for usage such as Claude Desktop - https://claude.ai/download\n\n### Customising this workflow\n* If your targeted workflows do not use the subworkflow trigger, it is possible to amend the executeTool to use HTTP requests for webhooks.\n* Managing available workflows helps if you have many workflows where some may be too similar for the agent. If this isn\'t a problem for you however, feel free to remove the concept of "available" and let the agent discover and use all workflows!',
			{ name: 'Sticky Note5', position: [-4600, -180], width: 600, height: 1440 },
		),
	)
	.add(
		sticky(
			'### How many existing workflows can I use?\nWell, as many as you want really! For this example, I\'ve limited it for workflows which are tagged as "mcp" but you can remove this filter to allow all.',
			{ name: 'Sticky Note6', color: 5, position: [-2600, -280], width: 380, height: 120 },
		),
	)
	.add(
		sticky(
			'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n### 🚨 Ensure this node does not set the input schema!\nFor passthrough parameters to work, this node should not make available input schema fields. ie. the input fields should not be visible.\n\nIf there are, the node needs to be reset!',
			{ name: 'Sticky Note7', position: [-1720, 1000], height: 440 },
		),
	);
