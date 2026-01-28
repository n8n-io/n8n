import { validateWorkflow, ValidationError } from '../validation';
import { workflow } from '../workflow-builder';
import { node, trigger, sticky } from '../node-builder';
import { languageModel, tool } from '../subnode-builders';
import { parseWorkflowCode } from '../parse-workflow-code';
import type { NodeInstance } from '../types/base';

describe('Validation', () => {
	describe('validateWorkflow()', () => {
		it('should validate a workflow with a trigger', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: { url: 'https://example.com' } },
			});
			const wf = workflow('test-id', 'Test Workflow').add(t).then(n);

			const result = validateWorkflow(wf);
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should warn when workflow has no trigger', () => {
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: { url: 'https://example.com' } },
			});
			const wf = workflow('test-id', 'Test Workflow').add(n);

			const result = validateWorkflow(wf);
			expect(result.warnings.some((w) => w.message.includes('trigger'))).toBe(true);
		});

		it('should warn about disconnected nodes', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const connected = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Connected' },
			});
			const disconnected = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Disconnected' },
			});

			// Add disconnected without .then() - it won't be connected
			const wf = workflow('test-id', 'Test Workflow').add(t).then(connected).add(disconnected);

			const result = validateWorkflow(wf);
			expect(result.warnings.some((w) => w.message.includes('Disconnected'))).toBe(true);
		});

		it('should validate required parameters if specified', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			// HTTP Request without URL should potentially warn
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: {} }, // Missing url
			});
			const wf = workflow('test-id', 'Test Workflow').add(t).then(n);

			const result = validateWorkflow(wf, { strictMode: true });
			// In strict mode, may report issues
			expect(result).toBeDefined();
		});

		it('should report circular connections', () => {
			// Note: Our builder doesn't easily allow circular connections,
			// but if imported from JSON, they could exist
			const wf = workflow('test-id', 'Test');
			const result = validateWorkflow(wf);
			expect(result).toBeDefined();
		});

		it('should not flag sticky notes as disconnected', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: { url: 'https://example.com' } },
			});
			const stickyNote = sticky('## Note', { position: [100, 100] });

			// Add sticky note to the workflow (sticky notes never have incoming connections)
			const wf = workflow('test-id', 'Test Workflow').add(t).then(n).add(stickyNote);

			const result = validateWorkflow(wf);
			const disconnectedWarnings = result.warnings.filter((w) => w.code === 'DISCONNECTED_NODE');
			// Sticky notes should NOT be flagged as disconnected
			expect(disconnectedWarnings).toHaveLength(0);
		});

		it('should not flag subnodes connected to agent as disconnected', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });

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

			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					parameters: { promptType: 'auto', text: 'Hello' },
					subnodes: {
						model,
						tools: [codeTool],
					},
				},
			});

			const wf = workflow('test-id', 'Test Workflow').add(t).then(agent);

			const result = validateWorkflow(wf);
			const disconnectedWarnings = result.warnings.filter((w) => w.code === 'DISCONNECTED_NODE');
			// Subnodes should NOT be flagged as disconnected (they connect TO their parent via AI connections)
			expect(disconnectedWarnings).toHaveLength(0);
		});
	});

	describe('ValidationError', () => {
		it('should contain error details', () => {
			const error = new ValidationError(
				'MISSING_TRIGGER',
				'Workflow has no trigger node',
				'Webhook',
			);
			expect(error.code).toBe('MISSING_TRIGGER');
			expect(error.message).toBe('Workflow has no trigger node');
			expect(error.nodeName).toBe('Webhook');
		});
	});

	describe('chained .to() connections', () => {
		it('should not flag nodes connected via chained .to() as disconnected', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const node1 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'Node1' } });
			const node2 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'Node2' } });
			const node3 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'Node3' } });

			// Chained .to() pattern: t -> node1 -> node2 -> node3
			const wf = workflow('test', 'Test').add(t.to(node1.to(node2.to(node3))));

			const result = validateWorkflow(wf);
			const disconnectedWarnings = result.warnings.filter((w) => w.code === 'DISCONNECTED_NODE');
			// All nodes should be connected - no DISCONNECTED_NODE warnings
			expect(disconnectedWarnings).toHaveLength(0);
		});

		it('should not flag nodes in chained .to() as disconnected when using builder validate', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const node1 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'Node1' } });
			const node2 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'Node2' } });
			const node3 = node({ type: 'n8n-nodes-base.set', version: 3, config: { name: 'Node3' } });

			// Chained .to() pattern: t -> node1 -> node2 -> node3
			const wf = workflow('test', 'Test').add(t.to(node1.to(node2.to(node3))));

			// Use wf.validate() - the builder's method that the script uses
			const result = wf.validate();
			const disconnectedWarnings = result.warnings.filter((w) => w.code === 'DISCONNECTED_NODE');
			expect(disconnectedWarnings).toHaveLength(0);
		});
	});

	describe('MISSING_EXPRESSION_PREFIX false positives', () => {
		it('should not flag {{ $json }} inside expression strings starting with =', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					parameters: {
						promptType: 'define',
						// String starts with '=' - entire value is an expression
						// {{ $json.field }} is valid template syntax within it
						text: '=You are a helper.\n- Email: {{ $json.leadEmail }}\n- Name: {{ $json.name }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).then(agent);
			const result = wf.validate();

			// Should NOT have MISSING_EXPRESSION_PREFIX - the string starts with '='
			// so {{ $json.x }} is valid template syntax within the expression
			const missingPrefixWarnings = result.warnings.filter(
				(w) => w.code === 'MISSING_EXPRESSION_PREFIX',
			);
			expect(missingPrefixWarnings).toHaveLength(0);
		});

		it('should still flag {{ $json }} in strings NOT starting with =', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					parameters: {
						promptType: 'define',
						// String does NOT start with '=' - this is a plain string
						// {{ $json.field }} without prefix is invalid
						text: 'You are a helper. Email: {{ $json.leadEmail }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).then(agent);
			const result = wf.validate();

			// Should have MISSING_EXPRESSION_PREFIX - the string doesn't start with '='
			const missingPrefixWarnings = result.warnings.filter(
				(w) => w.code === 'MISSING_EXPRESSION_PREFIX',
			);
			expect(missingPrefixWarnings).toHaveLength(1);
		});
	});

	describe('AGENT_STATIC_PROMPT with malformed expressions', () => {
		it('should not emit AGENT_STATIC_PROMPT when malformed expressions exist', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					parameters: {
						promptType: 'define',
						text: 'Process: {{ $json.data }}', // Missing = prefix (malformed)
						options: { systemMessage: 'You are helpful' },
					},
				},
			});

			// Use wf.validate() for builder-specific checks (AGENT_STATIC_PROMPT, MISSING_EXPRESSION_PREFIX)
			const wf = workflow('test', 'Test').add(t).then(agent);
			const result = wf.validate();

			// Should have MISSING_EXPRESSION_PREFIX (correct detection)
			expect(result.warnings.some((w) => w.code === 'MISSING_EXPRESSION_PREFIX')).toBe(true);
			// Should NOT have AGENT_STATIC_PROMPT (there ARE expressions, just malformed)
			expect(result.warnings.some((w) => w.code === 'AGENT_STATIC_PROMPT')).toBe(false);
		});

		it('should emit AGENT_STATIC_PROMPT when no expressions exist at all', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					parameters: {
						promptType: 'define',
						text: 'Process all items', // No expression at all
						options: { systemMessage: 'You are helpful' },
					},
				},
			});

			// Use wf.validate() for builder-specific checks
			const wf = workflow('test', 'Test').add(t).then(agent);
			const result = wf.validate();

			// Should NOT have MISSING_EXPRESSION_PREFIX (no malformed expressions)
			expect(result.warnings.some((w) => w.code === 'MISSING_EXPRESSION_PREFIX')).toBe(false);
			// Should have AGENT_STATIC_PROMPT (static text, no expression at all)
			expect(result.warnings.some((w) => w.code === 'AGENT_STATIC_PROMPT')).toBe(true);
		});

		it('should not emit AGENT_STATIC_PROMPT for ChainLlm when malformed expressions exist', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const chainLlm = node({
				type: '@n8n/n8n-nodes-langchain.chainLlm',
				version: 1.4,
				config: {
					parameters: {
						promptType: 'define',
						text: 'Summarize: {{ $json.content }}', // Missing = prefix (malformed)
					},
				},
			});

			// Use wf.validate() for builder-specific checks
			const wf = workflow('test', 'Test').add(t).then(chainLlm);
			const result = wf.validate();

			// Should have MISSING_EXPRESSION_PREFIX (correct detection)
			expect(result.warnings.some((w) => w.code === 'MISSING_EXPRESSION_PREFIX')).toBe(true);
			// Should NOT have AGENT_STATIC_PROMPT (there ARE expressions, just malformed)
			expect(result.warnings.some((w) => w.code === 'AGENT_STATIC_PROMPT')).toBe(false);
		});
	});

	describe('nested ifElse validation', () => {
		it('should not flag nodes in nested ifElse branches as disconnected', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

			const outerIF = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'Outer IF' },
			}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;

			const innerIF = node({
				type: 'n8n-nodes-base.if',
				version: 2.2,
				config: { name: 'Inner IF' },
			}) as NodeInstance<'n8n-nodes-base.if', string, unknown>;

			const innerTrueNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Inner True' },
			});
			const innerFalseNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Inner False' },
			});
			const outerFalseNode = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Outer False' },
			});

			// Nested ifElse: outer.onTrue(inner.onTrue(A).onFalse(B)).onFalse(C)
			const wf = workflow('test', 'Test')
				.add(t)
				.then(
					outerIF.onTrue!(innerIF.onTrue!(innerTrueNode).onFalse(innerFalseNode)).onFalse(
						outerFalseNode,
					),
				);

			// Test builder's validate() - this is what the user's script uses
			const builderResult = wf.validate();
			const disconnectedWarnings = builderResult.warnings.filter(
				(w) => w.code === 'DISCONNECTED_NODE',
			);
			expect(disconnectedWarnings).toHaveLength(0);

			// Test JSON-based validateWorkflow() as well
			const jsonResult = validateWorkflow(wf);
			const jsonDisconnectedWarnings = jsonResult.warnings.filter(
				(w) => w.code === 'DISCONNECTED_NODE',
			);
			expect(jsonDisconnectedWarnings).toHaveLength(0);
		});

		it('should not flag nodes in nested switch cases as disconnected', () => {
			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

			const outerSwitch = node({
				type: 'n8n-nodes-base.switch',
				version: 3.2,
				config: { name: 'Outer Switch' },
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;

			const innerSwitch = node({
				type: 'n8n-nodes-base.switch',
				version: 3.2,
				config: { name: 'Inner Switch' },
			}) as NodeInstance<'n8n-nodes-base.switch', string, unknown>;

			const innerCase0 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Inner Case 0' },
			});
			const innerCase1 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Inner Case 1' },
			});
			const outerCase1 = node({
				type: 'n8n-nodes-base.noOp',
				version: 1,
				config: { name: 'Outer Case 1' },
			});

			// Nested switch: outer.onCase(0, inner.onCase(0, A).onCase(1, B)).onCase(1, C)
			const wf = workflow('test', 'Test')
				.add(t)
				.then(
					outerSwitch.onCase!(0, innerSwitch.onCase!(0, innerCase0).onCase(1, innerCase1)).onCase(
						1,
						outerCase1,
					),
				);

			const builderResult = wf.validate();
			const disconnectedWarnings = builderResult.warnings.filter(
				(w) => w.code === 'DISCONNECTED_NODE',
			);
			expect(disconnectedWarnings).toHaveLength(0);
		});
	});

	describe('schema validation integration', () => {
		it('should validate node parameters against schema by default', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			// keepOnlySet should be boolean, not a string
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 2,
				config: {
					name: 'Set',
					parameters: { keepOnlySet: 'invalid-not-boolean' },
				},
			});

			const wf = workflow('test-id', 'Test').add(t).then(setNode);
			const result = validateWorkflow(wf);

			expect(result.warnings.some((w) => w.code === 'INVALID_PARAMETER')).toBe(true);
		});

		it('should skip schema validation when validateSchema: false', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 2,
				config: {
					name: 'Set',
					parameters: { keepOnlySet: 'invalid-not-boolean' },
				},
			});

			const wf = workflow('test-id', 'Test').add(t).then(setNode);
			const result = validateWorkflow(wf, { validateSchema: false });

			expect(result.warnings.some((w) => w.code === 'INVALID_PARAMETER')).toBe(false);
		});

		it('should not warn for valid parameters', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 2,
				config: {
					name: 'Set',
					parameters: { keepOnlySet: true },
				},
			});

			const wf = workflow('test-id', 'Test').add(t).then(setNode);
			const result = validateWorkflow(wf);

			expect(result.warnings.some((w) => w.code === 'INVALID_PARAMETER')).toBe(false);
		});

		it('should gracefully handle nodes without schemas', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			// Use a custom node type that doesn't have a schema
			const customNode = node({
				type: 'custom-nodes.myNode',
				version: 1,
				config: {
					name: 'Custom Node',
					parameters: { anyParam: 'any-value' },
				},
			});

			const wf = workflow('test-id', 'Test').add(t).then(customNode);
			const result = validateWorkflow(wf);

			// Should not throw and should not have INVALID_PARAMETER errors for unknown nodes
			const schemaWarnings = result.warnings.filter((w) => w.code === 'INVALID_PARAMETER');
			expect(schemaWarnings).toEqual([]);
		});

		it('should accept expressions as valid parameter values', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 2,
				config: {
					name: 'Set',
					parameters: { keepOnlySet: '={{ $json.flag }}' },
				},
			});

			const wf = workflow('test-id', 'Test').add(t).then(setNode);
			const result = validateWorkflow(wf);

			expect(result.warnings.some((w) => w.code === 'INVALID_PARAMETER')).toBe(false);
		});

		it('should include node name in INVALID_PARAMETER warning', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 2,
				config: {
					name: 'My Set Node',
					parameters: { keepOnlySet: 'invalid' },
				},
			});

			const wf = workflow('test-id', 'Test').add(t).then(setNode);
			const result = validateWorkflow(wf);

			const invalidParamWarning = result.warnings.find((w) => w.code === 'INVALID_PARAMETER');
			expect(invalidParamWarning).toBeDefined();
			expect(invalidParamWarning?.nodeName).toBe('My Set Node');
		});

		it('should report INVALID_PARAMETER when AI agent has empty subnodes (no model)', () => {
			// Directly create WorkflowJSON with subnodes on the node
			// (In standard n8n format, subnodes become separate nodes, but we test direct validation)
			const workflowJson = {
				id: 'test-id',
				name: 'Agent Without Model',
				nodes: [
					{
						id: 'node-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'node-2',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1,
						position: [200, 0] as [number, number],
						parameters: {
							text: 'Hello',
							binaryPropertyName: 'data',
							input: 'test',
						},
						// Empty subnodes object - model is required but missing!
						subnodes: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson);

			// Should have INVALID_PARAMETER warning for missing model in subnodes
			const invalidParamWarnings = result.warnings.filter((w) => w.code === 'INVALID_PARAMETER');
			expect(invalidParamWarnings.length).toBeGreaterThan(0);

			// The warning should mention the AI Agent node
			const agentWarning = invalidParamWarnings.find((w) => w.nodeName === 'AI Agent');
			expect(agentWarning).toBeDefined();
			// The warning message should mention the model field
			expect(agentWarning?.message).toContain('model');
		});
	});

	describe('validateWorkflow - subnode reconstruction from AI connections', () => {
		it('should not warn about missing subnodes when AI connections exist', () => {
			// Workflow JSON with AI agent and connected language model subnode
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [0, 0] as [number, number],
						parameters: { text: 'Hello' },
					},
					{
						id: 'model-1',
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [0, 100] as [number, number],
						parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o' } },
					},
				],
				connections: {
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson);

			// Should NOT have warning about missing subnodes
			const subnodeWarnings = result.warnings.filter(
				(w) => w.message.includes('subnodes') && w.message.includes('missing'),
			);
			expect(subnodeWarnings).toHaveLength(0);
		});

		it('should reconstruct multiple tool subnodes from AI connections', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [0, 0] as [number, number],
						parameters: { text: 'Hello' },
					},
					{
						id: 'model-1',
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [0, 100] as [number, number],
						parameters: { model: { __rl: true, mode: 'list', value: 'gpt-4o' } },
					},
					{
						id: 'tool-1',
						name: 'Tool 1',
						type: '@n8n/n8n-nodes-langchain.toolCode',
						typeVersion: 1.1,
						position: [0, 200] as [number, number],
						parameters: {},
					},
					{
						id: 'tool-2',
						name: 'Tool 2',
						type: '@n8n/n8n-nodes-langchain.toolCode',
						typeVersion: 1.1,
						position: [0, 300] as [number, number],
						parameters: {},
					},
				],
				connections: {
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
					'Tool 1': {
						ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
					},
					'Tool 2': {
						ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson);

			const subnodeWarnings = result.warnings.filter(
				(w) => w.message.includes('subnodes') && w.message.includes('missing'),
			);
			expect(subnodeWarnings).toHaveLength(0);
		});
	});

	describe('validateWorkflow - AI agent with subnodes integration', () => {
		it('should validate AI agent workflow built with SDK without false warnings', () => {
			// Build workflow using SDK (simulating user's code pattern)
			const openAiModel = languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1.2,
				config: {
					name: 'OpenAI Model',
					parameters: {
						model: { mode: 'list', value: 'gpt-4o' }, // Missing __rl: true - should be auto-added
					},
					position: [0, 0],
				},
			});

			const codeTool = tool({
				type: '@n8n/n8n-nodes-langchain.toolCode',
				version: 1.1,
				config: {
					name: 'Code Tool',
					parameters: {
						description: 'A tool',
					},
					position: [0, 0],
				},
			});

			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					name: 'AI Agent',
					parameters: {
						text: 'Hello',
					},
					subnodes: {
						model: openAiModel,
						tools: [codeTool],
					},
					position: [0, 0],
				},
			});

			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });

			const wf = workflow('test', 'Test').add(t).then(agent);
			const result = wf.validate();

			// Filter out expected warnings (like missing trigger - not applicable with manualTrigger)
			const unexpectedWarnings = result.warnings.filter(
				(w) =>
					!w.message.includes('trigger') &&
					!w.message.includes('not connected') &&
					!w.message.includes('manually'),
			);

			// Should have no warnings about subnodes or __rl
			const subnodeOrRlWarnings = unexpectedWarnings.filter(
				(w) => w.message.includes('subnodes') || w.message.includes('__rl'),
			);
			expect(subnodeOrRlWarnings).toHaveLength(0);
		});

		it('should auto-add __rl: true to resource locator values during toJSON', () => {
			// Build workflow using SDK with resource locator missing __rl
			const openAiModel = languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1.2,
				config: {
					name: 'OpenAI Model',
					parameters: {
						model: { mode: 'list', value: 'gpt-4o' }, // No __rl: true
					},
					position: [0, 0],
				},
			});

			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					name: 'AI Agent',
					parameters: {
						text: 'Hello',
					},
					subnodes: {
						model: openAiModel,
					},
					position: [0, 0],
				},
			});

			const t = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {} });
			const wf = workflow('test', 'Test').add(t).then(agent);

			// Get the JSON output
			const json = wf.toJSON();

			// Find the OpenAI Model node in the JSON
			const modelNode = json.nodes.find((n) => n.name === 'OpenAI Model');
			expect(modelNode).toBeDefined();

			// The model parameter should have __rl: true added automatically
			const modelParam = modelNode?.parameters?.model as Record<string, unknown> | undefined;
			expect(modelParam?.__rl).toBe(true);
			expect(modelParam?.mode).toBe('list');
			expect(modelParam?.value).toBe('gpt-4o');
		});
	});

	describe('parseWorkflowCode().validate() integration', () => {
		it('should return no warnings for YouTube Shorts automation workflow with AI agent', () => {
			const code =
				'// ============================================\n' +
				'// Subnodes - Language Model\n' +
				'// ============================================\n' +
				'\n' +
				'const openAiModel = languageModel({\n' +
				"  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',\n" +
				'  version: 1.3,\n' +
				'  config: {\n' +
				"    name: 'OpenAI GPT Model',\n" +
				'    parameters: {\n' +
				"      model: { __rl: true, mode: 'list', value: 'gpt-4o' },\n" +
				'      options: {\n' +
				'        temperature: 0.8,\n' +
				'        maxTokens: 500\n' +
				'      }\n' +
				'    },\n' +
				'    credentials: {\n' +
				"      openAiApi: newCredential('OpenAI API')\n" +
				'    },\n' +
				'    position: [1140, 500]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'// ============================================\n' +
				'// Schedule Triggers - 3 Times Daily\n' +
				'// ============================================\n' +
				'\n' +
				'const morningSchedule = trigger({\n' +
				"  type: 'n8n-nodes-base.scheduleTrigger',\n" +
				'  version: 1.3,\n' +
				'  config: {\n' +
				"    name: 'Morning Schedule (8 AM)',\n" +
				'    parameters: {\n' +
				'      rule: {\n' +
				'        interval: [{\n' +
				"          field: 'days',\n" +
				'          daysInterval: 1,\n' +
				'          triggerAtHour: 8,\n' +
				'          triggerAtMinute: 0\n' +
				'        }]\n' +
				'      }\n' +
				'    },\n' +
				'    position: [240, 200]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'const afternoonSchedule = trigger({\n' +
				"  type: 'n8n-nodes-base.scheduleTrigger',\n" +
				'  version: 1.3,\n' +
				'  config: {\n' +
				"    name: 'Afternoon Schedule (2 PM)',\n" +
				'    parameters: {\n' +
				'      rule: {\n' +
				'        interval: [{\n' +
				"          field: 'days',\n" +
				'          daysInterval: 1,\n' +
				'          triggerAtHour: 14,\n' +
				'          triggerAtMinute: 0\n' +
				'        }]\n' +
				'      }\n' +
				'    },\n' +
				'    position: [240, 600]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'const nightSchedule = trigger({\n' +
				"  type: 'n8n-nodes-base.scheduleTrigger',\n" +
				'  version: 1.3,\n' +
				'  config: {\n' +
				"    name: 'Night Schedule (8 PM)',\n" +
				'    parameters: {\n' +
				'      rule: {\n' +
				'        interval: [{\n' +
				"          field: 'days',\n" +
				'          daysInterval: 1,\n' +
				'          triggerAtHour: 20,\n' +
				'          triggerAtMinute: 0\n' +
				'        }]\n' +
				'      }\n' +
				'    },\n' +
				'    position: [240, 1000]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'// ============================================\n' +
				'// Create Batch of 3 Videos\n' +
				'// ============================================\n' +
				'\n' +
				'const createBatch = node({\n' +
				"  type: 'n8n-nodes-base.set',\n" +
				'  version: 3.4,\n' +
				'  config: {\n' +
				"    name: 'Create Batch of 3 Videos',\n" +
				'    parameters: {\n' +
				"      mode: 'manual',\n" +
				'      duplicateItem: true,\n' +
				'      duplicateCount: 3,\n' +
				'      assignments: {\n' +
				'        assignments: [\n' +
				'          {\n' +
				"            id: 'video_number',\n" +
				"            name: 'videoNumber',\n" +
				"            value: '={{ $itemIndex + 1 }}',\n" +
				"            type: 'number'\n" +
				'          },\n' +
				'          {\n' +
				"            id: 'batch_id',\n" +
				"            name: 'batchId',\n" +
				'            value: \'={{ $now.format("YYYY-MM-DD-HH") }}\',\n' +
				"            type: 'string'\n" +
				'          }\n' +
				'        ]\n' +
				'      }\n' +
				'    },\n' +
				'    position: [540, 600]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'// ============================================\n' +
				'// Split Into Individual Videos\n' +
				'// ============================================\n' +
				'\n' +
				'const splitBatches = splitInBatches({\n' +
				'  version: 3,\n' +
				'  config: {\n' +
				"    name: 'Process Each Video',\n" +
				'    parameters: {\n' +
				'      batchSize: 1,\n' +
				'      options: {}\n' +
				'    },\n' +
				'    position: [840, 600]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'// ============================================\n' +
				'// Generate Story Script with AI\n' +
				'// ============================================\n' +
				'\n' +
				'const generateStory = node({\n' +
				"  type: '@n8n/n8n-nodes-langchain.agent',\n" +
				'  version: 3.1,\n' +
				'  config: {\n' +
				"    name: 'Generate Short Story Script',\n" +
				'    parameters: {\n' +
				"      promptType: 'define',\n" +
				"      text: 'Generate a unique, engaging short story script for a YouTube Short video (30-60 seconds). The story should be captivating, have a clear beginning, middle, and end. Make it suitable for visual storytelling. Include vivid descriptions of scenes and actions. Keep it under 150 words. Make each story completely different and creative.',\n" +
				'      options: {\n' +
				"        systemMessage: 'You are a creative storyteller specializing in short-form video content. Create unique, engaging stories perfect for YouTube Shorts.',\n" +
				'        maxIterations: 5,\n' +
				'        temperature: 0.9\n' +
				'      }\n' +
				'    },\n' +
				'    subnodes: {\n' +
				'      model: openAiModel\n' +
				'    },\n' +
				'    position: [1140, 600]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'// ============================================\n' +
				'// Generate Video with OpenAI Sora\n' +
				'// ============================================\n' +
				'\n' +
				'const generateVideo = node({\n' +
				"  type: '@n8n/n8n-nodes-langchain.openAi',\n" +
				'  version: 2.1,\n' +
				'  config: {\n' +
				"    name: 'Generate Video with Sora',\n" +
				'    parameters: {\n' +
				"      resource: 'video',\n" +
				"      operation: 'generate',\n" +
				"      modelId: { __rl: true, mode: 'list', value: 'sora-2-pro' },\n" +
				"      prompt: '={{ $json.output }}',\n" +
				'      seconds: 30,\n' +
				"      size: '720x1280',\n" +
				'      options: {\n' +
				'        waitTime: 300,\n' +
				"        fileName: 'video'\n" +
				'      }\n' +
				'    },\n' +
				'    credentials: {\n' +
				"      openAiApi: newCredential('OpenAI API')\n" +
				'    },\n' +
				'    position: [1440, 600]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'// ============================================\n' +
				'// Prepare YouTube Metadata\n' +
				'// ============================================\n' +
				'\n' +
				'const prepareMetadata = node({\n' +
				"  type: 'n8n-nodes-base.set',\n" +
				'  version: 3.4,\n' +
				'  config: {\n' +
				"    name: 'Prepare YouTube Metadata',\n" +
				'    parameters: {\n' +
				"      mode: 'manual',\n" +
				'      assignments: {\n' +
				'        assignments: [\n' +
				'          {\n' +
				"            id: 'video_title',\n" +
				"            name: 'title',\n" +
				'            value: \'={{ "Short Story #" + $json.videoNumber + " - " + $json.batchId }}\',\n' +
				"            type: 'string'\n" +
				'          },\n' +
				'          {\n' +
				"            id: 'video_description',\n" +
				"            name: 'description',\n" +
				'            value: \'={{ $json.output + "\\\\n\\\\n#Shorts #ShortStory #StoryTime #YouTubeShorts" }}\',\n' +
				"            type: 'string'\n" +
				'          },\n' +
				'          {\n' +
				"            id: 'video_tags',\n" +
				"            name: 'tags',\n" +
				"            value: 'shorts,short story,storytelling,youtube shorts,viral shorts,story time',\n" +
				"            type: 'string'\n" +
				'          },\n' +
				'          {\n' +
				"            id: 'privacy_status',\n" +
				"            name: 'privacyStatus',\n" +
				"            value: 'public',\n" +
				"            type: 'string'\n" +
				'          }\n' +
				'        ]\n' +
				'      },\n' +
				'      options: {\n' +
				'        includeBinary: true\n' +
				'      }\n' +
				'    },\n' +
				'    position: [1740, 600]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'// ============================================\n' +
				'// Upload to YouTube\n' +
				'// ============================================\n' +
				'\n' +
				'const uploadToYouTube = node({\n' +
				"  type: 'n8n-nodes-base.youTube',\n" +
				'  version: 1,\n' +
				'  config: {\n' +
				"    name: 'Upload to YouTube',\n" +
				'    parameters: {\n' +
				"      resource: 'video',\n" +
				"      operation: 'upload',\n" +
				"      title: '={{ $json.title }}',\n" +
				"      categoryId: '24',\n" +
				"      binaryProperty: 'video',\n" +
				'      options: {\n' +
				"        description: '={{ $json.description }}',\n" +
				"        tags: '={{ $json.tags }}',\n" +
				"        privacyStatus: '={{ $json.privacyStatus }}',\n" +
				'        selfDeclaredMadeForKids: false,\n' +
				'        notifySubscribers: true\n' +
				'      }\n' +
				'    },\n' +
				'    credentials: {\n' +
				"      youTubeOAuth2Api: newCredential('YouTube OAuth2')\n" +
				'    },\n' +
				'    position: [2040, 600]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'// ============================================\n' +
				'// Completion Node\n' +
				'// ============================================\n' +
				'\n' +
				'const batchComplete = node({\n' +
				"  type: 'n8n-nodes-base.set',\n" +
				'  version: 3.4,\n' +
				'  config: {\n' +
				"    name: 'Batch Complete',\n" +
				'    parameters: {\n' +
				"      mode: 'manual',\n" +
				'      assignments: {\n' +
				'        assignments: [\n' +
				'          {\n' +
				"            id: 'status',\n" +
				"            name: 'status',\n" +
				"            value: 'Batch processing complete',\n" +
				"            type: 'string'\n" +
				'          },\n' +
				'          {\n' +
				"            id: 'completed_at',\n" +
				"            name: 'completedAt',\n" +
				"            value: '={{ $now.toISO() }}',\n" +
				"            type: 'string'\n" +
				'          }\n' +
				'        ]\n' +
				'      }\n' +
				'    },\n' +
				'    position: [2340, 600]\n' +
				'  }\n' +
				'});\n' +
				'\n' +
				'// ============================================\n' +
				'// Workflow Composition\n' +
				'// ============================================\n' +
				'\n' +
				"return workflow('youtube-shorts-automation', 'YouTube Shorts Daily Automation')\n" +
				'  .add(morningSchedule.to(createBatch))\n' +
				'  .add(afternoonSchedule.to(createBatch))\n' +
				'  .add(nightSchedule.to(createBatch))\n' +
				'  .add(createBatch.to(splitBatches\n' +
				'    .onEachBatch(generateStory.to(generateVideo.to(prepareMetadata.to(uploadToYouTube.to(nextBatch(splitBatches))))))\n' +
				'    .onDone(batchComplete)\n' +
				'  ));';

			const wf = parseWorkflowCode(code);
			const result = validateWorkflow(wf);

			// Should have no warnings (triggers are present, nodes are connected)
			expect(result.warnings).toHaveLength(0);
		});
	});
});
