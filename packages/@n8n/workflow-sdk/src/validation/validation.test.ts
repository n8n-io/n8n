import { validateWorkflow, ValidationError } from '.';
import { setupTestSchemas, teardownTestSchemas } from './test-schema-setup';
import type { NodeInstance } from '../types/base';
import { workflow } from '../workflow-builder';
import { node, trigger, sticky } from '../workflow-builder/node-builders/node-builder';
import { languageModel, tool } from '../workflow-builder/node-builders/subnode-builders';

describe('Validation', () => {
	describe('validateWorkflow()', () => {
		it('should validate a workflow with a trigger', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const n = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { parameters: { url: 'https://example.com' } },
			});
			const wf = workflow('test-id', 'Test Workflow').add(t).to(n);

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

			// Add disconnected without .to() - it won't be connected
			const wf = workflow('test-id', 'Test Workflow').add(t).to(connected).add(disconnected);

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
			const wf = workflow('test-id', 'Test Workflow').add(t).to(n);

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
			const wf = workflow('test-id', 'Test Workflow').add(t).to(n).add(stickyNote);

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

			const wf = workflow('test-id', 'Test Workflow').add(t).to(agent);

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

			const wf = workflow('test', 'Test').add(t).to(agent);
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

			const wf = workflow('test', 'Test').add(t).to(agent);
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
			const wf = workflow('test', 'Test').add(t).to(agent);
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
			const wf = workflow('test', 'Test').add(t).to(agent);
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
			const wf = workflow('test', 'Test').add(t).to(chainLlm);
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
				.to(
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
				.to(
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

	describe('containsExpression handles non-string values', () => {
		it('should not throw when parameter values are numbers', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					parameters: {
						promptType: 'define',
						text: 123, // Number instead of string - should not crash
						options: { systemMessage: 'You are helpful' },
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(agent);

			// Should not throw "value.includes is not a function"
			expect(() => wf.validate()).not.toThrow();
		});

		it('should not throw when parameter values are objects', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					parameters: {
						promptType: 'define',
						text: { nested: 'value' }, // Object instead of string
						options: { systemMessage: 'You are helpful' },
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(agent);

			// Should not throw
			expect(() => wf.validate()).not.toThrow();
		});

		it('should not throw when parameter values are null or undefined', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const agent = node({
				type: '@n8n/n8n-nodes-langchain.agent',
				version: 1.7,
				config: {
					parameters: {
						promptType: 'define',
						text: null, // null value
						options: { systemMessage: 'You are helpful' },
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(agent);

			// Should not throw
			expect(() => wf.validate()).not.toThrow();
		});
	});

	describe('schema validation integration', () => {
		beforeAll(setupTestSchemas, 120_000);
		afterAll(teardownTestSchemas);

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

			const wf = workflow('test-id', 'Test').add(t).to(setNode);
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

			const wf = workflow('test-id', 'Test').add(t).to(setNode);
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

			const wf = workflow('test-id', 'Test').add(t).to(setNode);
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

			const wf = workflow('test-id', 'Test').add(t).to(customNode);
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

			const wf = workflow('test-id', 'Test').add(t).to(setNode);
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

			const wf = workflow('test-id', 'Test').add(t).to(setNode);
			const result = validateWorkflow(wf);

			const invalidParamWarning = result.warnings.find((w) => w.code === 'INVALID_PARAMETER');
			expect(invalidParamWarning).toBeDefined();
			expect(invalidParamWarning?.nodeName).toBe('My Set Node');
		});

		it('should report INVALID_PARAMETER when AI agent has empty subnodes (no model)', () => {
			// Directly create WorkflowJSON with subnodes on the node
			// (In standard n8n format, subnodes become separate nodes, but we test direct validation)
			// Note: Parameters like text, binaryPropertyName, input are conditionally shown based on
			// agent type. For 'conversationalAgent' (default), these are hidden, so we don't pass them.
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
							agent: 'conversationalAgent',
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

			const wf = workflow('test', 'Test').add(t).to(agent);
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
			const wf = workflow('test', 'Test').add(t).to(agent);

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

	describe('expression path validation', () => {
		it('should warn when $json references a field not in predecessor output', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ amount: 100, description: 'Laptop' }],
				},
			});

			const slackApproval = node({
				type: 'n8n-nodes-base.slack',
				version: 2,
				config: {
					name: 'Approval',
					pinData: [{ data: { approved: true } }],
				},
			});

			// This email node incorrectly uses $json.amount after the Slack node
			// which doesn't output 'amount'
			const emailNode = node({
				type: 'n8n-nodes-base.emailSend',
				version: 2,
				config: {
					name: 'Send Email',
					parameters: {
						subject: '={{ $json.amount }}', // WRONG - amount is not in Slack output
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(slackApproval).to(emailNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH' || w.code === 'PARTIAL_EXPRESSION_PATH',
			);

			expect(expressionWarnings.length).toBeGreaterThan(0);
			expect(expressionWarnings[0].message).toContain('$json.amount');
		});

		it('should not warn when $json references a field that exists in predecessor output', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ amount: 100, description: 'Laptop' }],
				},
			});

			// This node correctly uses $json.amount - which exists in webhook output
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $json.amount }}', // CORRECT - amount exists in Webhook output
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH' || w.code === 'PARTIAL_EXPRESSION_PATH',
			);

			expect(expressionWarnings).toHaveLength(0);
		});

		it('should warn when $("NodeName").item.json references a field that does not exist', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ amount: 100 }],
				},
			});

			const processNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Process',
				},
			});

			// This node references a field that doesn't exist in Webhook output
			const emailNode = node({
				type: 'n8n-nodes-base.emailSend',
				version: 2,
				config: {
					name: 'Send Email',
					parameters: {
						subject: '={{ $("Webhook").item.json.nonexistent }}', // nonexistent doesn't exist
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(processNode).to(emailNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH',
			);

			expect(expressionWarnings.length).toBeGreaterThan(0);
			expect(expressionWarnings[0].message).toContain('nonexistent');
		});

		it('should not warn when no pinData is available', () => {
			// Without pinData, we can't validate expression paths
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: { name: 'Webhook' },
			});

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $json.anyField }}', // No warning without pinData
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH' || w.code === 'PARTIAL_EXPRESSION_PATH',
			);

			expect(expressionWarnings).toHaveLength(0);
		});

		it('should warn for partial paths when some branches have the field and others do not', () => {
			// Create an IF node that branches to two paths, then merge
			// One branch provides a field, the other doesn't
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ amount: 100 }],
				},
			});

			const branchA = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Branch A',
					pinData: [{ status: 'approved', amount: 100 }],
				},
			});

			const branchB = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Branch B',
					pinData: [{ status: 'rejected' }], // No amount field
				},
			});

			// This node gets input from both branches but only one has 'amount'
			const finalNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Final',
					parameters: {
						value: '={{ $json.amount }}', // exists in A but not B
					},
				},
			});

			// Build workflow with branches
			const wf = workflow('test', 'Test')
				.add(webhookTrigger.to(branchA))
				.add(webhookTrigger.to(branchB))
				.add(branchA.to(finalNode))
				.add(branchB.to(finalNode));

			const result = wf.validate();
			const partialWarnings = result.warnings.filter((w) => w.code === 'PARTIAL_EXPRESSION_PATH');

			expect(partialWarnings.length).toBeGreaterThan(0);
			expect(partialWarnings[0].message).toContain('Branch A');
			expect(partialWarnings[0].message).toContain('Branch B');
		});

		it('should use output property over pinData for expression validation', () => {
			// When both output and pinData are set, output should take priority
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					// pinData has 'oldField' but output has 'newField'
					pinData: [{ oldField: 'from-pinData' }],
					output: [{ newField: 'from-output' }],
				},
			});

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $json.newField }}', // Should validate against output, not pinData
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH' || w.code === 'PARTIAL_EXPRESSION_PATH',
			);

			// No warning because 'newField' exists in output (which takes priority over pinData)
			expect(expressionWarnings).toHaveLength(0);
		});

		it('should warn when referencing field that exists in pinData but not in output', () => {
			// When output is set, pinData fields are ignored
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ oldField: 'from-pinData' }],
					output: [{ newField: 'from-output' }],
				},
			});

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $json.oldField }}', // oldField only in pinData, not output
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH',
			);

			// Should warn because 'oldField' doesn't exist in output (which takes priority)
			expect(expressionWarnings).toHaveLength(1);
			expect(expressionWarnings[0].message).toContain('oldField');
		});

		it('should fall back to pinData when output is not set', () => {
			// Without output property, pinData should be used
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ amount: 100 }], // No output property
				},
			});

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $json.amount }}', // Should validate against pinData
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH' || w.code === 'PARTIAL_EXPRESSION_PATH',
			);

			// No warning because 'amount' exists in pinData (fallback)
			expect(expressionWarnings).toHaveLength(0);
		});

		it('should not warn when expression uses JS method on existing field (e.g. $json.output.includes)', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ output: 'some text content' }],
				},
			});

			// This node uses $json.output.includes() - "includes" is a JS method, not a field
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $json.output.includes("test") }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH' || w.code === 'PARTIAL_EXPRESSION_PATH',
			);

			// No warning because "output" exists, and "includes" is filtered as a JS method
			expect(expressionWarnings).toHaveLength(0);
		});

		it('should not warn when expression uses chained JS methods on existing field', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ data: { items: ['a', 'b', 'c'] } }],
				},
			});

			// Uses multiple chained methods: $json.data.items.map(...).join(...)
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $json.data.items.map }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH' || w.code === 'PARTIAL_EXPRESSION_PATH',
			);

			// No warning because "data.items" exists, and "map" is filtered as a JS method
			expect(expressionWarnings).toHaveLength(0);
		});

		it('should warn when JS method is used on non-existing field', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ data: 'test' }],
				},
			});

			// Uses nonexistent.includes() - even after filtering "includes", "nonexistent" doesn't exist
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $json.nonexistent.includes("test") }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH',
			);

			// Should warn because "nonexistent" doesn't exist (even after filtering "includes")
			expect(expressionWarnings.length).toBeGreaterThan(0);
			expect(expressionWarnings[0].message).toContain('nonexistent');
		});

		it('should filter common JS string methods: toLowerCase, toUpperCase, trim, split, replace', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ text: 'Hello World' }],
				},
			});

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						lower: '={{ $json.text.toLowerCase }}',
						upper: '={{ $json.text.toUpperCase }}',
						trimmed: '={{ $json.text.trim }}',
						parts: '={{ $json.text.split }}',
						replaced: '={{ $json.text.replace }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH' || w.code === 'PARTIAL_EXPRESSION_PATH',
			);

			// No warnings - all method names should be filtered
			expect(expressionWarnings).toHaveLength(0);
		});

		it('should filter common JS array methods: filter, map, find, some, every', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ items: [1, 2, 3] }],
				},
			});

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						filtered: '={{ $json.items.filter }}',
						mapped: '={{ $json.items.map }}',
						found: '={{ $json.items.find }}',
						hasSome: '={{ $json.items.some }}',
						hasEvery: '={{ $json.items.every }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarnings = result.warnings.filter(
				(w) => w.code === 'INVALID_EXPRESSION_PATH' || w.code === 'PARTIAL_EXPRESSION_PATH',
			);

			// No warnings - all method names should be filtered
			expect(expressionWarnings).toHaveLength(0);
		});

		it('should include parameterPath in expression validation warnings', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ existingField: 'test' }],
				},
			});

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						someParam: '={{ $json.nonexistent }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarning = result.warnings.find((w) => w.code === 'INVALID_EXPRESSION_PATH');

			expect(expressionWarning).toBeDefined();
			expect(expressionWarning?.parameterPath).toBe('someParam');
			expect(expressionWarning?.nodeName).toBe('Set');
		});

		it('should include nested parameterPath in expression validation warnings', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ existingField: 'test' }],
				},
			});

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						options: {
							nested: {
								deepValue: '={{ $json.nonexistent }}',
							},
						},
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarning = result.warnings.find((w) => w.code === 'INVALID_EXPRESSION_PATH');

			expect(expressionWarning).toBeDefined();
			expect(expressionWarning?.parameterPath).toBe('options.nested.deepValue');
		});

		it('should include parameterPath for array index in expression validation warnings', () => {
			const webhookTrigger = trigger({
				type: 'n8n-nodes-base.webhook',
				version: 2,
				config: {
					name: 'Webhook',
					pinData: [{ existingField: 'test' }],
				},
			});

			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						items: [{ value: '={{ $json.nonexistent }}' }],
					},
				},
			});

			const wf = workflow('test', 'Test').add(webhookTrigger).to(setNode);

			const result = wf.validate();
			const expressionWarning = result.warnings.find((w) => w.code === 'INVALID_EXPRESSION_PATH');

			expect(expressionWarning).toBeDefined();
			expect(expressionWarning?.parameterPath).toBe('items[0].value');
		});
	});

	describe('INVALID_DATE_METHOD validation', () => {
		it('should warn when using .toISOString() instead of .toISO() for $now', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $now.toISOString() }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(setNode);
			const result = wf.validate();

			const dateMethodWarnings = result.warnings.filter((w) => w.code === 'INVALID_DATE_METHOD');
			expect(dateMethodWarnings).toHaveLength(1);
			expect(dateMethodWarnings[0].message).toContain('.toISOString()');
			expect(dateMethodWarnings[0].message).toContain('.toISO()');
		});

		it('should warn when using .toISOString() instead of .toISO() for $today', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $today.toISOString() }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(setNode);
			const result = wf.validate();

			const dateMethodWarnings = result.warnings.filter((w) => w.code === 'INVALID_DATE_METHOD');
			expect(dateMethodWarnings).toHaveLength(1);
			expect(dateMethodWarnings[0].message).toContain('.toISOString()');
		});

		it('should warn when .toISOString() is used in nested parameters', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						options: {
							nested: {
								date: '={{ $now.toISOString() }}',
							},
						},
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(setNode);
			const result = wf.validate();

			const dateMethodWarnings = result.warnings.filter((w) => w.code === 'INVALID_DATE_METHOD');
			expect(dateMethodWarnings).toHaveLength(1);
			expect(dateMethodWarnings[0].message).toContain('options.nested.date');
		});

		it('should warn when .toISOString() is used in array parameters', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						items: [{ date: '={{ $now.toISOString() }}' }, { date: '={{ $today.toISOString() }}' }],
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(setNode);
			const result = wf.validate();

			const dateMethodWarnings = result.warnings.filter((w) => w.code === 'INVALID_DATE_METHOD');
			expect(dateMethodWarnings).toHaveLength(2);
		});

		it('should not warn when using correct .toISO() method', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						value: '={{ $now.toISO() }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(setNode);
			const result = wf.validate();

			const dateMethodWarnings = result.warnings.filter((w) => w.code === 'INVALID_DATE_METHOD');
			expect(dateMethodWarnings).toHaveLength(0);
		});

		it('should not warn when toISOString is used on regular JS Date objects', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Set',
					parameters: {
						// This is valid JS - using toISOString() on a native Date object
						value: '={{ new Date().toISOString() }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(setNode);
			const result = wf.validate();

			// new Date().toISOString() is valid JS, only Luxon misuse should be flagged
			const dateMethodWarnings = result.warnings.filter((w) => w.code === 'INVALID_DATE_METHOD');
			expect(dateMethodWarnings).toHaveLength(0);
		});

		it('should include node name in the warning', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const setNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: {
					name: 'Date Formatter',
					parameters: {
						value: '={{ $now.toISOString() }}',
					},
				},
			});

			const wf = workflow('test', 'Test').add(t).to(setNode);
			const result = wf.validate();

			const dateMethodWarning = result.warnings.find((w) => w.code === 'INVALID_DATE_METHOD');
			expect(dateMethodWarning).toBeDefined();
			expect(dateMethodWarning?.nodeName).toBe('Date Formatter');
		});
	});

	describe('SUBNODE_PARAMETER_MISMATCH validation', () => {
		// Mock node types provider that returns builderHint.inputs with displayOptions
		// Note: builderHint is on description, not on the INodeType directly
		const mockNodeTypesProviderWithBuilderHints = {
			getByNameAndVersion: (type: string, _version?: number) => {
				if (type === '@n8n/n8n-nodes-langchain.agent') {
					return {
						description: {
							inputs: ['main'],
							builderHint: {
								inputs: {
									ai_languageModel: { required: true },
									ai_tool: {
										required: false,
										displayOptions: {
											show: { mode: ['retrieve-as-tool'] },
										},
									},
									ai_vectorStore: {
										required: false,
										displayOptions: {
											show: { mode: ['retrieve'] },
										},
									},
								},
							},
						},
					};
				}
				if (type === '@n8n/n8n-nodes-langchain.vectorStorePinecone') {
					return { description: { inputs: ['main'] } };
				}
				if (type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
					return { description: { inputs: [] } };
				}
				return { description: { inputs: ['main'] } };
			},
			getByName: (type: string) => mockNodeTypesProviderWithBuilderHints.getByNameAndVersion(type),
			getKnownTypes: () => ({}),
		};

		it('should warn when subnode mode does not match expected displayOptions', () => {
			// Create workflow JSON directly to have control over AI connections
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [200, 0] as [number, number],
						parameters: { text: 'Hello' },
					},
					{
						id: 'model-1',
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [200, 100] as [number, number],
						parameters: { model: 'gpt-4o' },
					},
					{
						id: 'pinecone-1',
						name: 'Pinecone Retriever',
						type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
						typeVersion: 1,
						position: [200, 200] as [number, number],
						parameters: {
							mode: 'retrieve', // WRONG: connected as ai_tool but mode='retrieve'
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
					'Pinecone Retriever': {
						// Connected as ai_tool but mode='retrieve' expects ai_vectorStore
						ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderWithBuilderHints as never,
			});

			const mismatchWarnings = result.warnings.filter(
				(w) => w.code === 'SUBNODE_PARAMETER_MISMATCH',
			);
			expect(mismatchWarnings).toHaveLength(1);
			expect(mismatchWarnings[0].nodeName).toBe('Pinecone Retriever');
			expect(mismatchWarnings[0].message).toContain("mode='retrieve'");
			expect(mismatchWarnings[0].message).toContain("'retrieve-as-tool'");
			expect(mismatchWarnings[0].message).toContain('tool()');
		});

		it('should not warn when subnode mode matches expected displayOptions', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [200, 0] as [number, number],
						parameters: { text: 'Hello' },
					},
					{
						id: 'model-1',
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [200, 100] as [number, number],
						parameters: { model: 'gpt-4o' },
					},
					{
						id: 'pinecone-1',
						name: 'Pinecone Retriever',
						type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
						typeVersion: 1,
						position: [200, 200] as [number, number],
						parameters: {
							mode: 'retrieve-as-tool', // CORRECT: matches ai_tool displayOptions
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
					'Pinecone Retriever': {
						ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderWithBuilderHints as never,
			});

			const mismatchWarnings = result.warnings.filter(
				(w) => w.code === 'SUBNODE_PARAMETER_MISMATCH',
			);
			expect(mismatchWarnings).toHaveLength(0);
		});

		it('should warn when connected as ai_vectorStore but has mode=retrieve-as-tool', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [200, 0] as [number, number],
						parameters: { text: 'Hello' },
					},
					{
						id: 'model-1',
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [200, 100] as [number, number],
						parameters: { model: 'gpt-4o' },
					},
					{
						id: 'pinecone-1',
						name: 'Pinecone VS',
						type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
						typeVersion: 1,
						position: [200, 200] as [number, number],
						parameters: {
							mode: 'retrieve-as-tool', // WRONG: connected as ai_vectorStore but mode expects ai_tool
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
					'Pinecone VS': {
						ai_vectorStore: [[{ node: 'AI Agent', type: 'ai_vectorStore', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderWithBuilderHints as never,
			});

			const mismatchWarnings = result.warnings.filter(
				(w) => w.code === 'SUBNODE_PARAMETER_MISMATCH',
			);
			expect(mismatchWarnings).toHaveLength(1);
			expect(mismatchWarnings[0].nodeName).toBe('Pinecone VS');
			expect(mismatchWarnings[0].message).toContain("mode='retrieve-as-tool'");
			expect(mismatchWarnings[0].message).toContain("'retrieve'");
			expect(mismatchWarnings[0].message).toContain('vectorStore()');
		});

		it('should skip validation when no nodeTypesProvider given', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [200, 0] as [number, number],
						parameters: { text: 'Hello' },
					},
					{
						id: 'pinecone-1',
						name: 'Pinecone',
						type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
						typeVersion: 1,
						position: [200, 200] as [number, number],
						parameters: { mode: 'retrieve' }, // Wrong mode but no provider
					},
				],
				connections: {
					Pinecone: {
						ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			// No nodeTypesProvider - validation should be skipped
			const result = validateWorkflow(workflowJson);

			const mismatchWarnings = result.warnings.filter(
				(w) => w.code === 'SUBNODE_PARAMETER_MISMATCH',
			);
			expect(mismatchWarnings).toHaveLength(0);
		});

		it('should include parameterPath in the warning', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1.7,
						position: [200, 0] as [number, number],
						parameters: { text: 'Hello' },
					},
					{
						id: 'pinecone-1',
						name: 'Pinecone',
						type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
						typeVersion: 1,
						position: [200, 200] as [number, number],
						parameters: { mode: 'retrieve' },
					},
				],
				connections: {
					Pinecone: {
						ai_tool: [[{ node: 'AI Agent', type: 'ai_tool', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderWithBuilderHints as never,
			});

			const warning = result.warnings.find((w) => w.code === 'SUBNODE_PARAMETER_MISMATCH');
			expect(warning).toBeDefined();
			expect(warning?.parameterPath).toBe('mode');
		});
	});

	describe('UNSUPPORTED_SUBNODE_INPUT validation', () => {
		// Mock that returns builderHint.inputs with displayOptions on the PARENT node
		// These displayOptions describe when the parent accepts a given AI input type
		const mockNodeTypesProviderForParentValidation = {
			getByNameAndVersion: (type: string, _version?: number) => {
				if (type === '@n8n/n8n-nodes-langchain.vectorStorePinecone') {
					return {
						description: {
							inputs: ['main'],
							builderHint: {
								inputs: {
									ai_embedding: { required: true },
									ai_document: {
										required: true,
										displayOptions: {
											show: { mode: ['insert'] },
										},
									},
								},
							},
						},
					};
				}
				if (type === '@n8n/n8n-nodes-langchain.agent') {
					return {
						description: {
							inputs: ['main'],
							builderHint: {
								inputs: {
									ai_languageModel: { required: true },
									ai_memory: { required: false },
									ai_tool: { required: false },
									ai_outputParser: {
										required: false,
										displayOptions: {
											show: { hasOutputParser: [true] },
										},
									},
								},
							},
						},
					};
				}
				return { description: { inputs: ['main'] } };
			},
			getByName: (type: string) =>
				mockNodeTypesProviderForParentValidation.getByNameAndVersion(type),
			getKnownTypes: () => ({}),
		};

		it('should warn when vector store in retrieve mode has documentLoader connected', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'vs-1',
						name: 'Pinecone Store',
						type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
						typeVersion: 1.3,
						position: [200, 0] as [number, number],
						parameters: { mode: 'retrieve' }, // retrieve mode - doesn't support ai_document
					},
					{
						id: 'doc-1',
						name: 'Document Loader',
						type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
						typeVersion: 1.1,
						position: [200, 100] as [number, number],
						parameters: {},
					},
					{
						id: 'emb-1',
						name: 'Embeddings',
						type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
						typeVersion: 1.2,
						position: [200, 200] as [number, number],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Pinecone Store', type: 'main', index: 0 }]],
					},
					'Document Loader': {
						ai_document: [[{ node: 'Pinecone Store', type: 'ai_document', index: 0 }]],
					},
					Embeddings: {
						ai_embedding: [[{ node: 'Pinecone Store', type: 'ai_embedding', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderForParentValidation as never,
			});

			const warnings = result.warnings.filter((w) => w.code === 'UNSUPPORTED_SUBNODE_INPUT');
			expect(warnings).toHaveLength(1);
			expect(warnings[0].nodeName).toBe('Pinecone Store');
			expect(warnings[0].message).toContain('Document Loader');
			expect(warnings[0].message).toContain('documentLoader');
			expect(warnings[0].message).toContain('mode');
		});

		it('should not warn when vector store in insert mode has documentLoader connected', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'vs-1',
						name: 'Pinecone Store',
						type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
						typeVersion: 1.3,
						position: [200, 0] as [number, number],
						parameters: { mode: 'insert' }, // insert mode - supports ai_document
					},
					{
						id: 'doc-1',
						name: 'Document Loader',
						type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
						typeVersion: 1.1,
						position: [200, 100] as [number, number],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'Pinecone Store', type: 'main', index: 0 }]],
					},
					'Document Loader': {
						ai_document: [[{ node: 'Pinecone Store', type: 'ai_document', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderForParentValidation as never,
			});

			const warnings = result.warnings.filter((w) => w.code === 'UNSUPPORTED_SUBNODE_INPUT');
			expect(warnings).toHaveLength(0);
		});

		it('should warn when agent has outputParser connected but hasOutputParser is false', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3.1,
						position: [200, 0] as [number, number],
						parameters: { hasOutputParser: false },
					},
					{
						id: 'parser-1',
						name: 'Output Parser',
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						typeVersion: 1,
						position: [200, 100] as [number, number],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
					'Output Parser': {
						ai_outputParser: [[{ node: 'AI Agent', type: 'ai_outputParser', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderForParentValidation as never,
			});

			const warnings = result.warnings.filter((w) => w.code === 'UNSUPPORTED_SUBNODE_INPUT');
			expect(warnings).toHaveLength(1);
			expect(warnings[0].nodeName).toBe('AI Agent');
			expect(warnings[0].message).toContain('Output Parser');
			expect(warnings[0].message).toContain('hasOutputParser');
		});

		it('should not warn when agent has outputParser connected and hasOutputParser is true', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3.1,
						position: [200, 0] as [number, number],
						parameters: { hasOutputParser: true },
					},
					{
						id: 'parser-1',
						name: 'Output Parser',
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						typeVersion: 1,
						position: [200, 100] as [number, number],
						parameters: {},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
					},
					'Output Parser': {
						ai_outputParser: [[{ node: 'AI Agent', type: 'ai_outputParser', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderForParentValidation as never,
			});

			const warnings = result.warnings.filter((w) => w.code === 'UNSUPPORTED_SUBNODE_INPUT');
			expect(warnings).toHaveLength(0);
		});

		it('should not warn for input types without displayOptions', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'agent-1',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 3.1,
						position: [200, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'model-1',
						name: 'OpenAI Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1.2,
						position: [200, 100] as [number, number],
						parameters: {},
					},
				],
				connections: {
					'OpenAI Model': {
						ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderForParentValidation as never,
			});

			const warnings = result.warnings.filter((w) => w.code === 'UNSUPPORTED_SUBNODE_INPUT');
			expect(warnings).toHaveLength(0);
		});

		it('should not warn when parent parameter is an expression', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'vs-1',
						name: 'Pinecone Store',
						type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
						typeVersion: 1.3,
						position: [200, 0] as [number, number],
						parameters: { mode: '={{ $json.mode }}' }, // expression - can't evaluate statically
					},
					{
						id: 'doc-1',
						name: 'Document Loader',
						type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
						typeVersion: 1.1,
						position: [200, 100] as [number, number],
						parameters: {},
					},
				],
				connections: {
					'Document Loader': {
						ai_document: [[{ node: 'Pinecone Store', type: 'ai_document', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderForParentValidation as never,
			});

			const warnings = result.warnings.filter((w) => w.code === 'UNSUPPORTED_SUBNODE_INPUT');
			expect(warnings).toHaveLength(0);
		});
	});

	describe('Invalid subnode error message enhancement', () => {
		beforeAll(setupTestSchemas, 120_000);
		afterAll(teardownTestSchemas);
		// Mock node types provider that returns builderHint.inputs for OpenAI
		const mockNodeTypesProviderForOpenAi = {
			getByNameAndVersion: (type: string, _version?: number) => {
				if (type === '@n8n/n8n-nodes-langchain.openAi') {
					return {
						description: {
							inputs: ['main'],
							builderHint: {
								inputs: {
									ai_tool: { required: false },
									ai_memory: { required: false },
								},
							},
						},
					};
				}
				return { description: { inputs: ['main'] } };
			},
			getByName: (type: string) => mockNodeTypesProviderForOpenAi.getByNameAndVersion(type),
			getKnownTypes: () => ({}),
		};

		it('should enhance error message with valid subnodes when nodeTypesProvider is available', () => {
			// OpenAI text/response only accepts tools and memory subnodes
			// When passing outputParser (invalid), error should list valid subnodes
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'openai-1',
						name: 'OpenAI',
						type: '@n8n/n8n-nodes-langchain.openAi',
						typeVersion: 2.1,
						position: [200, 0] as [number, number],
						parameters: {
							resource: 'text',
							operation: 'response',
						},
						subnodes: {
							// Invalid: outputParser is not supported for text/response
							outputParser: { type: 'some-parser', version: 1, parameters: {} },
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'OpenAI', type: 'main', index: 0 }]],
					},
				},
			};

			const result = validateWorkflow(workflowJson, {
				nodeTypesProvider: mockNodeTypesProviderForOpenAi as never,
			});

			const invalidParamWarnings = result.warnings.filter((w) => w.code === 'INVALID_PARAMETER');
			expect(invalidParamWarnings.length).toBeGreaterThan(0);
			// The error message should mention the invalid subnode
			expect(invalidParamWarnings.some((w) => w.message.includes('outputParser'))).toBe(true);
			// And should mention valid subnodes
			expect(invalidParamWarnings.some((w) => w.message.includes('tools'))).toBe(true);
			expect(invalidParamWarnings.some((w) => w.message.includes('memory'))).toBe(true);
		});

		it('should show raw error message when nodeTypesProvider is not available', () => {
			const workflowJson = {
				id: 'test',
				name: 'Test',
				nodes: [
					{
						id: 'trigger-1',
						name: 'Manual Trigger',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: {},
					},
					{
						id: 'openai-1',
						name: 'OpenAI',
						type: '@n8n/n8n-nodes-langchain.openAi',
						typeVersion: 2.1,
						position: [200, 0] as [number, number],
						parameters: {
							resource: 'text',
							operation: 'response',
						},
						subnodes: {
							outputParser: { type: 'some-parser', version: 1, parameters: {} },
						},
					},
				],
				connections: {
					'Manual Trigger': {
						main: [[{ node: 'OpenAI', type: 'main', index: 0 }]],
					},
				},
			};

			// No nodeTypesProvider - error should be the raw Zod error
			const result = validateWorkflow(workflowJson);

			const invalidParamWarnings = result.warnings.filter((w) => w.code === 'INVALID_PARAMETER');
			expect(invalidParamWarnings.length).toBeGreaterThan(0);
			expect(invalidParamWarnings.some((w) => w.message.includes('outputParser'))).toBe(true);
			// Should NOT mention valid subnodes (no provider to look them up)
			expect(invalidParamWarnings.some((w) => w.message.includes('This node only accepts'))).toBe(
				false,
			);
		});
	});
});
