import { nestedSplitInBatchesValidator } from './nested-split-in-batches-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(type: string, name: string): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '3',
		config: { parameters: {} },
	} as NodeInstance<string, string, unknown>;
}

function conn(node: string): ConnectionTarget {
	return { node, type: 'main', index: 0 };
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	mainOutputs: Map<number, ConnectionTarget[]> = new Map(),
): GraphNode {
	const connections = new Map<string, Map<number, ConnectionTarget[]>>();
	if (mainOutputs.size > 0) {
		connections.set('main', mainOutputs);
	}
	return { instance: node, connections };
}

function createContext(nodes: Map<string, GraphNode>): PluginContext {
	return {
		nodes,
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

function codesFor(
	node: NodeInstance<string, string, unknown>,
	nodes: Map<string, GraphNode>,
	name: string,
): string[] {
	return nestedSplitInBatchesValidator
		.validateNode(node, nodes.get(name)!, createContext(nodes))
		.map((i) => i.code);
}

describe('nestedSplitInBatchesValidator', () => {
	it('has correct id', () => {
		expect(nestedSplitInBatchesValidator.id).toBe('core:nested-split-in-batches');
	});

	it('flags Split In Batches on another each-batch branch', () => {
		const outer = createMockNode('n8n-nodes-base.splitInBatches', 'Loop Customers');
		const fetch = createMockNode('n8n-nodes-base.httpRequest', 'Fetch Orders');
		const inner = createMockNode('n8n-nodes-base.splitInBatches', 'Loop Orders');
		const work = createMockNode('n8n-nodes-base.httpRequest', 'Fetch Lines');
		const done = createMockNode('n8n-nodes-base.noOp', 'Done');
		const nodes = new Map<string, GraphNode>([
			[
				'Loop Customers',
				createGraphNode(
					outer,
					new Map([
						[0, [conn('Done')]],
						[1, [conn('Fetch Orders')]],
					]),
				),
			],
			['Fetch Orders', createGraphNode(fetch, new Map([[0, [conn('Loop Orders')]]]))],
			[
				'Loop Orders',
				createGraphNode(
					inner,
					new Map([
						[0, [conn('Loop Customers')]],
						[1, [conn('Fetch Lines')]],
					]),
				),
			],
			['Fetch Lines', createGraphNode(work, new Map([[0, [conn('Loop Orders')]]]))],
			['Done', createGraphNode(done)],
		]);

		expect(codesFor(outer, nodes, 'Loop Customers')).toEqual(['NESTED_SPLIT_IN_BATCHES']);
		expect(codesFor(inner, nodes, 'Loop Orders')).toEqual([]);
	});

	it('accepts a single loop with nextBatch loopback', () => {
		const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
		const work = createMockNode('n8n-nodes-base.httpRequest', 'Work');
		const done = createMockNode('n8n-nodes-base.noOp', 'Done');
		const nodes = new Map<string, GraphNode>([
			[
				'Loop',
				createGraphNode(
					loop,
					new Map([
						[0, [conn('Done')]],
						[1, [conn('Work')]],
					]),
				),
			],
			['Work', createGraphNode(work, new Map([[0, [conn('Loop')]]]))],
			['Done', createGraphNode(done)],
		]);

		expect(codesFor(loop, nodes, 'Loop')).toEqual([]);
	});

	it('accepts sequential Split In Batches on the done path', () => {
		const first = createMockNode('n8n-nodes-base.splitInBatches', 'Loop A');
		const workA = createMockNode('n8n-nodes-base.httpRequest', 'Work A');
		const second = createMockNode('n8n-nodes-base.splitInBatches', 'Loop B');
		const workB = createMockNode('n8n-nodes-base.httpRequest', 'Work B');
		const done = createMockNode('n8n-nodes-base.noOp', 'Done');
		const nodes = new Map<string, GraphNode>([
			[
				'Loop A',
				createGraphNode(
					first,
					new Map([
						[0, [conn('Loop B')]],
						[1, [conn('Work A')]],
					]),
				),
			],
			['Work A', createGraphNode(workA, new Map([[0, [conn('Loop A')]]]))],
			[
				'Loop B',
				createGraphNode(
					second,
					new Map([
						[0, [conn('Done')]],
						[1, [conn('Work B')]],
					]),
				),
			],
			['Work B', createGraphNode(workB, new Map([[0, [conn('Loop B')]]]))],
			['Done', createGraphNode(done)],
		]);

		expect(codesFor(first, nodes, 'Loop A')).toEqual([]);
		expect(codesFor(second, nodes, 'Loop B')).toEqual([]);
	});

	it('does not flag when each-batch output is unwired', () => {
		const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
		const nodes = new Map<string, GraphNode>([['Loop', createGraphNode(loop)]]);
		expect(codesFor(loop, nodes, 'Loop')).toEqual([]);
	});
});
