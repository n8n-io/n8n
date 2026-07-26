import { sideEffectJsonChainValidator } from './side-effect-json-chain-validator';
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
		version: '1',
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

describe('sideEffectJsonChainValidator', () => {
	it('has correct id', () => {
		expect(sideEffectJsonChainValidator.id).toBe('core:side-effect-json-chain');
	});

	it('flags bare $json.email after Slack send', () => {
		const slack = createMockNode('n8n-nodes-base.slack', 'Notify', {
			operation: 'post',
			text: 'hi',
		});
		const sheets = createMockNode('n8n-nodes-base.googleSheets', 'Log Row', {
			operation: 'append',
			columns: { value: { email: '={{ $json.email }}' } },
		});
		const slackGraph = createGraphNode(slack);
		const sheetsGraph = createGraphNode(sheets);
		connect(slackGraph, 'Log Row');
		const nodes = new Map([
			['Notify', slackGraph],
			['Log Row', sheetsGraph],
		]);

		const issues = sideEffectJsonChainValidator.validateWorkflow?.(createCtx(nodes)) ?? [];
		expect(issues).toContainEqual(expect.objectContaining({ code: 'SIDE_EFFECT_JSON_CHAIN' }));
	});

	it('allows $json.ok after Slack send', () => {
		const slack = createMockNode('n8n-nodes-base.slack', 'Notify', { operation: 'post' });
		const set = createMockNode('n8n-nodes-base.set', 'Keep Ok', {
			assignments: {
				assignments: [{ name: 'ok', value: '={{ $json.ok }}', type: 'boolean' }],
			},
		});
		const slackGraph = createGraphNode(slack);
		const setGraph = createGraphNode(set);
		connect(slackGraph, 'Keep Ok');
		const nodes = new Map([
			['Notify', slackGraph],
			['Keep Ok', setGraph],
		]);

		expect(sideEffectJsonChainValidator.validateWorkflow?.(createCtx(nodes)) ?? []).toEqual([]);
	});

	it('allows named upstream references after Slack send', () => {
		const slack = createMockNode('n8n-nodes-base.slack', 'Notify', { operation: 'post' });
		const set = createMockNode('n8n-nodes-base.set', 'Keep Email', {
			assignments: {
				assignments: [
					{
						name: 'email',
						value: "={{ $('Prepare').item.json.email }}",
						type: 'string',
					},
				],
			},
		});
		const slackGraph = createGraphNode(slack);
		const setGraph = createGraphNode(set);
		connect(slackGraph, 'Keep Email');
		const nodes = new Map([
			['Notify', slackGraph],
			['Keep Email', setGraph],
		]);

		expect(sideEffectJsonChainValidator.validateWorkflow?.(createCtx(nodes)) ?? []).toEqual([]);
	});
});
