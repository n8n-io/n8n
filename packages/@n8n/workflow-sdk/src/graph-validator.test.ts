import { workflow, trigger, node, sticky, languageModel, tool, embedding } from './index';
import type { WorkflowJSON } from './index';

describe('graph validation', () => {
	describe('checkNoNodes', () => {
		test('returns error when workflow has no nodes', () => {
			const wf = workflow('test-id', 'Empty Workflow');

			const result = wf.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					code: 'NO_NODES',
					message: expect.stringContaining('no nodes') as unknown as string,
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
					message: expect.stringContaining('trigger') as unknown as string,
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
				.to(
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
				.to(
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
				.to(
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
				.to(
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
				.to(
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
				.to(
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
				.to(
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
				.to(
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
				.to(
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
				.to(
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
				.to(mergeNode); // Only one input connected

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

			// Build workflow with two branches into merge on different inputs
			const wf = workflow('test-id', 'Merge Workflow')
				.add(startTrigger.to([branch1, branch2]))
				.add(branch1.to(mergeNode.input(0)))
				.add(branch2.to(mergeNode.input(1))); // Connect to input 1

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
				.to(
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
				.to(
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

		test('does not produce false DISCONNECTED_NODE warnings for connected fromJSON nodes', () => {
			const json: WorkflowJSON = {
				id: 'test-id',
				name: 'Test Workflow',
				nodes: [
					{
						id: 'node-1',
						name: 'Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'node-2',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 3,
						position: [200, 0],
						parameters: {},
					},
				],
				connections: {
					Trigger: {
						main: [[{ node: 'Set', type: 'main', index: 0 }]],
					},
				},
			};

			const wf = workflow.fromJSON(json);
			const result = wf.validate();

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
				.to(
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
				.to(
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
				.to(
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
				.to(
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

	describe('checkChainLlm', () => {
		test('returns warning when chainLlm v1.4+ has static text prompt', () => {
			const wf = workflow('test-id', 'ChainLlm Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.chainLlm',
						version: 1.9,
						config: {
							name: 'LLM Chain',
							parameters: {
								promptType: 'define',
								text: 'Static text without expression',
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({ code: 'AGENT_STATIC_PROMPT' }),
			);
		});

		test('returns no warning when chainLlm v1.4+ has expression in text', () => {
			const wf = workflow('test-id', 'ChainLlm Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.chainLlm',
						version: 1.9,
						config: {
							name: 'LLM Chain',
							parameters: {
								promptType: 'define',
								text: '={{ $json.input }}',
							},
						},
					}),
				);

			const result = wf.validate();

			const warning = result.warnings.find((w) => w.code === 'AGENT_STATIC_PROMPT');
			expect(warning).toBeUndefined();
		});

		test('returns no warning for chainLlm v1.3 (before promptType existed)', () => {
			const wf = workflow('test-id', 'ChainLlm Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.chainLlm',
						version: 1.3,
						config: {
							name: 'LLM Chain',
							parameters: {
								prompt: 'Old style prompt',
							},
						},
					}),
				);

			const result = wf.validate();

			const warning = result.warnings.find((w) => w.code === 'AGENT_STATIC_PROMPT');
			expect(warning).toBeUndefined();
		});
	});

	describe('checkMissingExpressionPrefix', () => {
		test('returns warning when parameter has {{ $json }} without = prefix', () => {
			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: {
							name: 'Set',
							parameters: {
								assignments: {
									assignments: [
										{
											name: 'data',
											value: 'Input: {{ $json.input }}',
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
				expect.objectContaining({ code: 'MISSING_EXPRESSION_PREFIX' }),
			);
		});

		test('returns no warning when parameter has ={{ $json }}', () => {
			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: {
							name: 'Set',
							parameters: {
								assignments: {
									assignments: [
										{
											name: 'data',
											value: '={{ $json.input }}',
											type: 'string',
										},
									],
								},
							},
						},
					}),
				);

			const result = wf.validate();

			const warning = result.warnings.find((w) => w.code === 'MISSING_EXPRESSION_PREFIX');
			expect(warning).toBeUndefined();
		});

		test('returns no warning for {{ someVar }} without n8n variable', () => {
			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: {
							name: 'Set',
							parameters: {
								assignments: {
									assignments: [
										{
											name: 'template',
											value: 'Hello {{ name }}',
											type: 'string',
										},
									],
								},
							},
						},
					}),
				);

			const result = wf.validate();

			const warning = result.warnings.find((w) => w.code === 'MISSING_EXPRESSION_PREFIX');
			expect(warning).toBeUndefined();
		});

		test('detects issue in nested parameters', () => {
			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 3.1,
						config: {
							name: 'AI Agent',
							parameters: {
								promptType: 'define',
								text: '={{ $json.chatInput }}',
								options: {
									systemMessage: 'Context: {{ $json.context }}',
								},
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.warnings).toContainEqual(
				expect.objectContaining({
					code: 'MISSING_EXPRESSION_PREFIX',
					message: expect.stringContaining('options.systemMessage') as unknown as string,
				}),
			);
		});
	});

	describe('warnings for auto-renamed nodes', () => {
		test('warning includes both renamed and original name for disconnected node', () => {
			// Create two nodes with same name - second gets renamed to "Process 1"
			const process1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Process' },
			});
			const process2 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Process' },
			});

			const wf = workflow('test-id', 'Test')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(process1)
				.add(process2); // Added but not connected - should warn

			const result = wf.validate();

			// Find the disconnected node warning for the renamed node
			const warning = result.warnings.find(
				(w) => w.code === 'DISCONNECTED_NODE' && w.nodeName === 'Process 1',
			);

			expect(warning).toBeDefined();
			expect(warning?.message).toContain("'Process 1'");
			expect(warning?.message).toContain("originally 'Process'");
			expect(warning?.originalName).toBe('Process');
		});

		test('warning does not include original name when node was not renamed', () => {
			const processNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Process' },
			});

			const wf = workflow('test-id', 'Test')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.add(processNode); // Added but not connected

			const result = wf.validate();

			const warning = result.warnings.find(
				(w) => w.code === 'DISCONNECTED_NODE' && w.nodeName === 'Process',
			);

			expect(warning).toBeDefined();
			expect(warning?.message).toContain("'Process'");
			expect(warning?.message).not.toContain('originally');
			expect(warning?.originalName).toBeUndefined();
		});

		test('node-specific warnings include original name for renamed nodes', () => {
			// Create two Set nodes with credential-like field names
			// Using .add() for second node to trigger auto-rename (set2 becomes "Store Data 1")
			const set1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: {
					name: 'Store Data',
					parameters: {
						assignments: { assignments: [{ name: 'api_key', value: 'secret123' }] },
					},
				},
			});
			const set2 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: {
					name: 'Store Data',
					parameters: {
						assignments: { assignments: [{ name: 'password', value: 'secret456' }] },
					},
				},
			});

			const wf = workflow('test-id', 'Test')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(set1)
				.add(set2); // Use .add() (not .to()) to add as separate node with auto-rename

			const result = wf.validate();

			// The second node warning should reference both names
			const warning = result.warnings.find(
				(w) => w.code === 'SET_CREDENTIAL_FIELD' && w.nodeName === 'Store Data 1',
			);

			expect(warning).toBeDefined();
			expect(warning?.message).toContain("'Store Data 1'");
			expect(warning?.message).toContain("originally 'Store Data'");
			expect(warning?.originalName).toBe('Store Data');
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
				.to(
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
				.to(
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
				.to(
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

	describe('checkSubnodeConnection', () => {
		test('returns error when embedding node is used as regular workflow node', () => {
			const wf = workflow('test-id', 'Invalid Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
						version: 1,
						config: {
							name: 'Bad Embeddings',
							parameters: {
								modelName: 'models/text-embedding-004',
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					code: 'SUBNODE_NOT_CONNECTED',
					message: expect.stringContaining('as embedding') as unknown as string,
				}),
			);
		});

		test('returns error when language model node is used as regular workflow node', () => {
			const wf = workflow('test-id', 'Invalid Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1,
						config: {
							name: 'Bad LLM',
							parameters: {
								model: 'gpt-4',
							},
						},
					}),
				);

			const result = wf.validate();

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					code: 'SUBNODE_NOT_CONNECTED',
					message: expect.stringContaining('as model') as unknown as string,
				}),
			);
		});

		test('returns no error when embedding is properly connected as subnode', () => {
			const wf = workflow('test-id', 'Valid Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
						version: 1.1,
						config: {
							name: 'Vector Store',
							parameters: {
								mode: 'insert',
							},
							subnodes: {
								embedding: embedding({
									type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
									version: 1,
									config: {
										parameters: {
											modelName: 'models/text-embedding-004',
										},
									},
								}),
							},
						},
					}),
				);

			const result = wf.validate();

			const subnodeError = result.errors.find((e) => e.code === 'SUBNODE_NOT_CONNECTED');
			expect(subnodeError).toBeUndefined();
		});

		test('returns no error when language model is properly connected as subnode', () => {
			const wf = workflow('test-id', 'Valid Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.agent',
						version: 3.1,
						config: {
							name: 'Agent',
							parameters: {
								promptType: 'auto',
							},
							subnodes: {
								model: languageModel({
									type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
									version: 1.2,
									config: {
										parameters: {
											model: 'gpt-4',
										},
									},
								}),
							},
						},
					}),
				);

			const result = wf.validate();

			const subnodeError = result.errors.find((e) => e.code === 'SUBNODE_NOT_CONNECTED');
			expect(subnodeError).toBeUndefined();
		});

		test('does not error for vectorStore nodes (can be standalone)', () => {
			const wf = workflow('test-id', 'Vector Store Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
						version: 1.1,
						config: {
							name: 'Vector Store',
							parameters: {
								mode: 'retrieve',
							},
						},
					}),
				);

			const result = wf.validate();

			const subnodeError = result.errors.find((e) => e.code === 'SUBNODE_NOT_CONNECTED');
			expect(subnodeError).toBeUndefined();
		});

		test('does not error for tool nodes (can be standalone)', () => {
			const wf = workflow('test-id', 'Tool Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: '@n8n/n8n-nodes-langchain.toolCode',
						version: 1,
						config: {
							name: 'Code Tool',
							parameters: {
								code: 'return "hello"',
							},
						},
					}),
				);

			const result = wf.validate();

			const subnodeError = result.errors.find((e) => e.code === 'SUBNODE_NOT_CONNECTED');
			expect(subnodeError).toBeUndefined();
		});
	});

	describe('checkMaxNodes', () => {
		// Mock nodeTypesProvider for maxNodes validation
		const createMockNodeTypesProvider = (maxNodesMap: Record<string, number>) => ({
			getByNameAndVersion: (type: string, _version: number) => {
				const maxNodes = maxNodesMap[type];
				if (maxNodes === undefined) return undefined;
				return {
					description: {
						maxNodes,
						displayName: type.split('.').pop() ?? type,
					},
				};
			},
		});

		test('returns no error when node count is within maxNodes limit', () => {
			const nodeTypesProvider = createMockNodeTypesProvider({
				'n8n-nodes-base.manualTrigger': 1,
			});

			const wf = workflow('test-id', 'Test Workflow').add(
				trigger({
					type: 'n8n-nodes-base.manualTrigger',
					version: 1.1,
					config: { name: 'Start' },
				}),
			);

			const result = wf.validate({ nodeTypesProvider: nodeTypesProvider as never });

			const maxNodesError = result.errors.find((e) => e.code === 'MAX_NODES_EXCEEDED');
			expect(maxNodesError).toBeUndefined();
		});

		test('returns error when workflow exceeds maxNodes limit', () => {
			const nodeTypesProvider = createMockNodeTypesProvider({
				'n8n-nodes-base.manualTrigger': 1,
			});

			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start 1' },
					}),
				)
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start 2' },
					}),
				);

			const result = wf.validate({ nodeTypesProvider: nodeTypesProvider as never });

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					code: 'MAX_NODES_EXCEEDED',
					message: expect.stringContaining('2') as unknown as string,
				}),
			);
		});

		test('returns error for chat trigger when maxNodes: 1 exceeded', () => {
			const nodeTypesProvider = createMockNodeTypesProvider({
				'@n8n/n8n-nodes-langchain.chatTrigger': 1,
			});

			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: '@n8n/n8n-nodes-langchain.chatTrigger',
						version: 1.1,
						config: { name: 'Chat 1' },
					}),
				)
				.add(
					trigger({
						type: '@n8n/n8n-nodes-langchain.chatTrigger',
						version: 1.1,
						config: { name: 'Chat 2' },
					}),
				);

			const result = wf.validate({ nodeTypesProvider: nodeTypesProvider as never });

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					code: 'MAX_NODES_EXCEEDED',
				}),
			);
		});

		test('allows maxNodes: 2 when exactly 2 nodes exist', () => {
			const nodeTypesProvider = createMockNodeTypesProvider({
				'n8n-nodes-base.set': 2,
			});

			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(
					node({
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: { name: 'Set 1' },
					}),
				)
				.to(
					node({
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: { name: 'Set 2' },
					}),
				);

			const result = wf.validate({ nodeTypesProvider: nodeTypesProvider as never });

			const maxNodesError = result.errors.find((e) => e.code === 'MAX_NODES_EXCEEDED');
			expect(maxNodesError).toBeUndefined();
		});

		test('returns error when exceeding maxNodes: 2', () => {
			const nodeTypesProvider = createMockNodeTypesProvider({
				'n8n-nodes-base.set': 2,
			});

			const set1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set 1' },
			});
			const set2 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set 2' },
			});
			const set3 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Set 3' },
			});

			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start' },
					}),
				)
				.to(set1)
				.to(set2)
				.to(set3);

			const result = wf.validate({ nodeTypesProvider: nodeTypesProvider as never });

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({
					code: 'MAX_NODES_EXCEEDED',
					message: expect.stringContaining('3') as unknown as string,
				}),
			);
		});

		test('skips validation when nodeTypesProvider not provided', () => {
			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start 1' },
					}),
				)
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Start 2' },
					}),
				);

			// No nodeTypesProvider - validation should be skipped
			const result = wf.validate();

			// No error because maxNodes validation requires nodeTypesProvider
			const maxNodesError = result.errors.find((e) => e.code === 'MAX_NODES_EXCEEDED');
			expect(maxNodesError).toBeUndefined();
		});

		test('allows mixing different node types with maxNodes: 1', () => {
			const nodeTypesProvider = createMockNodeTypesProvider({
				'n8n-nodes-base.manualTrigger': 1,
				'n8n-nodes-base.scheduleTrigger': 1,
			});

			const wf = workflow('test-id', 'Test Workflow')
				.add(
					trigger({
						type: 'n8n-nodes-base.manualTrigger',
						version: 1.1,
						config: { name: 'Manual Start' },
					}),
				)
				.add(
					trigger({
						type: 'n8n-nodes-base.scheduleTrigger',
						version: 1.2,
						config: { name: 'Schedule Start' },
					}),
				);

			const result = wf.validate({ nodeTypesProvider: nodeTypesProvider as never });

			const maxNodesError = result.errors.find((e) => e.code === 'MAX_NODES_EXCEEDED');
			expect(maxNodesError).toBeUndefined();
		});
	});
});
