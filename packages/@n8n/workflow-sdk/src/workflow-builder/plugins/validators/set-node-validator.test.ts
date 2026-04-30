import { setNodeValidator } from './set-node-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

// Helper to create a mock node instance.
// Defaults to version 3.4 because assignment validation applies to Set v3.3+.
function createMockNode(
	type: string,
	config: { parameters?: Record<string, unknown> } = {},
	version: string = '3.4',
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

function createAssignment(name: string, value: unknown, type: string) {
	return {
		id: `${name}-assignment`,
		name,
		value,
		type,
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
						assignments: [createAssignment('password', 'secret123', 'string')],
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
						assignments: [createAssignment('api_key', 'key123', 'string')],
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
						assignments: [createAssignment('secret', 'mysecret', 'string')],
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
						assignments: [createAssignment('token', 'mytoken', 'string')],
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
							createAssignment('username', 'john', 'string'),
							createAssignment('email', 'john@example.com', 'string'),
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

		it.each(['1', '2'])('skips validation for legacy Set node version %s', (version) => {
			const node = createMockNode(
				'n8n-nodes-base.set',
				{
					parameters: {
						mode: 'keepAllExistingFields',
						assignments: {
							assignments: [{ name: 'password', value: 'secret', type: 'string' }],
						},
					},
				},
				version,
			);
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it.each(['3', '3.1', '3.2'])(
			'returns SET_INVALID_MODE error for unsupported Set node mode on version %s',
			(version) => {
				const node = createMockNode(
					'n8n-nodes-base.set',
					{
						parameters: {
							mode: 'keepAllExistingFields',
							assignments: {
								assignments: [{ name: 'caption', value: '={{ $json.title }}', type: 'string' }],
							},
						},
					},
					version,
				);
				const ctx = createMockPluginContext();

				const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

				expect(issues).toEqual([
					expect.objectContaining({
						code: 'SET_INVALID_MODE',
						severity: 'error',
						parameterPath: 'parameters.mode',
					}),
				]);
			},
		);

		it.each(['3', '3.1', '3.2'])(
			'skips assignment validation for Set node version %s',
			(version) => {
				const node = createMockNode(
					'n8n-nodes-base.set',
					{
						parameters: {
							mode: 'manual',
							assignments: {
								assignments: [{ name: 'password', value: 'secret', type: 'string' }],
							},
						},
					},
					version,
				);
				const ctx = createMockPluginContext();

				const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

				expect(issues).toHaveLength(0);
			},
		);

		it('allows raw mode because it is a valid Set node output mode', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					mode: 'raw',
					jsonOutput: '={{ { id: $json.id, title: $json.title } }}',
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns warnings for multiple credential-like fields', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					assignments: {
						assignments: [
							createAssignment('password', 'secret', 'string'),
							createAssignment('api_key', 'key', 'string'),
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
						assignments: [createAssignment('password', 'secret', 'string')],
					},
				},
			});
			Object.assign(node, { name: 'My Set Node' });
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues[0]?.nodeName).toBe('My Set Node');
		});

		it('returns SET_INVALID_MODE error for unsupported Set node modes', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					mode: 'keepAllExistingFields',
					includeOtherFields: true,
					assignments: {
						assignments: [createAssignment('caption', '={{ $json.title }}', 'string')],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'SET_INVALID_MODE',
					severity: 'error',
				}),
			);
		});

		it('returns SET_INVALID_ASSIGNMENT error when a manual assignment is missing an id', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					mode: 'manual',
					includeOtherFields: true,
					assignments: {
						assignments: [{ name: 'caption', value: '={{ $json.title }}', type: 'string' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'SET_INVALID_ASSIGNMENT',
					severity: 'error',
					parameterPath: 'parameters.assignments.assignments[0].id',
				}),
			);
		});

		it('returns SET_INVALID_ASSIGNMENT error when a manual assignment omits value', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					mode: 'manual',
					assignments: {
						assignments: [{ id: 'caption-assignment', name: 'caption', type: 'string' }],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'SET_INVALID_ASSIGNMENT',
					severity: 'error',
					parameterPath: 'parameters.assignments.assignments[0].value',
				}),
			);
		});

		it('returns SET_INVALID_ASSIGNMENT error when a manual assignment has explicit undefined value', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					mode: 'manual',
					assignments: {
						assignments: [
							{
								id: 'caption-assignment',
								name: 'caption',
								type: 'string',
								value: undefined,
							},
						],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'SET_INVALID_ASSIGNMENT',
					severity: 'error',
					parameterPath: 'parameters.assignments.assignments[0].value',
				}),
			);
		});

		it('returns no issues for a canonical manual Set v3.4 assignment shape', () => {
			const node = createMockNode('n8n-nodes-base.set', {
				parameters: {
					mode: 'manual',
					includeOtherFields: true,
					assignments: {
						assignments: [
							createAssignment('caption', '={{ $json.title }}', 'string'),
							createAssignment('score', 12, 'number'),
						],
					},
				},
			});
			const ctx = createMockPluginContext();

			const issues = setNodeValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});
	});
});
