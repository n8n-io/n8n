import { expressionPrefixValidator } from './expression-prefix-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { NodeTypesProvider, PluginContext } from '../types';

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
function createMockPluginContext(nodeTypesProvider?: NodeTypesProvider): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
		...(nodeTypesProvider ? { validationOptions: { nodeTypesProvider } } : {}),
	};
}

// One provider covering every branch: a SQL editor field, a noDataExpression
// field that is not an editor, and a field that does support expressions.
function createProvider(): NodeTypesProvider {
	return {
		getByNameAndVersion: () => ({
			description: {
				properties: [
					{
						displayName: 'SQL Query',
						name: 'sqlQuery',
						type: 'string',
						default: '',
						noDataExpression: true,
						typeOptions: { editor: 'sqlEditor' },
					},
					{
						displayName: 'Code',
						name: 'jsCode',
						type: 'string',
						default: '',
						noDataExpression: true,
						typeOptions: { editor: 'jsEditor' },
					},
					{
						displayName: 'Project',
						name: 'projectId',
						type: 'string',
						default: '',
					},
				],
			},
		}),
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

		it('skips HTML template node (uses {{ }} natively for template expressions)', () => {
			const node = createMockNode('n8n-nodes-base.html', {
				parameters: {
					html: '<h1>{{ $json.title }}</h1><p>{{ $json.body }}</p>',
				},
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

		it('skips sqlEditor parameters (the node resolves inline {{ }} itself)', () => {
			const node = createMockNode('n8n-nodes-base.googleBigQuery', {
				parameters: { sqlQuery: 'SELECT * FROM dataset.table WHERE id = {{ $json.id }}' },
			});
			const ctx = createMockPluginContext(createProvider());

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('still warns for a non-sqlEditor parameter on a node that has an sqlEditor field', () => {
			const node = createMockNode('n8n-nodes-base.googleBigQuery', {
				parameters: {
					sqlQuery: 'SELECT * FROM dataset.table WHERE id = {{ $json.id }}',
					projectId: '{{ $json.project }}',
				},
			});
			const ctx = createMockPluginContext(createProvider());

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(1);
			expect(issues[0]?.parameterPath).toBe('projectId');
		});

		it('warns that an sqlEditor parameter cannot carry the = prefix', () => {
			const node = createMockNode('n8n-nodes-base.googleBigQuery', {
				parameters: { sqlQuery: '=SELECT * FROM dataset.table WHERE id = {{ $json.id }}' },
			});
			const ctx = createMockPluginContext(createProvider());

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(1);
			expect(issues[0]?.code).toBe('UNSUPPORTED_EXPRESSION');
			expect(issues[0]?.parameterPath).toBe('sqlQuery');
			expect(issues[0]?.message).toContain('Keep the {{ }} inline');
		});

		it('tells a non-editor parameter to use a static value instead', () => {
			const node = createMockNode('n8n-nodes-base.googleBigQuery', {
				parameters: { jsCode: '={{ $json.id }}' },
			});
			const ctx = createMockPluginContext(createProvider());

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(1);
			expect(issues[0]?.code).toBe('UNSUPPORTED_EXPRESSION');
			expect(issues[0]?.message).toContain('Use a static value');
		});

		it('reports an inline template on a non-editor parameter as used literally', () => {
			const node = createMockNode('n8n-nodes-base.googleBigQuery', {
				parameters: { jsCode: 'return {{ $json.id }};' },
			});
			const ctx = createMockPluginContext(createProvider());

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(1);
			expect(issues[0]?.code).toBe('UNSUPPORTED_EXPRESSION');
			expect(issues[0]?.message).toContain('used literally');
		});

		it('keeps a lone $fromAI() placeholder intact', () => {
			const node = createMockNode('n8n-nodes-base.googleBigQuery', {
				parameters: { sqlQuery: "={{ $fromAI('query') }}" },
			});
			const ctx = createMockPluginContext(createProvider());

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('leaves the = prefix alone on a parameter that supports expressions', () => {
			const node = createMockNode('n8n-nodes-base.googleBigQuery', {
				parameters: { projectId: '={{ $json.project }}' },
			});
			const ctx = createMockPluginContext(createProvider());

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('says nothing about the = prefix when no node-type provider is available', () => {
			const node = createMockNode('n8n-nodes-base.googleBigQuery', {
				parameters: { sqlQuery: '=SELECT * FROM dataset.table WHERE id = {{ $json.id }}' },
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(0);
		});

		it('warns on an sqlEditor parameter when no node-type provider is available', () => {
			const node = createMockNode('n8n-nodes-base.googleBigQuery', {
				parameters: { sqlQuery: 'SELECT * FROM dataset.table WHERE id = {{ $json.id }}' },
			});
			const ctx = createMockPluginContext();

			const issues = expressionPrefixValidator.validateNode(node, createGraphNode(node), ctx);

			expect(issues).toHaveLength(1);
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
