import { executeOnceAggregatorValidator } from './execute-once-aggregator-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	config: { executeOnce?: boolean; parameters?: Record<string, unknown> } = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1',
		config: {
			parameters: config.parameters ?? {},
			...(config.executeOnce === undefined ? {} : { executeOnce: config.executeOnce }),
		},
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map(),
): GraphNode {
	return { instance: node, connections };
}

function connect(source: GraphNode, targetName: string): void {
	const main = source.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
	const targets = main.get(0) ?? [];
	targets.push({ node: targetName, type: 'main', index: 0 });
	main.set(0, targets);
	source.connections.set('main', main);
}

function createCtx(nodes: Map<string, GraphNode>): PluginContext {
	return { nodes, workflowId: 'test', workflowName: 'Test', settings: {} };
}

describe('executeOnceAggregatorValidator', () => {
	it('has correct id', () => {
		expect(executeOnceAggregatorValidator.id).toBe('core:execute-once-aggregator');
	});

	it('flags summary Slack after Filter without executeOnce', () => {
		const filter = createMockNode('n8n-nodes-base.filter', 'Keep Matches');
		const slack = createMockNode('n8n-nodes-base.slack', 'Send Weekly Summary');
		const filterGraph = createGraphNode(filter);
		const slackGraph = createGraphNode(slack);
		connect(filterGraph, 'Send Weekly Summary');
		const nodes = new Map([
			['Keep Matches', filterGraph],
			['Send Weekly Summary', slackGraph],
		]);

		const issues = executeOnceAggregatorValidator.validateNode(slack, slackGraph, createCtx(nodes));
		expect(issues).toContainEqual(expect.objectContaining({ code: 'MISSING_EXECUTE_ONCE' }));
	});

	it('allows summary Slack with executeOnce true', () => {
		const filter = createMockNode('n8n-nodes-base.filter', 'Keep Matches');
		const slack = createMockNode('n8n-nodes-base.slack', 'Send Weekly Summary', {
			executeOnce: true,
		});
		const filterGraph = createGraphNode(filter);
		const slackGraph = createGraphNode(slack);
		connect(filterGraph, 'Send Weekly Summary');
		const nodes = new Map([
			['Keep Matches', filterGraph],
			['Send Weekly Summary', slackGraph],
		]);

		expect(
			executeOnceAggregatorValidator.validateNode(slack, slackGraph, createCtx(nodes)),
		).toEqual([]);
	});

	it('ignores Slack without aggregator naming', () => {
		const filter = createMockNode('n8n-nodes-base.filter', 'Keep Matches');
		const slack = createMockNode('n8n-nodes-base.slack', 'Notify Channel');
		const filterGraph = createGraphNode(filter);
		const slackGraph = createGraphNode(slack);
		connect(filterGraph, 'Notify Channel');
		const nodes = new Map([
			['Keep Matches', filterGraph],
			['Notify Channel', slackGraph],
		]);

		expect(
			executeOnceAggregatorValidator.validateNode(slack, slackGraph, createCtx(nodes)),
		).toEqual([]);
	});
});
