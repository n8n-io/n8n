import { agentWithoutAggregateValidator } from './agent-without-aggregate-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	parameters: Record<string, unknown> = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1.7',
		config: { parameters },
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

describe('agentWithoutAggregateValidator', () => {
	it('has correct id', () => {
		expect(agentWithoutAggregateValidator.id).toBe('core:agent-without-aggregate');
	});

	it('flags whole-collection Agent after Filter without aggregating Code', () => {
		const filter = createMockNode('n8n-nodes-base.filter', 'Keep Rows');
		const agent = createMockNode('@n8n/n8n-nodes-langchain.agent', 'Analyse All');
		const filterGraph = createGraphNode(filter);
		const agentGraph = createGraphNode(agent);
		connect(filterGraph, 'Analyse All');
		const nodes = new Map([
			['Keep Rows', filterGraph],
			['Analyse All', agentGraph],
		]);

		const issues = agentWithoutAggregateValidator.validateNode(agent, agentGraph, createCtx(nodes));
		expect(issues).toContainEqual(
			expect.objectContaining({ code: 'AGENT_WITHOUT_PRIOR_AGGREGATE' }),
		);
	});

	it('ignores per-item Agent after Filter (name does not imply whole collection)', () => {
		const filter = createMockNode('n8n-nodes-base.filter', 'Keep Rows');
		const agent = createMockNode('@n8n/n8n-nodes-langchain.agent', 'Enrich Row');
		const filterGraph = createGraphNode(filter);
		const agentGraph = createGraphNode(agent);
		connect(filterGraph, 'Enrich Row');
		const nodes = new Map([
			['Keep Rows', filterGraph],
			['Enrich Row', agentGraph],
		]);

		expect(
			agentWithoutAggregateValidator.validateNode(agent, agentGraph, createCtx(nodes)),
		).toEqual([]);
	});

	it('allows Agent when an aggregating Code sits upstream', () => {
		const filter = createMockNode('n8n-nodes-base.filter', 'Keep Rows');
		const code = createMockNode('n8n-nodes-base.code', 'Collect Rows', {
			jsCode: 'return [{ json: { rows: $input.all().map(i => i.json) } }];',
		});
		const agent = createMockNode('@n8n/n8n-nodes-langchain.agent', 'Analyse All');
		const filterGraph = createGraphNode(filter);
		const codeGraph = createGraphNode(code);
		const agentGraph = createGraphNode(agent);
		connect(filterGraph, 'Collect Rows');
		connect(codeGraph, 'Analyse All');
		const nodes = new Map([
			['Keep Rows', filterGraph],
			['Collect Rows', codeGraph],
			['Analyse All', agentGraph],
		]);

		expect(
			agentWithoutAggregateValidator.validateNode(agent, agentGraph, createCtx(nodes)),
		).toEqual([]);
	});

	it('ignores Agent without a multi-item ancestor', () => {
		const set = createMockNode('n8n-nodes-base.set', 'Prep');
		const agent = createMockNode('@n8n/n8n-nodes-langchain.agent', 'Answer');
		const setGraph = createGraphNode(set);
		const agentGraph = createGraphNode(agent);
		connect(setGraph, 'Answer');
		const nodes = new Map([
			['Prep', setGraph],
			['Answer', agentGraph],
		]);

		expect(
			agentWithoutAggregateValidator.validateNode(agent, agentGraph, createCtx(nodes)),
		).toEqual([]);
	});
});
