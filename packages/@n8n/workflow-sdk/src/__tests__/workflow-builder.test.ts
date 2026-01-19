import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';
import { languageModel, memory, tool } from '../subnode-builders';
import { merge } from '../merge';
import { ifBranch } from '../if-branch';
import { switchCase } from '../switch-case';

describe('Workflow Builder', () => {
	describe('workflow()', () => {
		it('should create a workflow with id and name', () => {
			const wf = workflow('test-id', 'Test Workflow');
			expect(wf.id).toBe('test-id');
			expect(wf.name).toBe('Test Workflow');
		});

		it('should create a workflow with initial settings', () => {
			const wf = workflow('test-id', 'Test Workflow', {
				timezone: 'America/New_York',
				executionOrder: 'v1',
			});
			const json = wf.toJSON();
			expect(json.settings?.timezone).toBe('America/New_York');
			expect(json.settings?.executionOrder).toBe('v1');
		});
	});

	describe('.add()', () => {
		it('should add a trigger node to the workflow', () => {
			const t = trigger({
				type: 'n8n-nodes-base.scheduleTrigger',
				version: 1.1,
				config: { parameters: { rule: { interval: [{ field: 'hours', hour: 8 }] } } },
			});
			const wf = workflow('test-id', 'Test Workflow').add(t);
			const json = wf.toJSON();
			expect(json.nodes).toHaveLength(1);
			expect(json.nodes[0].type).toBe('n8n-nodes-base.scheduleTrigger');
		});

		it('should add multiple nodes', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const n = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {} });
			const wf = workflow('test-id', 'Test Workflow').add(t).add(n);
			const json = wf.toJSON();
			expect(json.nodes).toHaveLength(2);
		});

		it('should add a NodeChain and include all nodes', () => {
			const t = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const n1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'HTTP Request' },
			});
			const n2 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'Set Data' } });

			// Create a chain via .then()
			const chain = t.then(n1).then(n2);

			// Add the chain to workflow
			const wf = workflow('test-id', 'Test Workflow').add(chain);
			const json = wf.toJSON();

			// All three nodes should be in the workflow
			expect(json.nodes).toHaveLength(3);
			expect(json.nodes.map((n) => n.name).sort()).toEqual(
				['HTTP Request', 'Set Data', 'Start'].sort(),
			);

			// Connections should be preserved
			expect(json.connections['Start'].main[0]![0]!.node).toBe('HTTP Request');
			expect(json.connections['HTTP Request'].main[0]![0]!.node).toBe('Set Data');
		});
	});

	describe('.then()', () => {
		it('should chain nodes with connections', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const n1 = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {} });
			const n2 = node({ type: 'n8n-nodes-base.set', version: 3, config: {} });

			const wf = workflow('test-id', 'Test Workflow').add(t).then(n1).then(n2);

			const json = wf.toJSON();
			expect(json.nodes).toHaveLength(3);

			// Check connections: trigger -> n1 -> n2
			expect(json.connections[t.name]).toBeDefined();
			expect(json.connections[t.name].main[0]).toHaveLength(1);
			expect(json.connections[t.name].main[0][0].node).toBe(n1.name);

			expect(json.connections[n1.name]).toBeDefined();
			expect(json.connections[n1.name].main[0]).toHaveLength(1);
			expect(json.connections[n1.name].main[0][0].node).toBe(n2.name);
		});
	});

	describe('NodeInstance.onError()', () => {
		it('should connect error output to handler for regular nodes', () => {
			const httpNode = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'HTTP', onError: 'continueErrorOutput' },
			});
			const successHandler = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Success' },
			});
			const errorHandler = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Error Handler' },
			});

			// Use node.then() and node.onError() to set up connections
			httpNode.then(successHandler); // Output 0 -> success
			httpNode.onError(errorHandler); // Error output -> error handler

			const wf = workflow('test-id', 'Test Workflow')
				.add(httpNode)
				.add(successHandler)
				.add(errorHandler);

			const json = wf.toJSON();
			expect(json.nodes).toHaveLength(3);

			// Check HTTP node has two outputs: main (0) and error (1)
			expect(json.connections['HTTP'].main[0]).toHaveLength(1);
			expect(json.connections['HTTP'].main[0][0].node).toBe('Success');
			expect(json.connections['HTTP'].main[1]).toHaveLength(1);
			expect(json.connections['HTTP'].main[1][0].node).toBe('Error Handler');
		});

		it('should calculate correct error output index for IF nodes', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2,
				config: { name: 'IF', onError: 'continueErrorOutput' },
			});
			const trueHandler = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'True' },
			});
			const falseHandler = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'False' },
			});
			const errorHandler = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Error' },
			});

			// IF: true=0, false=1, error=2
			ifNode.then(trueHandler, 0);
			ifNode.then(falseHandler, 1);
			ifNode.onError(errorHandler);

			const wf = workflow('test-id', 'Test')
				.add(ifNode)
				.add(trueHandler)
				.add(falseHandler)
				.add(errorHandler);

			const json = wf.toJSON();

			expect(json.connections['IF'].main[0][0].node).toBe('True');
			expect(json.connections['IF'].main[1][0].node).toBe('False');
			expect(json.connections['IF'].main[2][0].node).toBe('Error');
		});

		it('should return this (not handler) for proper chaining with .then()', () => {
			// BUG FIX TEST: When using .then(node.onError(handler)), the .then() should
			// connect to the node, not to the handler returned by onError()
			const t = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const slackNode = node({
				type: 'n8n-nodes-base.slack',
				version: 2.4,
				config: { name: 'Send Slack', onError: 'continueErrorOutput' },
			});
			const telegramNode = node({
				type: 'n8n-nodes-base.telegram',
				version: 1.2,
				config: { name: 'Error Alert' },
			});

			// This chained syntax: .then(node.onError(handler))
			// Should result in: trigger -> slack -> (error) -> telegram
			// NOT: trigger -> telegram (which happens if onError returns handler)
			const wf = workflow('test-id', 'Test').add(t).then(slackNode.onError(telegramNode));

			const json = wf.toJSON();

			// Trigger should connect to Slack (not Telegram)
			expect(json.connections['Start'].main[0][0].node).toBe('Send Slack');

			// Slack's error output (index 1) should connect to Telegram
			expect(json.connections['Send Slack'].main[1][0].node).toBe('Error Alert');
		});
	});

	describe('.settings()', () => {
		it('should update workflow settings', () => {
			const wf = workflow('test-id', 'Test Workflow').settings({
				executionTimeout: 3600,
				saveManualExecutions: true,
			});
			const json = wf.toJSON();
			expect(json.settings?.executionTimeout).toBe(3600);
			expect(json.settings?.saveManualExecutions).toBe(true);
		});

		it('should merge settings with initial settings', () => {
			const wf = workflow('test-id', 'Test Workflow', {
				timezone: 'America/New_York',
			}).settings({
				executionTimeout: 3600,
			});
			const json = wf.toJSON();
			expect(json.settings?.timezone).toBe('America/New_York');
			expect(json.settings?.executionTimeout).toBe(3600);
		});
	});

	describe('.getNode()', () => {
		it('should retrieve node by name', () => {
			const t = trigger({
				type: 'n8n-nodes-base.webhookTrigger',
				version: 1,
				config: { name: 'My Trigger' },
			});
			const wf = workflow('test-id', 'Test Workflow').add(t);
			const found = wf.getNode('My Trigger');
			expect(found).toBeDefined();
			expect(found?.type).toBe('n8n-nodes-base.webhookTrigger');
		});

		it('should return undefined for non-existent node', () => {
			const wf = workflow('test-id', 'Test Workflow');
			const found = wf.getNode('Non Existent');
			expect(found).toBeUndefined();
		});
	});

	describe('.toJSON()', () => {
		it('should export complete workflow JSON', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: { url: 'https://example.com' } },
			});
			const wf = workflow('test-id', 'Test Workflow', {
				timezone: 'UTC',
			})
				.add(t)
				.then(n);

			const json = wf.toJSON();

			expect(json.id).toBe('test-id');
			expect(json.name).toBe('Test Workflow');
			expect(json.nodes).toHaveLength(2);
			expect(json.connections).toBeDefined();
			expect(json.settings?.timezone).toBe('UTC');
		});

		it('should include node positions', () => {
			const t = trigger({
				type: 'n8n-nodes-base.webhookTrigger',
				version: 1,
				config: { position: [100, 200] },
			});
			const wf = workflow('test-id', 'Test').add(t);
			const json = wf.toJSON();
			expect(json.nodes[0].position).toEqual([100, 200]);
		});

		it('should auto-position nodes when position not specified', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const n = node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: {} });
			const wf = workflow('test-id', 'Test').add(t).then(n);
			const json = wf.toJSON();
			// Both nodes should have positions assigned
			expect(json.nodes[0].position).toBeDefined();
			expect(json.nodes[1].position).toBeDefined();
			// Second node should be to the right of the first
			expect(json.nodes[1].position[0]).toBeGreaterThan(json.nodes[0].position[0]);
		});
	});

	describe('.toString()', () => {
		it('should serialize to JSON string', () => {
			const wf = workflow('test-id', 'Test Workflow');
			const str = wf.toString();
			const parsed = JSON.parse(str);
			expect(parsed.name).toBe('Test Workflow');
		});
	});

	describe('workflow.fromJSON()', () => {
		it('should import workflow from JSON', () => {
			const json = {
				id: 'imported-id',
				name: 'Imported Workflow',
				nodes: [
					{
						id: 'node-1',
						name: 'Webhook',
						type: 'n8n-nodes-base.webhook',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
				],
				connections: {},
				settings: { timezone: 'UTC' },
			};

			const wf = workflow.fromJSON(json);
			expect(wf.id).toBe('imported-id');
			expect(wf.name).toBe('Imported Workflow');
			const exported = wf.toJSON();
			expect(exported.nodes).toHaveLength(1);
			expect(exported.settings?.timezone).toBe('UTC');
		});

		it('should allow modifications after import', () => {
			const json = {
				id: 'imported-id',
				name: 'Imported Workflow',
				nodes: [
					{
						id: 'node-1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [0, 0] as [number, number],
						parameters: { url: 'https://old.com' },
					},
				],
				connections: {},
			};

			const wf = workflow.fromJSON(json);
			const httpNode = wf.getNode('HTTP Request');
			expect(httpNode).toBeDefined();

			// Add another node
			const newNode = node({ type: 'n8n-nodes-base.set', version: 3, config: {} });
			const updatedWf = wf.then(newNode);
			const exported = updatedWf.toJSON();
			expect(exported.nodes).toHaveLength(2);
		});
	});

	describe('AI nodes with subnodes', () => {
		it('should include subnodes in exported JSON', () => {
			const modelNode = languageModel({
				type: 'n8n-nodes-langchain.lmChatOpenAi',
				version: 1,
				config: { parameters: { model: 'gpt-4' } },
			});
			const memoryNode = memory({
				type: 'n8n-nodes-langchain.memoryBufferWindow',
				version: 1,
				config: { parameters: { windowSize: 5 } },
			});
			const toolNode = tool({
				type: 'n8n-nodes-langchain.toolCalculator',
				version: 1,
				config: {},
			});

			const agentNode = node({
				type: 'n8n-nodes-langchain.agent',
				version: 1.6,
				config: {
					parameters: { text: '={{ $json.prompt }}' },
					subnodes: {
						model: modelNode,
						memory: memoryNode,
						tools: [toolNode],
					},
				},
			});

			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});

			const wf = workflow('ai-test', 'AI Agent Test').add(triggerNode).then(agentNode);

			const json = wf.toJSON();

			// Should include all nodes: trigger + agent + model + memory + tool
			expect(json.nodes).toHaveLength(5);

			// Verify all node types are present
			const nodeTypes = json.nodes.map((n) => n.type);
			expect(nodeTypes).toContain('n8n-nodes-base.manualTrigger');
			expect(nodeTypes).toContain('n8n-nodes-langchain.agent');
			expect(nodeTypes).toContain('n8n-nodes-langchain.lmChatOpenAi');
			expect(nodeTypes).toContain('n8n-nodes-langchain.memoryBufferWindow');
			expect(nodeTypes).toContain('n8n-nodes-langchain.toolCalculator');
		});

		it('should create AI connections for subnodes', () => {
			const modelNode = languageModel({
				type: 'n8n-nodes-langchain.lmChatOpenAi',
				version: 1,
				config: { parameters: { model: 'gpt-4' } },
			});

			const agentNode = node({
				type: 'n8n-nodes-langchain.agent',
				version: 1.6,
				config: {
					parameters: {},
					subnodes: {
						model: modelNode,
					},
				},
			});

			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});

			const wf = workflow('ai-test', 'AI Agent Test').add(triggerNode).then(agentNode);

			const json = wf.toJSON();

			// Model node should have ai_languageModel connection to agent
			const modelConnections = json.connections[modelNode.name];
			expect(modelConnections).toBeDefined();
			expect(modelConnections.ai_languageModel).toBeDefined();
			expect(modelConnections.ai_languageModel[0][0].node).toBe(agentNode.name);
		});
	});

	describe('merge() with correct input indices', () => {
		it('should connect branches to different merge inputs', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const source1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Source 1' },
			});
			const source2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Source 2' },
			});
			const source3 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Source 3' },
			});

			const wf = workflow('test', 'Test')
				.add(triggerNode)
				.then(
					merge([source1, source2, source3], {
						mode: 'append',
					}),
				);

			const json = wf.toJSON();

			// Each source should connect to Merge at a DIFFERENT input index
			// source1 -> Merge input 0
			// source2 -> Merge input 1
			// source3 -> Merge input 2
			expect(json.connections['Source 1'].main[0][0].node).toBe('Merge');
			expect(json.connections['Source 1'].main[0][0].index).toBe(0);

			expect(json.connections['Source 2'].main[0][0].node).toBe('Merge');
			expect(json.connections['Source 2'].main[0][0].index).toBe(1);

			expect(json.connections['Source 3'].main[0][0].node).toBe('Merge');
			expect(json.connections['Source 3'].main[0][0].index).toBe(2);

			// Merge node should have numberInputs set to 3
			const mergeNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();
			expect(mergeNode?.parameters?.numberInputs).toBe(3);
		});

		it('should auto-calculate numberInputs from branches length', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const source1 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Source 1' },
			});
			const source2 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Source 2' },
			});

			const wf = workflow('test', 'Test')
				.add(triggerNode)
				.then(
					merge([source1, source2], {
						mode: 'append',
						// numberInputs NOT specified - should be auto-calculated
					}),
				);

			const json = wf.toJSON();

			const mergeNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode?.parameters?.numberInputs).toBe(2);
		});

		it('should support merge with custom name and parameters', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const source1 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Branch A' },
			});
			const source2 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Branch B' },
			});

			const wf = workflow('test', 'Test')
				.add(triggerNode)
				.then(
					merge([source1, source2], {
						mode: 'combine',
						parameters: {
							combineBy: 'combineByPosition',
						},
					}),
				);

			const json = wf.toJSON();

			const mergeNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode?.parameters?.mode).toBe('combine');
			expect(mergeNode?.parameters?.combineBy).toBe('combineByPosition');
		});
	});

	describe('NodeInstance.then() for fan-out', () => {
		it('should support fan-out via multiple .then() calls on same node', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const http1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'HTTP 1' },
			});
			const http2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'HTTP 2' },
			});

			// Fan-out: trigger connects to both http1 and http2
			triggerNode.then(http1);
			triggerNode.then(http2);

			const wf = workflow('test', 'Test').add(triggerNode).add(http1).add(http2);

			const json = wf.toJSON();

			// Trigger should have 2 connections from output 0
			expect(json.connections[triggerNode.name].main[0]).toHaveLength(2);
			expect(json.connections[triggerNode.name].main[0].map((c) => c.node)).toContain('HTTP 1');
			expect(json.connections[triggerNode.name].main[0].map((c) => c.node)).toContain('HTTP 2');
		});

		it('should support chaining: nodeA.then(nodeB).then(nodeC)', () => {
			const nodeA = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'A' } });
			const nodeB = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });
			const nodeC = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'C' } });

			// Chain: A → B → C
			nodeA.then(nodeB).then(nodeC);

			const wf = workflow('test', 'Test').add(nodeA).add(nodeB).add(nodeC);

			const json = wf.toJSON();

			expect(json.connections['A'].main[0][0].node).toBe('B');
			expect(json.connections['B'].main[0][0].node).toBe('C');
		});

		it('should support fan-out from specific output index', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2,
				config: { name: 'If Check' },
			});
			const truePath = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'True Path' },
			});
			const falsePath = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'False Path' },
			});

			// Connect IF outputs to different paths
			ifNode.then(truePath, 0); // output 0 -> truePath
			ifNode.then(falsePath, 1); // output 1 -> falsePath

			const wf = workflow('test', 'Test').add(ifNode).add(truePath).add(falsePath);

			const json = wf.toJSON();

			expect(json.connections['If Check'].main[0][0].node).toBe('True Path');
			expect(json.connections['If Check'].main[1][0].node).toBe('False Path');
		});

		it('should return NodeChain for chaining', () => {
			const nodeA = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'A' } });
			const nodeB = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });

			const result = nodeA.then(nodeB);

			// .then() should return a NodeChain containing both nodes
			expect(result._isChain).toBe(true);
			expect(result.head).toBe(nodeA);
			expect(result.tail).toBe(nodeB);
			expect(result.allNodes).toEqual([nodeA, nodeB]);
			// Chain should proxy tail properties
			expect(result.name).toBe(nodeB.name);
			expect(result.type).toBe(nodeB.type);
		});

		it('should allow getting declared connections', () => {
			const nodeA = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'A' } });
			const nodeB = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });
			const nodeC = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'C' } });

			nodeA.then(nodeB);
			nodeA.then(nodeC, 1);

			const connections = nodeA.getConnections();

			expect(connections).toHaveLength(2);
			expect(connections[0]).toEqual({ target: nodeB, outputIndex: 0 });
			expect(connections[1]).toEqual({ target: nodeC, outputIndex: 1 });
		});
	});

	describe('ifBranch()', () => {
		it('should create IF node with true and false branches', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const trueNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'True Path' },
			});
			const falseNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'False Path' },
			});

			const wf = workflow('test', 'Test')
				.add(triggerNode)
				.then(
					ifBranch([trueNode, falseNode], {
						name: 'Check Value',
						parameters: {
							conditions: {
								conditions: [
									{
										leftValue: '={{ $json.value }}',
										operator: { type: 'number', operation: 'gt' },
										rightValue: 100,
									},
								],
							},
						},
					}),
				);

			const json = wf.toJSON();

			// IF node should have correct connections
			expect(json.connections['Check Value'].main[0][0].node).toBe('True Path');
			expect(json.connections['Check Value'].main[1][0].node).toBe('False Path');

			// Trigger should connect to IF
			expect(json.connections[triggerNode.name].main[0][0].node).toBe('Check Value');

			// All nodes should be present (trigger, IF, true, false)
			expect(json.nodes).toHaveLength(4);
		});

		it('should use generated IF types for config', () => {
			const trueNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'True' },
			});
			const falseNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'False' },
			});

			const wf = workflow('test', 'Test').then(
				ifBranch([trueNode, falseNode], {
					name: 'Type Check',
					parameters: { looseTypeValidation: true },
				}),
			);

			const json = wf.toJSON();

			const ifNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			expect(ifNode?.typeVersion).toBe(2.3);
			expect(ifNode?.parameters?.looseTypeValidation).toBe(true);
		});

		it('should chain after IF node', () => {
			const trueNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'True' },
			});
			const falseNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'False' },
			});
			const afterNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'After' },
			});

			const wf = workflow('test', 'Test')
				.then(ifBranch([trueNode, falseNode], { name: 'IF' }))
				.then(afterNode);

			const json = wf.toJSON();

			// IF should be connected to true and false
			expect(json.connections['IF'].main[0][0].node).toBe('True');
			expect(json.connections['IF'].main[1][0].node).toBe('False');

			// After should be in the workflow (chained from IF's output 0)
			expect(json.nodes.find((n) => n.name === 'After')).toBeDefined();
		});
	});

	describe('pinData', () => {
		it('should collect pinData from node config into workflow JSON', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start', position: [240, 300] },
			});

			const boxNode = node({
				type: 'n8n-nodes-base.box',
				version: 1,
				config: {
					name: 'Search Box Files',
					parameters: {
						resource: 'file',
						operation: 'search',
						query: 'test',
					},
					position: [540, 300],
					pinData: [
						{
							id: '123456789',
							type: 'file',
							name: 'Q4_Report.pdf',
							size: 2048576,
						},
						{
							id: '987654321',
							type: 'file',
							name: 'Meeting_Notes.docx',
							size: 524288,
						},
					],
				},
			});

			const wf = workflow('test-id', 'Test Workflow').add(triggerNode).then(boxNode);
			const json = wf.toJSON();

			// pinData should be in the workflow JSON at the top level, keyed by node name
			expect(json.pinData).toBeDefined();
			expect(json.pinData!['Search Box Files']).toBeDefined();
			expect(json.pinData!['Search Box Files']).toHaveLength(2);
			expect(json.pinData!['Search Box Files'][0].id).toBe('123456789');
			expect(json.pinData!['Search Box Files'][1].id).toBe('987654321');
		});

		it('should collect pinData from multiple nodes', () => {
			const node1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'HTTP Node 1',
					pinData: [{ result: 'data1' }],
				},
			});

			const node2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'HTTP Node 2',
					pinData: [{ result: 'data2' }],
				},
			});

			const wf = workflow('test-id', 'Test').add(node1).then(node2);
			const json = wf.toJSON();

			expect(json.pinData).toBeDefined();
			expect(json.pinData!['HTTP Node 1']).toEqual([{ result: 'data1' }]);
			expect(json.pinData!['HTTP Node 2']).toEqual([{ result: 'data2' }]);
		});

		it('should not include pinData key when no nodes have pinData', () => {
			const node1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'HTTP Node' },
			});

			const wf = workflow('test-id', 'Test').add(node1);
			const json = wf.toJSON();

			// pinData should not exist or be undefined when no nodes have pinData
			expect(json.pinData).toBeUndefined();
		});
	});

	describe('switchCase()', () => {
		it('should create Switch node with case branches', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const case0 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Case 0' },
			});
			const case1 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Case 1' },
			});
			const case2 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Case 2' },
			});

			const wf = workflow('test', 'Test')
				.add(triggerNode)
				.then(
					switchCase([case0, case1, case2], {
						name: 'Route by Type',
						parameters: { mode: 'rules' },
					}),
				);

			const json = wf.toJSON();

			// Switch node should have correct connections
			expect(json.connections['Route by Type'].main[0][0].node).toBe('Case 0');
			expect(json.connections['Route by Type'].main[1][0].node).toBe('Case 1');
			expect(json.connections['Route by Type'].main[2][0].node).toBe('Case 2');

			// All nodes should be present (trigger, switch, case0, case1, case2)
			expect(json.nodes).toHaveLength(5);
		});

		it('should include fallback as last case in array', () => {
			const case0 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Case 0' },
			});
			const fallback = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Fallback' },
			});

			const wf = workflow('test', 'Test').then(
				switchCase([case0, fallback], {
					name: 'Router',
					parameters: { mode: 'rules' },
				}),
			);

			const json = wf.toJSON();

			// Fallback is just the last case (output 1)
			expect(json.connections['Router'].main[1][0].node).toBe('Fallback');

			// Switch node should exist
			const switchNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.switch');
			expect(switchNode).toBeDefined();
		});

		it('should use latest Switch version', () => {
			const case0 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Case 0' },
			});

			const wf = workflow('test', 'Test').then(
				switchCase([case0], {
					name: 'Switch',
					parameters: { mode: 'expression', numberOutputs: 4 },
				}),
			);

			const json = wf.toJSON();

			const switchNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.switch');
			expect(switchNode?.typeVersion).toBe(3.4);
		});

		it('should connect trigger to switch', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const case0 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Case 0' },
			});

			const wf = workflow('test', 'Test')
				.add(triggerNode)
				.then(switchCase([case0], { name: 'Switch' }));

			const json = wf.toJSON();

			// Trigger should connect to Switch
			expect(json.connections[triggerNode.name].main[0][0].node).toBe('Switch');
		});
	});
});
