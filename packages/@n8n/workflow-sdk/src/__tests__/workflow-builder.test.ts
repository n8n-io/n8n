import { workflow } from '../workflow-builder';
import { node, trigger, sticky } from '../node-builder';
import { languageModel, memory, tool, outputParser } from '../subnode-builders';
import type { NodeInstance, WorkflowJSON } from '../types/base';

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

		it('should add multiple sticky notes with explicit names', () => {
			const t = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const agentNode = node({
				type: 'n8n-nodes-langchain.agent',
				version: 1.6,
				config: { name: 'Research Agent', position: [400, 300] },
			});

			// Create 4 sticky notes with explicit names (recommended approach to avoid collisions)
			const sticky1 = sticky('## Research Agent Note', { color: 5, name: 'Research Note' });
			const sticky2 = sticky('## Fact-Check Agent Note', { color: 3, name: 'Fact-Check Note' });
			const sticky3 = sticky('## Writing Agent Note', { color: 6, name: 'Writing Note' });
			const sticky4 = sticky('## Editing Agent Note', { color: 4, name: 'Editing Note' });

			const wf = workflow('test-id', 'Test Workflow')
				.add(t)
				.then(agentNode)
				.add(sticky1)
				.add(sticky2)
				.add(sticky3)
				.add(sticky4);

			const json = wf.toJSON();

			// All 6 nodes should be present (trigger, agent, 4 stickies)
			expect(json.nodes).toHaveLength(6);

			// All sticky notes should have unique names
			const stickyNodes = json.nodes.filter((n) => n.type === 'n8n-nodes-base.stickyNote');
			expect(stickyNodes).toHaveLength(4);

			// Extract names and verify uniqueness
			const stickyNames = stickyNodes.map((n) => n.name);
			const uniqueNames = new Set(stickyNames);
			expect(uniqueNames.size).toBe(4);

			// Verify content is preserved for each sticky
			const contents = stickyNodes.map((n) => n.parameters?.content);
			expect(contents).toContain('## Research Agent Note');
			expect(contents).toContain('## Fact-Check Agent Note');
			expect(contents).toContain('## Writing Agent Note');
			expect(contents).toContain('## Editing Agent Note');
		});

		it('should add SwitchCaseBuilder directly', () => {
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
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.2,
				config: {
					name: 'Direct Switch',
					parameters: { mode: 'rules' },
				},
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;

			// Pass fluent builder directly to add() - runtime supports this but types don't
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const wf = workflow('test', 'Test').add(switchNode.onCase!(0, case0).onCase(1, case1) as any);

			const json = wf.toJSON();

			// All 3 nodes should be present (switch + 2 cases)
			expect(json.nodes).toHaveLength(3);

			// Switch should connect to cases
			expect(json.connections['Direct Switch']?.main[0]?.[0]?.node).toBe('Case 0');
			expect(json.connections['Direct Switch']?.main[1]?.[0]?.node).toBe('Case 1');
		});

		it('should add IfElseBuilder directly', () => {
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
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: {
					name: 'Direct IF',
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
				},
			}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;

			// Pass fluent builder directly to add() - runtime supports this but types don't
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const wf = workflow('test', 'Test').add(ifNode.onTrue!(trueNode).onFalse(falseNode) as any);

			const json = wf.toJSON();

			// All 3 nodes should be present (IF + 2 branches)
			expect(json.nodes).toHaveLength(3);

			// IF should connect to branches
			expect(json.connections['Direct IF']?.main[0]?.[0]?.node).toBe('True Path');
			expect(json.connections['Direct IF']?.main[1]?.[0]?.node).toBe('False Path');
		});

		it('should add merge pattern using .input(n) syntax', () => {
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
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: {
					name: 'Merge',
					parameters: { mode: 'append' },
				},
			}) as NodeInstance<'n8n-nodes-base.merge', string, unknown>;

			// Use .input(n) syntax to connect sources to merge inputs
			const wf = workflow('test', 'Test')
				.add(source1.then(mergeNode.input(0)))
				.add(source2.then(mergeNode.input(1)));

			const json = wf.toJSON();

			// All 3 nodes should be present (merge + 2 sources)
			expect(json.nodes).toHaveLength(3);

			// Sources should connect to Merge at different input indices
			expect(json.connections['Source 1']?.main[0]?.[0]?.node).toBe('Merge');
			expect(json.connections['Source 1']?.main[0]?.[0]?.index).toBe(0);
			expect(json.connections['Source 2']?.main[0]?.[0]?.node).toBe('Merge');
			expect(json.connections['Source 2']?.main[0]?.[0]?.index).toBe(1);
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
			expect(json.connections[t.name]?.main[0]).toHaveLength(1);
			expect(json.connections[t.name]?.main[0]?.[0]?.node).toBe(n1.name);

			expect(json.connections[n1.name]).toBeDefined();
			expect(json.connections[n1.name]?.main[0]).toHaveLength(1);
			expect(json.connections[n1.name]?.main[0]?.[0]?.node).toBe(n2.name);
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
			expect(json.connections['HTTP']?.main[0]).toHaveLength(1);
			expect(json.connections['HTTP']?.main[0]?.[0]?.node).toBe('Success');
			expect(json.connections['HTTP']?.main[1]).toHaveLength(1);
			expect(json.connections['HTTP']?.main[1]?.[0]?.node).toBe('Error Handler');
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

			expect(json.connections['IF']?.main[0]?.[0]?.node).toBe('True');
			expect(json.connections['IF']?.main[1]?.[0]?.node).toBe('False');
			expect(json.connections['IF']?.main[2]?.[0]?.node).toBe('Error');
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
			expect(json.connections['Start']?.main[0]?.[0]?.node).toBe('Send Slack');

			// Slack's error output (index 1) should connect to Telegram
			expect(json.connections['Send Slack']?.main[1]?.[0]?.node).toBe('Error Alert');
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

		it('should preserve credentials exactly including empty placeholder objects', () => {
			// Type assertion needed because empty credential placeholders ({}) are valid at runtime
			// but don't satisfy the strict WorkflowJSON type
			const json = {
				id: 'creds-test',
				name: 'Credentials Test',
				nodes: [
					{
						id: 'node-1',
						name: 'OpenAI Chat Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [0, 0] as [number, number],
						parameters: {},
						// Empty placeholder credentials (common in templates)
						credentials: {
							openAiApi: {},
						},
					},
					{
						id: 'node-2',
						name: 'Telegram',
						type: 'n8n-nodes-base.telegram',
						typeVersion: 1.2,
						position: [200, 0] as [number, number],
						parameters: {},
						// Full credentials with name and id
						credentials: {
							telegramApi: { name: 'My Telegram', id: 'cred-123' },
						},
					},
					{
						id: 'node-3',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.1,
						position: [400, 0] as [number, number],
						parameters: {},
						// Credentials with only name (no id)
						credentials: {
							gmailOAuth2: { name: 'My Gmail' },
						},
					},
				],
				connections: {},
			} as WorkflowJSON;

			const wf = workflow.fromJSON(json);
			const exported = wf.toJSON();

			// Find each node in exported JSON
			const openAiNode = exported.nodes.find((n) => n.name === 'OpenAI Chat Model');
			const telegramNode = exported.nodes.find((n) => n.name === 'Telegram');
			const gmailNode = exported.nodes.find((n) => n.name === 'Gmail');

			// Empty placeholder credentials should be preserved exactly (no added id: "")
			expect(openAiNode?.credentials).toEqual({ openAiApi: {} });

			// Full credentials should be preserved exactly
			expect(telegramNode?.credentials).toEqual({
				telegramApi: { name: 'My Telegram', id: 'cred-123' },
			});

			// Credentials with only name should be preserved (no added id: "")
			expect(gmailNode?.credentials).toEqual({ gmailOAuth2: { name: 'My Gmail' } });
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
			expect(modelConnections?.ai_languageModel).toBeDefined();
			expect(modelConnections?.ai_languageModel?.[0]?.[0]?.node).toBe(agentNode.name);
		});
	});

	describe('merge with .input(n) syntax', () => {
		it('should connect branches to different merge inputs', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: {
					name: 'Merge',
					parameters: { mode: 'append' },
				},
			}) as NodeInstance<'n8n-nodes-base.merge', string, unknown>;
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

			// Use .input(n) syntax instead of merge composite
			const wf = workflow('test', 'Test')
				.add(triggerNode.then([source1, source2, source3]))
				.add(source1.then(mergeNode.input(0)))
				.add(source2.then(mergeNode.input(1)))
				.add(source3.then(mergeNode.input(2)));

			const json = wf.toJSON();

			// Each source should connect to Merge at a DIFFERENT input index
			// source1 -> Merge input 0
			// source2 -> Merge input 1
			// source3 -> Merge input 2
			expect(json.connections['Source 1']?.main[0]?.[0]?.node).toBe('Merge');
			expect(json.connections['Source 1']?.main[0]?.[0]?.index).toBe(0);

			expect(json.connections['Source 2']?.main[0]?.[0]?.node).toBe('Merge');
			expect(json.connections['Source 2']?.main[0]?.[0]?.index).toBe(1);

			expect(json.connections['Source 3']?.main[0]?.[0]?.node).toBe('Merge');
			expect(json.connections['Source 3']?.main[0]?.[0]?.index).toBe(2);

			// Merge node should exist
			const foundMergeNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(foundMergeNode).toBeDefined();
		});

		it('should support merge with custom name and parameters', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const mergeNode = node({
				type: 'n8n-nodes-base.merge',
				version: 3,
				config: {
					name: 'Combine Branches',
					parameters: {
						mode: 'combine',
						combineBy: 'combineByPosition',
					},
				},
			}) as NodeInstance<'n8n-nodes-base.merge', string, unknown>;
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

			// Use .input(n) syntax instead of merge composite
			const wf = workflow('test', 'Test')
				.add(triggerNode.then([source1, source2]))
				.add(source1.then(mergeNode.input(0)))
				.add(source2.then(mergeNode.input(1)));

			const json = wf.toJSON();

			const foundMergeNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(foundMergeNode?.parameters?.mode).toBe('combine');
			expect(foundMergeNode?.parameters?.combineBy).toBe('combineByPosition');
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
			expect(json.connections[triggerNode.name]?.main[0]).toHaveLength(2);
			expect(json.connections[triggerNode.name]?.main[0]?.map((c) => c.node)).toContain('HTTP 1');
			expect(json.connections[triggerNode.name]?.main[0]?.map((c) => c.node)).toContain('HTTP 2');
		});

		it('should support chaining: nodeA.then(nodeB).then(nodeC)', () => {
			const nodeA = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'A' } });
			const nodeB = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'B' } });
			const nodeC = node({ type: 'n8n-nodes-base.noOp', version: 1, config: { name: 'C' } });

			// Chain: A → B → C
			nodeA.then(nodeB).then(nodeC);

			const wf = workflow('test', 'Test').add(nodeA).add(nodeB).add(nodeC);

			const json = wf.toJSON();

			expect(json.connections['A']?.main[0]?.[0]?.node).toBe('B');
			expect(json.connections['B']?.main[0]?.[0]?.node).toBe('C');
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

			expect(json.connections['If Check']?.main[0]?.[0]?.node).toBe('True Path');
			expect(json.connections['If Check']?.main[1]?.[0]?.node).toBe('False Path');
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

	describe('IF fluent API', () => {
		it('should create IF node with true and false branches', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.3,
				config: {
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
				},
			}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;
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
				.then(ifNode.onTrue!(trueNode).onFalse(falseNode));

			const json = wf.toJSON();

			// IF node should have correct connections
			expect(json.connections['Check Value']?.main[0]?.[0]?.node).toBe('True Path');
			expect(json.connections['Check Value']?.main[1]?.[0]?.node).toBe('False Path');

			// Trigger should connect to IF
			expect(json.connections[triggerNode.name]?.main[0]?.[0]?.node).toBe('Check Value');

			// All nodes should be present (trigger, IF, true, false)
			expect(json.nodes).toHaveLength(4);
		});

		it('should use generated IF types for config', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.3,
				config: {
					name: 'Type Check',
					parameters: { looseTypeValidation: true },
				},
			}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;
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

			const wf = workflow('test', 'Test').then(ifNode.onTrue!(trueNode).onFalse(falseNode));

			const json = wf.toJSON();

			const foundIfNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.if');
			expect(foundIfNode?.typeVersion).toBe(2.3);
			expect(foundIfNode?.parameters?.looseTypeValidation).toBe(true);
		});

		it('should chain after IF node', () => {
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.3,
				config: { name: 'IF' },
			}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;
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
				.then(ifNode.onTrue!(trueNode).onFalse(falseNode))
				.then(afterNode);

			const json = wf.toJSON();

			// IF should be connected to true and false
			expect(json.connections['IF']?.main[0]?.[0]?.node).toBe('True');
			expect(json.connections['IF']?.main[1]?.[0]?.node).toBe('False');

			// After should be in the workflow (chained from IF's output 0)
			expect(json.nodes.find((n) => n.name === 'After')).toBeDefined();
		});

		it('should handle only false branch connected (no true branch)', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.3,
				config: {
					name: 'IF Check',
					parameters: {
						conditions: {
							conditions: [
								{
									leftValue: '={{ $json.skip }}',
									operator: { type: 'boolean', operation: 'true' },
								},
							],
						},
					},
				},
			}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;
			const falseNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'False Path' },
			});

			// Only false branch is connected using onFalse()
			const wf = workflow('test', 'Test').add(triggerNode).then(ifNode.onFalse!(falseNode));

			const json = wf.toJSON();

			// Should have 3 nodes: trigger, IF, false path (no true path)
			expect(json.nodes).toHaveLength(3);
			expect(json.nodes.map((n) => n.name)).toContain('IF Check');
			expect(json.nodes.map((n) => n.name)).toContain('False Path');

			// IF should only have output 1 (false) connected, output 0 should be empty or undefined
			const output0 = json.connections['IF Check']?.main[0];
			expect(!output0 || output0.length === 0).toBe(true);
			expect(json.connections['IF Check']?.main[1]?.[0]?.node).toBe('False Path');
		});

		it('should handle only true branch connected (no false branch)', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const ifNode = node({
				type: 'n8n-nodes-base.if',
				version: 2.3,
				config: {
					name: 'IF Check',
					parameters: {
						conditions: {
							conditions: [
								{
									leftValue: '={{ $json.proceed }}',
									operator: { type: 'boolean', operation: 'true' },
								},
							],
						},
					},
				},
			}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;
			const trueNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'True Path' },
			});

			// Only true branch is connected using onTrue()
			const wf = workflow('test', 'Test').add(triggerNode).then(ifNode.onTrue!(trueNode));

			const json = wf.toJSON();

			// Should have 3 nodes: trigger, IF, true path (no false path)
			expect(json.nodes).toHaveLength(3);
			expect(json.nodes.map((n) => n.name)).toContain('IF Check');
			expect(json.nodes.map((n) => n.name)).toContain('True Path');

			// IF should only have output 0 (true) connected
			expect(json.connections['IF Check']?.main[0]?.[0]?.node).toBe('True Path');
			expect(json.connections['IF Check']?.main[1]).toBeUndefined();
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

	describe('Switch fluent API', () => {
		it('should connect all switch outputs including fallback (output 2)', () => {
			// BUG: When using workflow.add(chain).then(switchNode.onCase(...)),
			// output 2 (fallback) was not being connected
			const t = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const linearNode = node({
				type: 'n8n-nodes-base.linear',
				version: 1.1,
				config: { name: 'Get Issues', onError: 'continueErrorOutput' },
			});
			const errorHandler = node({
				type: 'n8n-nodes-base.slack',
				version: 2.4,
				config: { name: 'Send Error to Slack' },
			});
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: {
					name: 'Triage Issues',
					parameters: {
						mode: 'rules',
						options: { fallbackOutput: 2 },
					},
				},
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;
			const case0 = node({
				type: 'n8n-nodes-base.linear',
				version: 1.1,
				config: { name: 'Update as Bug' },
			});
			const case1 = node({
				type: 'n8n-nodes-base.linear',
				version: 1.1,
				config: { name: 'Update as Feature' },
			});
			const case2 = node({
				type: 'n8n-nodes-base.linear',
				version: 1.1,
				config: { name: 'Update as Other' },
			});

			// Using fluent syntax
			const wf = workflow('test', 'Test')
				.add(t.then(linearNode.onError(errorHandler)))
				.then(switchNode.onCase!(0, case0).onCase(1, case1).onCase(2, case2));

			const json = wf.toJSON();

			// All 7 nodes should be present (including error handler)
			expect(json.nodes).toHaveLength(7);
			expect(json.nodes.map((n) => n.name)).toContain('Send Error to Slack');

			// Linear node should connect to Switch
			expect(json.connections['Get Issues']).toBeDefined();
			expect(json.connections['Get Issues']!.main[0]![0]!.node).toBe('Triage Issues');

			// Switch should connect to ALL 3 cases
			expect(json.connections['Triage Issues']).toBeDefined();
			expect(json.connections['Triage Issues']!.main[0]![0]!.node).toBe('Update as Bug');
			expect(json.connections['Triage Issues']!.main[1]![0]!.node).toBe('Update as Feature');
			// THIS IS THE BUG - output 2 (fallback) should be connected
			expect(json.connections['Triage Issues']!.main[2]).toBeDefined();
			expect(json.connections['Triage Issues']!.main[2]![0]!.node).toBe('Update as Other');
		});

		it('should connect previous node to switch when using chain with add()', () => {
			// BUG FIX TEST: When using .add() with a chain containing switchNode.onCase(),
			// the connection from the previous node to the switch was not being created
			const t = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});
			const linearNode = node({
				type: 'n8n-nodes-base.linear',
				version: 1.1,
				config: { name: 'Get Issues' },
			});
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: {
					name: 'Triage',
					parameters: { mode: 'rules' },
				},
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;
			const case0 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Bug Handler' },
			});
			const case1 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Feature Handler' },
			});

			// This pattern is what causes the bug: chain with fluent builder inside add()
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const chain = t.then(linearNode).then(switchNode.onCase!(0, case0).onCase(1, case1) as any);

			const wf = workflow('test', 'Test').add(chain);
			const json = wf.toJSON();

			// All 5 nodes should be present
			expect(json.nodes).toHaveLength(5);

			// Trigger should connect to Linear node
			expect(json.connections['Start']!.main[0]![0]!.node).toBe('Get Issues');

			// Linear node should connect to Switch - THIS IS THE BUG!
			// Before fix: json.connections['Get Issues'] is undefined
			expect(json.connections['Get Issues']).toBeDefined();
			expect(json.connections['Get Issues']!.main[0]![0]!.node).toBe('Triage');

			// Switch should connect to cases
			expect(json.connections['Triage']!.main[0]![0]!.node).toBe('Bug Handler');
			expect(json.connections['Triage']!.main[1]![0]!.node).toBe('Feature Handler');
		});

		it('should create Switch node with case branches', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: {
					name: 'Route by Type',
					parameters: { mode: 'rules' },
				},
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;
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
				.then(switchNode.onCase!(0, case0).onCase(1, case1).onCase(2, case2));

			const json = wf.toJSON();

			// Switch node should have correct connections
			expect(json.connections['Route by Type']?.main[0]?.[0]?.node).toBe('Case 0');
			expect(json.connections['Route by Type']?.main[1]?.[0]?.node).toBe('Case 1');
			expect(json.connections['Route by Type']?.main[2]?.[0]?.node).toBe('Case 2');

			// All nodes should be present (trigger, switch, case0, case1, case2)
			expect(json.nodes).toHaveLength(5);
		});

		it('should include fallback as last case', () => {
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: {
					name: 'Router',
					parameters: { mode: 'rules' },
				},
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;
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

			const wf = workflow('test', 'Test').then(switchNode.onCase!(0, case0).onCase(1, fallback));

			const json = wf.toJSON();

			// Fallback is just the last case (output 1)
			expect(json.connections['Router']?.main[1]?.[0]?.node).toBe('Fallback');

			// Switch node should exist
			const foundSwitchNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.switch');
			expect(foundSwitchNode).toBeDefined();
		});

		it('should use latest Switch version', () => {
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: {
					name: 'Switch',
					parameters: { mode: 'expression', numberOutputs: 4 },
				},
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;
			const case0 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Case 0' },
			});

			const wf = workflow('test', 'Test').then(switchNode.onCase!(0, case0));

			const json = wf.toJSON();

			const foundSwitchNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.switch');
			expect(foundSwitchNode?.typeVersion).toBe(3.4);
		});

		it('should connect trigger to switch', () => {
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: {},
			});
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'Switch' },
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;
			const case0 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Case 0' },
			});

			const wf = workflow('test', 'Test').add(triggerNode).then(switchNode.onCase!(0, case0));

			const json = wf.toJSON();

			// Trigger should connect to Switch
			expect(json.connections[triggerNode.name]?.main[0]?.[0]?.node).toBe('Switch');
		});

		it('should include trigger node when using trigger.to(switch).onCase() directly in add()', () => {
			// BUG: When trigger.to(switch).onCase() is passed to add(),
			// the trigger node is lost because NodeChain.onCase() delegates to
			// tail.onCase() which creates a new SwitchCaseBuilder without the chain context
			const triggerNode = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2.1,
				config: { name: 'Webhook Trigger' },
			});
			const switchNode = node({
				type: 'n8n-nodes-base.switch',
				version: 3.4,
				config: { name: 'Route by Amount' },
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;
			const case0 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Auto Approve' },
			});
			const case1 = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Manual Approve' },
			});

			// This pattern loses the trigger: trigger.to(switch).onCase()
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const switchBuilder = triggerNode.to(switchNode).onCase!(0, case0).onCase(1, case1) as any;
			const wf = workflow('test', 'Test').add(switchBuilder);

			const json = wf.toJSON();

			// All 4 nodes should be present (trigger + switch + 2 cases)
			expect(json.nodes).toHaveLength(4);
			expect(json.nodes.map((n) => n.name)).toContain('Webhook Trigger');

			// Trigger should connect to Switch
			expect(json.connections['Webhook Trigger']).toBeDefined();
			expect(json.connections['Webhook Trigger']!.main[0]![0]!.node).toBe('Route by Amount');

			// Switch should connect to cases
			expect(json.connections['Route by Amount']!.main[0]![0]!.node).toBe('Auto Approve');
			expect(json.connections['Route by Amount']!.main[1]![0]!.node).toBe('Manual Approve');
		});
	});

	describe('toJSON - resource locator normalization', () => {
		it('should add __rl: true to resource locator values missing it', () => {
			const wf = workflow('test', 'Test').add(
				node({
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					version: 1.2,
					config: {
						name: 'OpenAI Model',
						parameters: {
							model: { mode: 'list', value: 'gpt-4o' }, // Missing __rl: true
						},
						position: [0, 0],
					},
				}),
			);

			const json = wf.toJSON();
			const modelNode = json.nodes.find((n) => n.name === 'OpenAI Model');

			expect(modelNode?.parameters?.model).toEqual({
				__rl: true,
				mode: 'list',
				value: 'gpt-4o',
			});
		});

		it('should preserve existing __rl: true', () => {
			const wf = workflow('test', 'Test').add(
				node({
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					version: 1.2,
					config: {
						name: 'OpenAI Model',
						parameters: {
							model: { __rl: true, mode: 'list', value: 'gpt-4o' },
						},
						position: [0, 0],
					},
				}),
			);

			const json = wf.toJSON();
			const modelNode = json.nodes.find((n) => n.name === 'OpenAI Model');

			expect(modelNode?.parameters?.model).toEqual({
				__rl: true,
				mode: 'list',
				value: 'gpt-4o',
			});
		});

		it('should normalize nested resource locator values', () => {
			const wf = workflow('test', 'Test').add(
				node({
					type: 'n8n-nodes-base.googleSheets',
					version: 4.5,
					config: {
						name: 'Google Sheets',
						parameters: {
							documentId: { mode: 'list', value: 'doc-123' },
							sheetName: { mode: 'list', value: 'Sheet1' },
						},
						position: [0, 0],
					},
				}),
			);

			const json = wf.toJSON();
			const sheetsNode = json.nodes.find((n) => n.name === 'Google Sheets');

			expect(sheetsNode?.parameters?.documentId).toEqual({
				__rl: true,
				mode: 'list',
				value: 'doc-123',
			});
			expect(sheetsNode?.parameters?.sheetName).toEqual({
				__rl: true,
				mode: 'list',
				value: 'Sheet1',
			});
		});

		it('should not add __rl to objects without mode property', () => {
			const wf = workflow('test', 'Test').add(
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: {
						name: 'Set',
						parameters: {
							options: { someKey: 'someValue' }, // Not a resource locator (no mode)
						},
						position: [0, 0],
					},
				}),
			);

			const json = wf.toJSON();
			const setNode = json.nodes.find((n) => n.name === 'Set');

			// Should NOT have __rl added since there's no mode property
			expect((setNode?.parameters?.options as Record<string, unknown>)?.__rl).toBeUndefined();
		});

		it('should normalize resource locators in nested objects', () => {
			const wf = workflow('test', 'Test').add(
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						name: 'HTTP Request',
						parameters: {
							options: {
								nestedResource: { mode: 'list', value: 'nested-value' },
							},
						},
						position: [0, 0],
					},
				}),
			);

			const json = wf.toJSON();
			const httpNode = json.nodes.find((n) => n.name === 'HTTP Request');
			const options = httpNode?.parameters?.options as Record<string, unknown> | undefined;

			expect(options?.nestedResource).toEqual({
				__rl: true,
				mode: 'list',
				value: 'nested-value',
			});
		});
	});

	describe('addNodeWithSubnodes duplicate detection', () => {
		it('should not create duplicate nodes when same instance appears in multiple chain targets', () => {
			// Create AI agent with subnode named "Format Response"
			const outputParserSubnode = outputParser({
				type: '@n8n/n8n-nodes-langchain.outputParserStructured',
				version: 1.3,
				config: { name: 'Format Response', parameters: {} },
			});

			const aiAgent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 3.1,
				config: {
					name: 'AI Agent',
					subnodes: { outputParser: outputParserSubnode },
				},
			});

			// Create Set node with SAME name as outputParser
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: { name: 'Format Response' },
			});

			const finalNode = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Send Request' },
			});

			// Build chain: trigger -> aiAgent -> setNode -> finalNode
			const triggerNode = trigger({
				type: 'n8n-nodes-base.manualTrigger',
				version: 1,
				config: { name: 'Start' },
			});

			const wf = workflow('test', 'Test Workflow').add(
				triggerNode.to(aiAgent.to(setNode.to(finalNode))),
			);

			const json = wf.toJSON();

			// Count Set nodes - should be exactly 1 (renamed to "Format Response 1")
			const setNodes = json.nodes.filter((n) => n.type === 'n8n-nodes-base.set');
			expect(setNodes).toHaveLength(1);
			expect(setNodes[0].name).toBe('Format Response 1');

			// Verify no duplicates like "Format Response 2", "Format Response 3", etc.
			const formatResponseNodes = json.nodes.filter(
				(n) => n.name?.startsWith('Format Response') && n.type === 'n8n-nodes-base.set',
			);
			expect(formatResponseNodes).toHaveLength(1);
		});
	});
});
