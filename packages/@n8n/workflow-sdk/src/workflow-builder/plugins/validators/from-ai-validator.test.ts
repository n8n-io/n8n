import { fromAiValidator } from './from-ai-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

// Helper to create a mock node instance
function createMockNode(
	type: string,
	config: { parameters?: Record<string, unknown> } = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name: 'Test Node',
		version: '1',
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

describe('fromAiValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(fromAiValidator.id).toBe('core:from-ai');
		});

		it('has correct name', () => {
			expect(fromAiValidator.name).toBe('FromAI Expression Validator');
		});

		it('has no specific nodeTypes (validates all non-tool nodes)', () => {
			expect(fromAiValidator.nodeTypes).toBeUndefined();
		});
	});

	describe('validateNode', () => {
		it('returns FROM_AI_IN_NON_TOOL warning for non-tool node using $fromAI', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: '={{ $fromAI("name") }}' },
			});
			const ctx = createMockPluginContext();

			const issues = fromAiValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'FROM_AI_IN_NON_TOOL',
					severity: 'warning',
				}),
			);
		});

		it('returns warning for $fromAI in nested parameter', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					options: {
						headers: {
							value: '={{ $fromAI("header") }}',
						},
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = fromAiValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'FROM_AI_IN_NON_TOOL',
					severity: 'warning',
				}),
			);
		});

		it('returns warning for $fromAI in array parameter', () => {
			const node = createMockNode('n8n-nodes-base.code', {
				parameters: {
					items: ['first', '={{ $fromAI("second") }}', 'third'],
				},
			});
			const ctx = createMockPluginContext();

			const issues = fromAiValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'FROM_AI_IN_NON_TOOL',
					severity: 'warning',
				}),
			);
		});

		it('returns no warning for tool node using $fromAI', () => {
			const node = createMockNode('@n8n/n8n-nodes-langchain.toolHttpRequest', {
				parameters: { url: '={{ $fromAI("url") }}' },
			});
			const ctx = createMockPluginContext();

			const issues = fromAiValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning for non-tool node without $fromAI', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: '={{ $json.name }}' },
			});
			const ctx = createMockPluginContext();

			const issues = fromAiValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning when parameters is undefined', () => {
			const node = createMockNode('n8n-nodes-base.set', {});
			const ctx = createMockPluginContext();

			const issues = fromAiValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('includes nodeName in issues', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: '={{ $fromAI("name") }}' },
			});
			Object.assign(node, { name: 'My Set Node' });
			const ctx = createMockPluginContext();

			const issues = fromAiValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues[0]?.nodeName).toBe('My Set Node');
		});

		it('detects $fromAI anywhere in string value', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: 'prefix $fromAI("name") suffix' },
			});
			const ctx = createMockPluginContext();

			const issues = fromAiValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'FROM_AI_IN_NON_TOOL',
				}),
			);
		});
	});
});
