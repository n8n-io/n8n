import { setNodeValidator } from './set-node-validator';
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

describe('setNodeValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(setNodeValidator.id).toBe('core:set-node');
		});

		it('has correct name', () => {
			expect(setNodeValidator.name).toBe('Set Node Validator');
		});

		it('nodeTypes includes set node type', () => {
			expect(setNodeValidator.nodeTypes).toContain('n8n-nodes-base.set');
		});
	});

	describe('validateNode', () => {
		it('returns SET_CREDENTIAL_FIELD warning for assignment named "password"', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					assignments: {
						assignments: [{ name: 'password', value: 'secret123', type: 'string' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'SET_CREDENTIAL_FIELD',
					severity: 'warning',
				}),
			);
		});

		it('returns SET_CREDENTIAL_FIELD warning for assignment named "api_key"', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					assignments: {
						assignments: [{ name: 'api_key', value: 'key123', type: 'string' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'SET_CREDENTIAL_FIELD',
					severity: 'warning',
				}),
			);
		});

		it('returns SET_CREDENTIAL_FIELD warning for assignment named "secret"', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					assignments: {
						assignments: [{ name: 'secret', value: 'mysecret', type: 'string' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'SET_CREDENTIAL_FIELD',
					severity: 'warning',
				}),
			);
		});

		it('returns SET_CREDENTIAL_FIELD warning for assignment named "token"', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					assignments: {
						assignments: [{ name: 'token', value: 'mytoken', type: 'string' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'SET_CREDENTIAL_FIELD',
					severity: 'warning',
				}),
			);
		});

		it('returns no warning for regular field names', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					assignments: {
						assignments: [
							{ name: 'username', value: 'john', type: 'string' },
							{ name: 'email', value: 'john@example.com', type: 'string' },
						],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues when assignments is undefined', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns no issues when parameters is undefined', () => {
			const node = createMockNode('n8n-nodes-base.set', {});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns warnings for multiple credential-like fields', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					assignments: {
						assignments: [
							{ name: 'password', value: 'secret', type: 'string' },
							{ name: 'api_key', value: 'key', type: 'string' },
						],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues.filter((i) => i.code === 'SET_CREDENTIAL_FIELD')).toHaveLength(2);
		});

		it('includes nodeName in issues', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					assignments: {
						assignments: [{ name: 'password', value: 'secret', type: 'string' }],
					},
				},
			});
			Object.assign(node, { name: 'My Set Node' });
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues[0]?.nodeName).toBe('My Set Node');
		});
	});
});
