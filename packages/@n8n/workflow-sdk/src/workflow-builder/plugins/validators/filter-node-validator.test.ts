import { filterNodeValidator } from './filter-node-validator';
import type { GraphNode, NodeInstance, ConnectionTarget } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	parameters: Record<string, unknown> = {},
	version: string | number = '2.2',
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: String(version),
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map(),
): GraphNode {
	return { instance: node, connections };
}

function createCtx(
	nodes: Map<string, GraphNode> = new Map(),
	validationOptions?: PluginContext['validationOptions'],
): PluginContext {
	return { nodes, workflowId: 'test', workflowName: 'Test', settings: {}, validationOptions };
}

const VALID_CONDITIONS = {
	options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' },
	conditions: [
		{
			leftValue: '={{ $json.field }}',
			operator: { type: 'string', operation: 'equals' },
			rightValue: 'test',
		},
	],
	combinator: 'and',
};

describe('filterNodeValidator', () => {
	describe('metadata', () => {
		it('has correct id', () => {
			expect(filterNodeValidator.id).toBe('core:filter-node');
		});

		it('targets IF, Switch, and Filter nodes', () => {
			expect(filterNodeValidator.nodeTypes).toContain('n8n-nodes-base.if');
			expect(filterNodeValidator.nodeTypes).toContain('n8n-nodes-base.switch');
			expect(filterNodeValidator.nodeTypes).toContain('n8n-nodes-base.filter');
		});
	});

	describe('IF / Filter nodes — conditions on params', () => {
		it('returns no issues for valid conditions', () => {
			const node = createMockNode('n8n-nodes-base.if', 'Check', {
				conditions: VALID_CONDITIONS,
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toHaveLength(0);
		});

		it('returns FILTER_MISSING_OPTIONS when options is missing', () => {
			const node = createMockNode('n8n-nodes-base.if', 'Check', {
				conditions: {
					conditions: [
						{
							leftValue: '={{ $json.x }}',
							operator: { type: 'string', operation: 'equals' },
							rightValue: 'y',
						},
					],
					combinator: 'and',
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({ code: 'FILTER_MISSING_OPTIONS', severity: 'error' }),
			);
		});

		it('returns FILTER_MISSING_COMBINATOR when combinator is missing', () => {
			const node = createMockNode('n8n-nodes-base.if', 'Check', {
				conditions: {
					options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
					conditions: [
						{
							leftValue: '={{ $json.x }}',
							operator: { type: 'string', operation: 'equals' },
							rightValue: 'y',
						},
					],
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({ code: 'FILTER_MISSING_COMBINATOR', severity: 'error' }),
			);
		});

		it('returns all errors when options, conditions array, and combinator are missing', () => {
			const node = createMockNode('n8n-nodes-base.if', 'Check', {
				conditions: {
					combinator: 'and',
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toHaveLength(2);
			expect(issues.map((i) => i.code).sort()).toEqual([
				'FILTER_MISSING_CONDITIONS',
				'FILTER_MISSING_OPTIONS',
			]);
		});

		it('returns FILTER_MISSING_CONDITIONS when inner conditions array is missing', () => {
			const node = createMockNode('n8n-nodes-base.if', 'Check', {
				conditions: {
					options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
					combinator: 'and',
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({ code: 'FILTER_MISSING_CONDITIONS', severity: 'error' }),
			);
		});

		it('returns FILTER_MISSING_CONDITIONS when node has no parameters', () => {
			const node = createMockNode('n8n-nodes-base.if', 'Check');
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'FILTER_MISSING_CONDITIONS',
					severity: 'error',
					parameterPath: 'conditions',
				}),
			);
		});

		it('returns all FILTER_MISSING_* errors for empty conditions object', () => {
			const node = createMockNode('n8n-nodes-base.if', 'Check', {
				conditions: {},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues.map((i) => i.code).sort()).toEqual([
				'FILTER_MISSING_COMBINATOR',
				'FILTER_MISSING_CONDITIONS',
				'FILTER_MISSING_OPTIONS',
			]);
		});

		it('returns FILTER_MISSING_CONDITIONS when conditions is not an object', () => {
			const node = createMockNode('n8n-nodes-base.if', 'Check', {
				conditions: '={{ $json.resolved }}',
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({ code: 'FILTER_MISSING_CONDITIONS', severity: 'error' }),
			);
		});

		it('works for Filter nodes too', () => {
			const node = createMockNode('n8n-nodes-base.filter', 'Filter', {
				conditions: {
					conditions: [
						{
							leftValue: '={{ $json.x }}',
							operator: { type: 'string', operation: 'equals' },
							rightValue: 'y',
						},
					],
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Filter', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues.some((i) => i.code === 'FILTER_MISSING_OPTIONS')).toBe(true);
		});

		it('returns FILTER_OUTDATED_TYPE_VERSION for explicit IF typeVersion 1 with V2 conditions', () => {
			const node = createMockNode(
				'n8n-nodes-base.if',
				'Check',
				{ conditions: VALID_CONDITIONS },
				1,
			);
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toEqual([
				expect.objectContaining({
					code: 'FILTER_OUTDATED_TYPE_VERSION',
					severity: 'error',
					parameterPath: 'version',
				}),
			]);
			expect(issues[0]?.message).toContain('true branch');
		});

		it('returns FILTER_OUTDATED_TYPE_VERSION when IF version is missing and no defaultVersions', () => {
			const node = createMockNode(
				'n8n-nodes-base.if',
				'Check',
				{ conditions: VALID_CONDITIONS },
				'undefined',
			);
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({ code: 'FILTER_OUTDATED_TYPE_VERSION', severity: 'error' }),
			);
		});

		it('accepts missing IF version when defaultVersions resolves to v2+', () => {
			const node = createMockNode(
				'n8n-nodes-base.if',
				'Check',
				{ conditions: VALID_CONDITIONS },
				'undefined',
			);
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Check', graphNode]]);
			const ctx = createCtx(nodes, {
				defaultVersions: { 'n8n-nodes-base.if': 2.3 },
			});

			const issues = filterNodeValidator.validateNode(node, graphNode, ctx);

			expect(issues).toHaveLength(0);
		});

		it('returns FILTER_OUTDATED_TYPE_VERSION for Filter typeVersion 1', () => {
			const node = createMockNode(
				'n8n-nodes-base.filter',
				'Filter',
				{ conditions: VALID_CONDITIONS },
				1,
			);
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Filter', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({ code: 'FILTER_OUTDATED_TYPE_VERSION', severity: 'error' }),
			);
		});
	});

	describe('Switch node — rules.values[]', () => {
		it('returns no issues for valid Switch rules', () => {
			const node = createMockNode('n8n-nodes-base.switch', 'Router', {
				rules: {
					values: [
						{ outputKey: 'a', conditions: VALID_CONDITIONS },
						{ outputKey: 'b', conditions: VALID_CONDITIONS },
					],
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Router', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toHaveLength(0);
		});

		it('returns SWITCH_WRONG_RULES_KEY when using rules.rules instead of rules.values', () => {
			const node = createMockNode('n8n-nodes-base.switch', 'Router', {
				rules: {
					rules: [{ outputKey: 'a', conditions: VALID_CONDITIONS }],
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Router', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({ code: 'SWITCH_WRONG_RULES_KEY', severity: 'error' }),
			);
		});

		it('validates conditions inside each rule', () => {
			const node = createMockNode('n8n-nodes-base.switch', 'Router', {
				rules: {
					values: [
						{
							outputKey: 'a',
							conditions: {
								conditions: [
									{
										leftValue: '={{ $json.x }}',
										operator: { type: 'string', operation: 'equals' },
										rightValue: 'y',
									},
								],
							},
						},
					],
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Router', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues).toContainEqual(expect.objectContaining({ code: 'FILTER_MISSING_OPTIONS' }));
			expect(issues).toContainEqual(expect.objectContaining({ code: 'FILTER_MISSING_COMBINATOR' }));
		});

		it('returns FILTER_MISSING_* for empty rule conditions object', () => {
			const node = createMockNode('n8n-nodes-base.switch', 'Router', {
				rules: {
					values: [{ outputKey: 'a', conditions: {} }],
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Router', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			expect(issues.map((i) => i.code).sort()).toEqual([
				'FILTER_MISSING_COMBINATOR',
				'FILTER_MISSING_CONDITIONS',
				'FILTER_MISSING_OPTIONS',
			]);
			expect(issues[0]?.parameterPath).toMatch(/^rules\.values\[0\]\.conditions/);
		});

		it('still validates conditions inside rules.rules (wrong key but checks content)', () => {
			const node = createMockNode('n8n-nodes-base.switch', 'Router', {
				rules: {
					rules: [
						{
							outputKey: 'a',
							conditions: {
								conditions: [
									{
										leftValue: '={{ $json.x }}',
										operator: { type: 'string', operation: 'equals' },
										rightValue: 'y',
									},
								],
							},
						},
					],
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Router', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			const codes = issues.map((i) => i.code);
			expect(codes).toContain('SWITCH_WRONG_RULES_KEY');
			expect(codes).toContain('FILTER_MISSING_OPTIONS');
			expect(codes).toContain('FILTER_MISSING_COMBINATOR');
		});

		it('includes parameterPath in issues for nested rules', () => {
			const node = createMockNode('n8n-nodes-base.switch', 'Router', {
				rules: {
					values: [
						{ outputKey: 'a', conditions: VALID_CONDITIONS },
						{
							outputKey: 'b',
							conditions: {
								conditions: [
									{
										leftValue: '={{ $json.x }}',
										operator: { type: 'string', operation: 'equals' },
										rightValue: 'y',
									},
								],
							},
						},
					],
				},
			});
			const graphNode = createGraphNode(node);
			const nodes = new Map([['Router', graphNode]]);

			const issues = filterNodeValidator.validateNode(node, graphNode, createCtx(nodes));

			const optionsIssue = issues.find((i) => i.code === 'FILTER_MISSING_OPTIONS');
			expect(optionsIssue?.parameterPath).toBe('rules.values[1].conditions.options');
		});
	});
});
