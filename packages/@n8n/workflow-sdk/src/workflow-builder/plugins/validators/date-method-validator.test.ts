import { dateMethodValidator } from './date-method-validator';
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

describe('dateMethodValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(dateMethodValidator.id).toBe('core:date-method');
		});

		it('has correct name', () => {
			expect(dateMethodValidator.name).toBe('Date Method Validator');
		});
	});

	describe('validateNode', () => {
		it('returns INVALID_DATE_METHOD warning for $now.toISOString()', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { timestamp: '={{ $now.toISOString() }}' },
			});
			const ctx = createMockPluginContext();

			const issues = dateMethodValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'INVALID_DATE_METHOD',
					severity: 'warning',
				}),
			);
		});

		it('returns INVALID_DATE_METHOD warning for $today.toISOString()', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { date: '={{ $today.toISOString() }}' },
			});
			const ctx = createMockPluginContext();

			const issues = dateMethodValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'INVALID_DATE_METHOD',
					severity: 'warning',
				}),
			);
		});

		it('returns warning for .toISOString() in nested parameter', () => {
			const node = createMockNode('n8n-nodes-base.httpRequest', {
				parameters: {
					options: {
						date: '={{ $now.toISOString() }}',
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = dateMethodValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'INVALID_DATE_METHOD',
				}),
			);
		});

		it('returns no warning for correct .toISO() method', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { timestamp: '={{ $now.toISO() }}' },
			});
			const ctx = createMockPluginContext();

			const issues = dateMethodValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning for non-date expressions', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { value: '={{ $json.name }}' },
			});
			const ctx = createMockPluginContext();

			const issues = dateMethodValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no warning when parameters is undefined', () => {
			const node = createMockNode('n8n-nodes-base.set', {});
			const ctx = createMockPluginContext();

			const issues = dateMethodValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns warnings for multiple invalid date methods', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					start: '={{ $now.toISOString() }}',
					end: '={{ $today.toISOString() }}',
				},
			});
			const ctx = createMockPluginContext();

			const issues = dateMethodValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'INVALID_DATE_METHOD')).toHaveLength(2);
		});

		it('includes nodeName in issues', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { timestamp: '={{ $now.toISOString() }}' },
			});
			Object.assign(node, { name: 'My Set Node' });
			const ctx = createMockPluginContext();

			const issues = dateMethodValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues[0]?.nodeName).toBe('My Set Node');
		});

		it('includes parameterPath in issues', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: { timestamp: '={{ $now.toISOString() }}' },
			});
			const ctx = createMockPluginContext();

			const issues = dateMethodValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues[0]?.parameterPath).toBe('timestamp');
		});
	});
});
