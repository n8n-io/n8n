import { expressionPrefixValidator } from './expression-prefix-validator';
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

describe('expressionPrefixValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(expressionPrefixValidator.id).toBe('core:expression-prefix');
		});

		it('has correct name', () => {
			expect(expressionPrefixValidator.name).toBe('Expression Prefix Validator');
		});
	});

	describe('validateNode', () => {
		it('returns MISSING_EXPRESSION_PREFIX warning for {{ $json }} without = prefix', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: '{{ $json.name }}' },
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'MISSING_EXPRESSION_PREFIX',
					severity: 'warning',
				}),
			);
		});

		it('returns MISSING_EXPRESSION_PREFIX warning for {{ $now }} without = prefix', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { timestamp: '{{ $now }}' },
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'MISSING_EXPRESSION_PREFIX',
					severity: 'warning',
				}),
			);
		});

		it('returns warning for {{ $ pattern in nested parameter', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					options: {
						body: '{{ $json.data }}',
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'MISSING_EXPRESSION_PREFIX',
				}),
			);
		});

		it('returns no warning for properly prefixed expression ={{ $json }}', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: '={{ $json.name }}' },
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning for non-expression values', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: 'static text' },
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning when parameters is undefined', () => {
			const node = createMockNode('n8n-nodes-base.set', {});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('skips sticky notes (they are documentation, not code)', () => {
			const node = createMockNode('n8n-nodes-base.stickyNote', {
				parameters: { content: 'Use {{ $json.name }} to get the name' },
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns warnings for multiple malformed expressions', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					field1: '{{ $json.a }}',
					field2: '{{ $json.b }}',
				},
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'MISSING_EXPRESSION_PREFIX')).toHaveLength(2);
		});

		it('includes nodeName in issues', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: '{{ $json.name }}' },
			});
			Object.assign(node, { name: 'My Set Node' });
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues[0]?.nodeName).toBe('My Set Node');
		});

		it('includes parameterPath in issues', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: '{{ $json.name }}' },
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues[0]?.parameterPath).toBe('value');
		});
	});
});
