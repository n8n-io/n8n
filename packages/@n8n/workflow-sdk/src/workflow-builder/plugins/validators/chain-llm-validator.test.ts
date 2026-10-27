import { chainLlmValidator } from './chain-llm-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

// Helper to create a mock node instance
function createMockNode(
	type: string,
	version: string,
	config: { parameters?: Record<string, unknown> } = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name: 'Test Node',
		version,
		config: {
			parameters: config.parameters ?? {},
		},
	} as NodeInstance<string, string, unknown>;
}

// Helper to create a mock graph node
function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return {
		instance: node,
		connections: new Map(),
	};
}

// Helper to create a mock plugin context
function createMockPluginContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

describe('chainLlmValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(chainLlmValidator.id).toBe('core:chain-llm');
		});

		it('has correct name', () => {
			expect(chainLlmValidator.name).toBe('Chain LLM Validator');
		});

		it('nodeTypes includes chainLlm node type', () => {
			expect(chainLlmValidator.nodeTypes).toContain('@n8n/n8n-nodes-langchain.chainLlm');
		});
	});

	describe('validateNode', () => {
		it('returns AGENT_STATIC_PROMPT warning when promptType is define but text has no expression (v1.4+)', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.4', {
				parameters: { promptType: 'define', text: 'static text' },
			});
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'AGENT_STATIC_PROMPT',
					severity: 'warning',
				}),
			);
		});

		it('returns AGENT_STATIC_PROMPT warning when promptType is define and text is empty (v1.4+)', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.4', {
				parameters: { promptType: 'define', text: '' },
			});
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'AGENT_STATIC_PROMPT',
					severity: 'warning',
				}),
			);
		});

		it('returns no AGENT_STATIC_PROMPT warning when text contains expression', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.4', {
				parameters: { promptType: 'define', text: '={{ $json.input }}' },
			});
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'AGENT_STATIC_PROMPT')).toHaveLength(0);
		});

		it('returns no issues when promptType is not define', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.4', {
				parameters: { promptType: 'auto' },
			});
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues when promptType is undefined', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.4', {
				parameters: {},
			});
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues for versions < 1.4 (promptType was not introduced yet)', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.3', {
				parameters: { promptType: 'define', text: 'static text' },
			});
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues for version 1.0', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.0', {
				parameters: { promptType: 'define', text: 'static text' },
			});
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('validates version 1.5 (>= 1.4)', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.5', {
				parameters: { promptType: 'define', text: 'static text' },
			});
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'AGENT_STATIC_PROMPT',
					severity: 'warning',
				}),
			);
		});

		it('returns no issues when parameters is undefined', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.4', {});
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('includes nodeName in issues', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.chainLlm', '1.4', {
				parameters: { promptType: 'define', text: 'static' },
			});
			Object.assign(node, { name: 'My Chain LLM' });
			const ctx = createMockPluginContext();

			const issues = chainLlmValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues[0]?.nodeName).toBe('My Chain LLM');
		});
	});
});
