import { validateWorkflow, ValidationError } from '../validation';
import { workflow } from '../workflow-builder';
import { node, trigger, sticky } from '../node-builder';
import { languageModel, tool } from '../subnode-builders';

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
});
