import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';

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
			const t = trigger('n8n-nodes-base.scheduleTrigger', 'v1.1', {
				parameters: { rule: { interval: [{ field: 'hours', hour: 8 }] } },
			});
			const wf = workflow('test-id', 'Test Workflow').add(t);
			const json = wf.toJSON();
			expect(json.nodes).toHaveLength(1);
			expect(json.nodes[0].type).toBe('n8n-nodes-base.scheduleTrigger');
		});

		it('should add multiple nodes', () => {
			const t = trigger('n8n-nodes-base.webhookTrigger', 'v1', {});
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {});
			const wf = workflow('test-id', 'Test Workflow').add(t).add(n);
			const json = wf.toJSON();
			expect(json.nodes).toHaveLength(2);
		});
	});

	describe('.then()', () => {
		it('should chain nodes with connections', () => {
			const t = trigger('n8n-nodes-base.webhookTrigger', 'v1', {});
			const n1 = node('n8n-nodes-base.httpRequest', 'v4.2', {});
			const n2 = node('n8n-nodes-base.set', 'v3', {});

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

	describe('.output()', () => {
		it('should select output branch by index', () => {
			const t = trigger('n8n-nodes-base.webhookTrigger', 'v1', {});
			const ifNode = node('n8n-nodes-base.if', 'v2', {
				parameters: { conditions: { boolean: [{ value1: true }] } },
			});
			const trueHandler = node('n8n-nodes-base.noOp', 'v1', { name: 'True Branch' });
			const falseHandler = node('n8n-nodes-base.noOp', 'v1', { name: 'False Branch' });

			const wf = workflow('test-id', 'Test Workflow')
				.add(t)
				.then(ifNode)
				.output(0)
				.then(trueHandler)
				.output(1)
				.then(falseHandler);

			const json = wf.toJSON();
			expect(json.nodes).toHaveLength(4);

			// Check if node has two output branches
			expect(json.connections[ifNode.name].main[0]).toHaveLength(1);
			expect(json.connections[ifNode.name].main[0][0].node).toBe('True Branch');
			expect(json.connections[ifNode.name].main[1]).toHaveLength(1);
			expect(json.connections[ifNode.name].main[1][0].node).toBe('False Branch');
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
			const t = trigger('n8n-nodes-base.webhookTrigger', 'v1', { name: 'My Trigger' });
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
			const t = trigger('n8n-nodes-base.webhookTrigger', 'v1', {});
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {
				parameters: { url: 'https://example.com' },
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
			const t = trigger('n8n-nodes-base.webhookTrigger', 'v1', {
				position: [100, 200],
			});
			const wf = workflow('test-id', 'Test').add(t);
			const json = wf.toJSON();
			expect(json.nodes[0].position).toEqual([100, 200]);
		});

		it('should auto-position nodes when position not specified', () => {
			const t = trigger('n8n-nodes-base.webhookTrigger', 'v1', {});
			const n = node('n8n-nodes-base.httpRequest', 'v4.2', {});
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
			const newNode = node('n8n-nodes-base.set', 'v3', {});
			const updatedWf = wf.then(newNode);
			const exported = updatedWf.toJSON();
			expect(exported.nodes).toHaveLength(2);
		});
	});

	describe('AI nodes with subnodes', () => {
		it('should include subnodes in exported JSON', () => {
			const modelNode = node('n8n-nodes-langchain.lmChatOpenAi', 'v1', {
				parameters: { model: 'gpt-4' },
			});
			const memoryNode = node('n8n-nodes-langchain.memoryBufferWindow', 'v1', {
				parameters: { windowSize: 5 },
			});
			const toolNode = node('n8n-nodes-langchain.toolCalculator', 'v1', {});

			const agentNode = node('n8n-nodes-langchain.agent', 'v1.6', {
				parameters: { text: '={{ $json.prompt }}' },
				subnodes: {
					model: modelNode,
					memory: memoryNode,
					tools: [toolNode],
				},
			});

			const triggerNode = trigger('n8n-nodes-base.manualTrigger', 'v1', {});

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
			const modelNode = node('n8n-nodes-langchain.lmChatOpenAi', 'v1', {
				parameters: { model: 'gpt-4' },
			});

			const agentNode = node('n8n-nodes-langchain.agent', 'v1.6', {
				parameters: {},
				subnodes: {
					model: modelNode,
				},
			});

			const triggerNode = trigger('n8n-nodes-base.manualTrigger', 'v1', {});

			const wf = workflow('ai-test', 'AI Agent Test').add(triggerNode).then(agentNode);

			const json = wf.toJSON();

			// Model node should have ai_languageModel connection to agent
			const modelConnections = json.connections[modelNode.name];
			expect(modelConnections).toBeDefined();
			expect(modelConnections.ai_languageModel).toBeDefined();
			expect(modelConnections.ai_languageModel[0][0].node).toBe(agentNode.name);
		});
	});
});
