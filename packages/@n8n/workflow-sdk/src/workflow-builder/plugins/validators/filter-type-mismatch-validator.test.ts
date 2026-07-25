import { filterTypeMismatchValidator } from './filter-type-mismatch-validator';
import type { GraphNode, NodeInstance, ConnectionTarget, IDataObject } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	config: {
		parameters?: Record<string, unknown>;
		output?: IDataObject[];
	} = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '2.2',
		config: {
			parameters: config.parameters ?? {},
			...(config.output ? { output: config.output } : {}),
		},
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map(),
): GraphNode {
	return { instance: node, connections };
}

function createCtx(nodes: Map<string, GraphNode>): PluginContext {
	return { nodes, workflowId: 'test', workflowName: 'Test', settings: {} };
}

/** Wire source → target on main output 0 so mainInputSources finds the predecessor. */
function connect(source: GraphNode, targetName: string): void {
	const main = source.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
	const targets = main.get(0) ?? [];
	targets.push({ node: targetName, type: 'main', index: 0 });
	main.set(0, targets);
	source.connections.set('main', main);
}

function stringEqualsTrueCondition(leftValue = '={{ $json.matched }}') {
	return {
		id: 'matched',
		leftValue,
		rightValue: 'true',
		operator: { type: 'string', operation: 'equals' },
	};
}

function booleanTrueCondition(leftValue = '={{ $json.matched }}') {
	return {
		id: 'matched',
		leftValue,
		rightValue: '',
		operator: { type: 'boolean', operation: 'true', singleValue: true },
	};
}

function ifParams(
	condition: Record<string, unknown>,
	typeValidation: 'strict' | 'loose' = 'strict',
) {
	return {
		conditions: {
			options: { caseSensitive: true, leftValue: '', typeValidation, version: 2 },
			conditions: [condition],
			combinator: 'and',
		},
	};
}

describe('filterTypeMismatchValidator', () => {
	describe('metadata', () => {
		it('has correct id and targets filter nodes', () => {
			expect(filterTypeMismatchValidator.id).toBe('core:filter-type-mismatch');
			expect(filterTypeMismatchValidator.nodeTypes).toEqual(
				expect.arrayContaining([
					'n8n-nodes-base.if',
					'n8n-nodes-base.switch',
					'n8n-nodes-base.filter',
				]),
			);
		});
	});

	describe('fixture-aware detection', () => {
		it('flags string equals against a boolean fixture field under strict validation', () => {
			const upstream = createMockNode('n8n-nodes-base.code', 'Score', {
				parameters: {},
				output: [{ matched: true, score: 0.9 }],
			});
			const ifNode = createMockNode('n8n-nodes-base.if', 'Matched?', {
				parameters: ifParams(stringEqualsTrueCondition()),
			});
			const upstreamGraph = createGraphNode(upstream);
			const ifGraph = createGraphNode(ifNode);
			connect(upstreamGraph, 'Matched?');
			const nodes = new Map([
				['Score', upstreamGraph],
				['Matched?', ifGraph],
			]);

			const issues = filterTypeMismatchValidator.validateNode(ifNode, ifGraph, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({
					code: 'FILTER_BOOLEAN_COMPARED_AS_STRING',
					severity: 'warning',
					nodeName: 'Matched?',
				}),
			);
		});

		it('flags string operator when Set declares the field as boolean', () => {
			const setNode = createMockNode('n8n-nodes-base.set', 'Normalize', {
				parameters: {
					assignments: {
						assignments: [{ id: '1', name: 'matched', type: 'boolean', value: true }],
					},
				},
			});
			const ifNode = createMockNode('n8n-nodes-base.if', 'Check', {
				parameters: ifParams({
					id: 'c1',
					leftValue: '={{ $json.matched }}',
					rightValue: 'yes',
					operator: { type: 'string', operation: 'equals' },
				}),
			});
			const setGraph = createGraphNode(setNode);
			const ifGraph = createGraphNode(ifNode);
			connect(setGraph, 'Check');
			const nodes = new Map([
				['Normalize', setGraph],
				['Check', ifGraph],
			]);

			const issues = filterTypeMismatchValidator.validateNode(ifNode, ifGraph, createCtx(nodes));

			expect(issues).toHaveLength(1);
			expect(issues[0]?.code).toBe('FILTER_BOOLEAN_COMPARED_AS_STRING');
		});

		it('does not flag when typeValidation is loose even with a boolean fixture', () => {
			const upstream = createMockNode('n8n-nodes-base.code', 'Score', {
				output: [{ matched: true }],
			});
			const ifNode = createMockNode('n8n-nodes-base.if', 'Matched?', {
				parameters: ifParams(stringEqualsTrueCondition(), 'loose'),
			});
			const upstreamGraph = createGraphNode(upstream);
			const ifGraph = createGraphNode(ifNode);
			connect(upstreamGraph, 'Matched?');
			const nodes = new Map([
				['Score', upstreamGraph],
				['Matched?', ifGraph],
			]);

			expect(
				filterTypeMismatchValidator.validateNode(ifNode, ifGraph, createCtx(nodes)),
			).toHaveLength(0);
		});

		it('accepts a boolean operator against a boolean fixture field', () => {
			const upstream = createMockNode('n8n-nodes-base.code', 'Score', {
				output: [{ matched: true }],
			});
			const ifNode = createMockNode('n8n-nodes-base.if', 'Matched?', {
				parameters: ifParams(booleanTrueCondition()),
			});
			const upstreamGraph = createGraphNode(upstream);
			const ifGraph = createGraphNode(ifNode);
			connect(upstreamGraph, 'Matched?');
			const nodes = new Map([
				['Score', upstreamGraph],
				['Matched?', ifGraph],
			]);

			expect(
				filterTypeMismatchValidator.validateNode(ifNode, ifGraph, createCtx(nodes)),
			).toHaveLength(0);
		});
	});

	describe('heuristic detection', () => {
		it('flags string equals "true" under strict validation without fixtures', () => {
			const ifNode = createMockNode('n8n-nodes-base.if', 'Matched?', {
				parameters: ifParams(stringEqualsTrueCondition()),
			});
			const ifGraph = createGraphNode(ifNode);
			const nodes = new Map([['Matched?', ifGraph]]);

			const issues = filterTypeMismatchValidator.validateNode(ifNode, ifGraph, createCtx(nodes));

			expect(issues).toContainEqual(
				expect.objectContaining({ code: 'FILTER_BOOLEAN_COMPARED_AS_STRING' }),
			);
		});

		it('does not flag string equals "active" under strict validation without fixtures', () => {
			const ifNode = createMockNode('n8n-nodes-base.if', 'Active?', {
				parameters: ifParams({
					id: 'c1',
					leftValue: '={{ $json.status }}',
					rightValue: 'active',
					operator: { type: 'string', operation: 'equals' },
				}),
			});
			const ifGraph = createGraphNode(ifNode);
			const nodes = new Map([['Active?', ifGraph]]);

			expect(
				filterTypeMismatchValidator.validateNode(ifNode, ifGraph, createCtx(nodes)),
			).toHaveLength(0);
		});

		it('does not apply the true/false heuristic when typeValidation is loose', () => {
			const ifNode = createMockNode('n8n-nodes-base.if', 'Matched?', {
				parameters: ifParams(stringEqualsTrueCondition(), 'loose'),
			});
			const ifGraph = createGraphNode(ifNode);
			const nodes = new Map([['Matched?', ifGraph]]);

			expect(
				filterTypeMismatchValidator.validateNode(ifNode, ifGraph, createCtx(nodes)),
			).toHaveLength(0);
		});
	});

	describe('Switch nodes', () => {
		it('flags nested rule conditions', () => {
			const switchNode = createMockNode('n8n-nodes-base.switch', 'Route', {
				parameters: {
					rules: {
						values: [
							{
								conditions: {
									options: {
										caseSensitive: true,
										leftValue: '',
										typeValidation: 'strict',
										version: 2,
									},
									conditions: [stringEqualsTrueCondition('={{ $json.enabled }}')],
									combinator: 'and',
								},
							},
						],
					},
				},
			});
			const switchGraph = createGraphNode(switchNode);
			const nodes = new Map([['Route', switchGraph]]);

			const issues = filterTypeMismatchValidator.validateNode(
				switchNode,
				switchGraph,
				createCtx(nodes),
			);

			expect(issues).toHaveLength(1);
			expect(issues[0]?.parameterPath).toBe('rules.values[0].conditions.conditions[0]');
		});
	});
});
