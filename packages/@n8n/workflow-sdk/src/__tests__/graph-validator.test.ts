import { workflow, trigger, node, sticky, languageModel, tool } from '../index';

describe('graph validation', () => {
	describe('checkNoNodes', () => {
		test('returns error when workflow has no nodes', () => {
			const wf = workflow('test-id', 'Empty Workflow');

			const result = wf.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					code: 'NO_NODES',
					message: expect.stringContaining('no nodes'),
				}),
			);
		});

		test('returns no error when workflow has nodes', () => {
			const wf = workflow('test-id', 'Test Workflow').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1.1,
					config: { name: 'Start' },
				}),
			);

			const result = wf.validate();

			const noNodesError = result.errors.find((e) => e.code === 'NO_NODES');
			expect(noNodesError).toBeUndefined();
		});
	});

	describe('checkTrigger', () => {
		test('returns warning when workflow has no trigger', () => {
			const wf = workflow('test-id', 'No Trigger Workflow').add(
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: { name: 'HTTP Request' },
				}),
			);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'MISSING_TRIGGER',
					message: expect.stringContaining('trigger'),
				}),
			);
		});

		test('returns no warning when workflow has a trigger', () => {
			const wf = workflow('test-id', 'Test Workflow').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1.1,
					config: { name: 'Start' },
				}),
			);

			const result = wf.validate();

			const triggerWarning = result.warnings.find((w) => w.code === 'MISSING_TRIGGER');
			expect(triggerWarning).toBeUndefined();
		});

		test('respects allowNoTrigger option', () => {
			const wf = workflow('test-id', 'No Trigger Workflow').add(
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: { name: 'HTTP Request' },
				}),
			);

			const result = wf.validate({ allowNoTrigger: true });

			const triggerWarning = result.warnings.find((w) => w.code === 'MISSING_TRIGGER');
			expect(triggerWarning).toBeUndefined();
		});
	});

	describe('checkAgent', () => {
		test('returns warning when agent has static prompt (no expression)', () => {
			const wf = workflow('test-id', 'Agent Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 3.1,
						config: {
							name: 'AI Agent',
							parameters: {
								promptType: 'define',
								text: 'Hello, how can I help you?', // Static text, no expression
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'AGENT_STATIC_PROMPT',
				}),
			);
		});

		test('returns no warning when agent prompt contains expression', () => {
			const wf = workflow('test-id', 'Agent Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 3.1,
						config: {
							name: 'AI Agent',
							parameters: {
								promptType: 'define',
								text: '={{ $json.chatInput }}', // Has expression
							},
						},
					}),
				);

			const result = wf.validate();

			const staticPromptWarning = result.warnings.find((w) => w.code === 'AGENT_STATIC_PROMPT');
			expect(staticPromptWarning).toBeUndefined();
		});

		test('returns warning when agent has no system message', () => {
			const wf = workflow('test-id', 'Agent Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 3.1,
						config: {
							name: 'AI Agent',
							parameters: {
								promptType: 'define',
								text: '={{ $json.chatInput }}',
								// No options.systemMessage
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'AGENT_NO_SYSTEM_MESSAGE',
				}),
			);
		});

		test('returns no warning when agent has system message', () => {
			const wf = workflow('test-id', 'Agent Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 3.1,
						config: {
							name: 'AI Agent',
							parameters: {
								promptType: 'define',
								text: '={{ $json.chatInput }}',
								options: {
									systemMessage: 'You are a helpful assistant.',
								},
							},
						},
					}),
				);

			const result = wf.validate();

			const noSystemMsgWarning = result.warnings.find((w) => w.code === 'AGENT_NO_SYSTEM_MESSAGE');
			expect(noSystemMsgWarning).toBeUndefined();
		});

		test('skips agent checks when promptType is auto', () => {
			const wf = workflow('test-id', 'Agent Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 3.1,
						config: {
							name: 'AI Agent',
							parameters: {
								promptType: 'auto', // Auto mode - should not check text/systemMessage
							},
						},
					}),
				);

			const result = wf.validate();

			const staticPromptWarning = result.warnings.find((w) => w.code === 'AGENT_STATIC_PROMPT');
			const noSystemMsgWarning = result.warnings.find((w) => w.code === 'AGENT_NO_SYSTEM_MESSAGE');
			expect(staticPromptWarning).toBeUndefined();
			expect(noSystemMsgWarning).toBeUndefined();
		});
	});

	describe('checkHttpRequest', () => {
		test('returns warning when Authorization header has hardcoded value', () => {
			const wf = workflow('test-id', 'HTTP Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						config: {
							name: 'HTTP Request',
							parameters: {
								url: 'https://api.example.com',
								sendHeaders: true,
								headerParameters: {
									parameters: [
										{
											name: 'Authorization',
											value: 'Bearer sk-1234567890', // Hardcoded!
										},
									],
								},
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'HARDCODED_CREDENTIALS',
				}),
			);
		});

		test('returns no warning when Authorization header uses expression', () => {
			const wf = workflow('test-id', 'HTTP Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						config: {
							name: 'HTTP Request',
							parameters: {
								url: 'https://api.example.com',
								sendHeaders: true,
								headerParameters: {
									parameters: [
										{
											name: 'Authorization',
											value: '={{ $env.API_TOKEN }}', // Expression - OK
										},
									],
								},
							},
						},
					}),
				);

			const result = wf.validate();

			const credWarning = result.warnings.find((w) => w.code === 'HARDCODED_CREDENTIALS');
			expect(credWarning).toBeUndefined();
		});

		test('returns warning when api_key query param has hardcoded value', () => {
			const wf = workflow('test-id', 'HTTP Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						config: {
							name: 'HTTP Request',
							parameters: {
								url: 'https://api.example.com',
								sendQuery: true,
								queryParameters: {
									parameters: [
										{
											name: 'api_key',
											value: 'secret123', // Hardcoded!
										},
									],
								},
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'HARDCODED_CREDENTIALS',
				}),
			);
		});
	});

	describe('checkSetNode', () => {
		test('returns warning when Set node has field with credential-like name', () => {
			const wf = workflow('test-id', 'Set Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: {
							name: 'Set',
							parameters: {
								assignments: {
									assignments: [
										{
											name: 'api_key', // Credential-like name
											value: 'secret123',
											type: 'string',
										},
									],
								},
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'SET_CREDENTIAL_FIELD',
				}),
			);
		});

		test('returns no warning when Set node has normal field names', () => {
			const wf = workflow('test-id', 'Set Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: {
							name: 'Set',
							parameters: {
								assignments: {
									assignments: [
										{
											name: 'userId', // Normal name
											value: '123',
											type: 'string',
										},
									],
								},
							},
						},
					}),
				);

			const result = wf.validate();

			const setWarning = result.warnings.find((w) => w.code === 'SET_CREDENTIAL_FIELD');
			expect(setWarning).toBeUndefined();
		});
	});

	describe('checkMergeNode', () => {
		test('returns warning when Merge node has only one input', () => {
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Merge' },
			});

			const wf = workflow('test-id', 'Merge Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(mergeNode); // Only one input connected

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'MERGE_SINGLE_INPUT',
				}),
			);
		});

		test('returns no warning when Merge node has multiple inputs', () => {
			const startTrigger = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1.1,
				config: { name: 'Start', position: [0, 0] },
			});

			const branch1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Branch 1', position: [200, 0] },
			});

			const branch2 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Branch 2', position: [200, 200] },
			});

			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: { name: 'Merge', position: [400, 100] },
			});

			// Build workflow with two branches into merge
			const wf = workflow('test-id', 'Merge Workflow')
				.add(startTrigger.then([branch1, branch2]))
				.add(branch1.then(mergeNode))
				.add(branch2.then(mergeNode, 0)); // Connect to input 0

			const result = wf.validate();

			const mergeWarning = result.warnings.find((w) => w.code === 'MERGE_SINGLE_INPUT');
			expect(mergeWarning).toBeUndefined();
		});
	});

	describe('checkDisconnected', () => {
		test('returns warning when non-trigger node has no incoming connections', () => {
			// Create a node that is added but not connected to anything
			const wf = workflow('test-id', 'Disconnected Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.add(
					node({
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						config: { name: 'Orphan HTTP Request' },
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'DISCONNECTED_NODE',
					nodeName: 'Orphan HTTP Request',
				}),
			);
		});

		test('returns no warning for trigger nodes without incoming connections', () => {
			const wf = workflow('test-id', 'Test Workflow').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1.1,
					config: { name: 'Start' },
				}),
			);

			const result = wf.validate();

			const disconnectedWarning = result.warnings.find((w) => w.code === 'DISCONNECTED_NODE');
			expect(disconnectedWarning).toBeUndefined();
		});

		test('returns no warning when node has incoming connection via then()', () => {
			const wf = workflow('test-id', 'Connected Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						config: { name: 'Connected HTTP' },
					}),
				);

			const result = wf.validate();

			const disconnectedWarning = result.warnings.find((w) => w.code === 'DISCONNECTED_NODE');
			expect(disconnectedWarning).toBeUndefined();
		});

		test('respects allowDisconnectedNodes option', () => {
			const wf = workflow('test-id', 'Disconnected Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.add(
					node({
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						config: { name: 'Orphan HTTP Request' },
					}),
				);

			const result = wf.validate({ allowDisconnectedNodes: true });

			const disconnectedWarning = result.warnings.find((w) => w.code === 'DISCONNECTED_NODE');
			expect(disconnectedWarning).toBeUndefined();
		});

		test('does not flag sticky notes as disconnected', () => {
			const wf = workflow('test-id', 'Workflow With Sticky Note')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						config: { name: 'HTTP Request' },
					}),
				)
				.add(sticky('## Documentation Note', { position: [100, 100] }));

			const result = wf.validate();

			// Sticky notes should NOT be flagged as disconnected (they never participate in data flow)
			const disconnectedWarning = result.warnings.find((w) => w.code === 'DISCONNECTED_NODE');
			expect(disconnectedWarning).toBeUndefined();
		});

		test('does not flag subnodes connected to agent as disconnected', () => {
			const model = languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1.2,
				config: { parameters: { model: 'gpt-4' } },
			});

			const codeTool = tool({
				type: '@n8n/n8n-nodes-langchain.toolCode',
				version: 1.1,
				config: { parameters: { code: 'return "hello"' } },
			});

			const wf = workflow('test-id', 'AI Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 1.7,
						config: {
							name: 'AI Agent',
							parameters: { promptType: 'auto', text: 'Hello' },
							subnodes: {
								model,
								tools: [codeTool],
							},
						},
					}),
				);

			const result = wf.validate();

			// Subnodes should NOT be flagged as disconnected (they connect TO their parent via AI connections)
			const disconnectedWarning = result.warnings.find((w) => w.code === 'DISCONNECTED_NODE');
			expect(disconnectedWarning).toBeUndefined();
		});
	});

	describe('checkFromAI', () => {
		test('returns warning when non-tool node uses $fromAI expression', () => {
			const wf = workflow('test-id', 'FromAI Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						config: {
							name: 'HTTP Request',
							parameters: {
								url: '={{ $fromAI("endpoint") }}', // $fromAI in non-tool node!
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'FROM_AI_IN_NON_TOOL',
					nodeName: 'HTTP Request',
				}),
			);
		});

		test('returns no warning when tool node uses $fromAI expression', () => {
			const wf = workflow('test-id', 'Tool Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
						version: 1.1,
						config: {
							name: 'HTTP Tool',
							parameters: {
								url: '={{ $fromAI("endpoint") }}', // $fromAI in tool node - OK
							},
						},
					}),
				);

			const result = wf.validate();

			const fromAiWarning = result.warnings.find((w) => w.code === 'FROM_AI_IN_NON_TOOL');
			expect(fromAiWarning).toBeUndefined();
		});

		test('returns no warning when non-tool node uses regular expressions', () => {
			const wf = workflow('test-id', 'Regular Expression Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: 'n8n-nodes-base.httpRequest',
						version: 4.2,
						config: {
							name: 'HTTP Request',
							parameters: {
								url: '={{ $json.endpoint }}', // Regular expression - OK
							},
						},
					}),
				);

			const result = wf.validate();

			const fromAiWarning = result.warnings.find((w) => w.code === 'FROM_AI_IN_NON_TOOL');
			expect(fromAiWarning).toBeUndefined();
		});
	});

	describe('checkToolNode', () => {
		test('returns warning when tool node has no parameters', () => {
			const wf = workflow('test-id', 'Tool Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
						version: 1.1,
						config: {
							name: 'HTTP Tool',
							// No parameters!
						},
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'TOOL_NO_PARAMETERS',
				}),
			);
		});

		test('returns no warning when tool node has parameters', () => {
			const wf = workflow('test-id', 'Tool Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
						version: 1.1,
						config: {
							name: 'HTTP Tool',
							parameters: {
								url: 'https://api.example.com',
							},
						},
					}),
				);

			const result = wf.validate();

			const toolWarning = result.warnings.find((w) => w.code === 'TOOL_NO_PARAMETERS');
			expect(toolWarning).toBeUndefined();
		});

		test('skips check for known tools that do not need parameters', () => {
			const wf = workflow('test-id', 'Tool Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.then(
					node({
						type: '@n8n/n8n-nodes-langchain.toolCalculator',
						version: 1,
						config: {
							name: 'Calculator',
							// No parameters needed for calculator
						},
					}),
				);

			const result = wf.validate();

			const toolWarning = result.warnings.find((w) => w.code === 'TOOL_NO_PARAMETERS');
			expect(toolWarning).toBeUndefined();
		});
	});
});
