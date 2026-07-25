import { splitInBatchesLoopbackValidator } from './split-in-batches-loopback-validator';
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

describe('splitInBatchesLoopbackValidator', () => {
	it('has correct id', () => {
		expect(splitInBatchesLoopbackValidator.id).toBe('core:split-in-batches-loopback');
	});

	it('flags each-batch branch that never loops back', () => {
		const sib = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
		const work = createMockNode('n8n-nodes-base.httpRequest', 'Work');
		const done = createMockNode('n8n-nodes-base.noOp', 'Done');
		const nodes = new Map<string, GraphNode>([
			[
				'Loop',
				createGraphNode(
					sib,
					new Map([
						[0, [conn('Done')]],
						[1, [conn('Work')]],
					]),
				),
			],
			['Work', createGraphNode(work)],
			['Done', createGraphNode(done)],
		]);

		expect(
			splitInBatchesLoopbackValidator
				.validateNode(sib, nodes.get('Loop')!, createContext(nodes))
				.map((i) => i.code),
		).toEqual(['SPLIT_IN_BATCHES_NO_LOOPBACK']);
	});

	it('accepts each-batch chain that loops back to the SIB node', () => {
		const sib = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
		const work = createMockNode('n8n-nodes-base.httpRequest', 'Work');
		const done = createMockNode('n8n-nodes-base.noOp', 'Done');
		const nodes = new Map<string, GraphNode>([
			[
				'Loop',
				createGraphNode(
					sib,
					new Map([
						[0, [conn('Done')]],
						[1, [conn('Work')]],
					]),
				),
			],
			['Work', createGraphNode(work, new Map([[0, [conn('Loop')]]]))],
			['Done', createGraphNode(done)],
		]);

		expect(
			splitInBatchesLoopbackValidator.validateNode(sib, nodes.get('Loop')!, createContext(nodes)),
		).toEqual([]);
	});

	it('does not flag when each-batch output is unwired', () => {
		const sib = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
		const nodes = new Map<string, GraphNode>([['Loop', createGraphNode(sib)]]);
		expect(
			splitInBatchesLoopbackValidator.validateNode(sib, nodes.get('Loop')!, createContext(nodes)),
		).toEqual([]);
	});
});
