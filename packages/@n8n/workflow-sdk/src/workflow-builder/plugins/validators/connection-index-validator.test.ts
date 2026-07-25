import { connectionIndexValidator } from './connection-index-validator';
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
		version: '3',
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function conn(node: string, index = 0): ConnectionTarget {
	return { node, type: 'main', index };
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	mainOutputs: Map<number, ConnectionTarget[]> = new Map(),
): GraphNode {
	const connections = new Map<string, Map<number, ConnectionTarget[]>>();
	if (mainOutputs.size > 0) connections.set('main', mainOutputs);
	return { instance: node, connections };
}

function createContext(nodes: Map<string, GraphNode> = new Map()): PluginContext {
	return { nodes, workflowId: 't', workflowName: 'T', settings: {} };
}

describe('connectionIndexValidator', () => {
	it('flags IF output index > 1', () => {
		const node = createMockNode('n8n-nodes-base.if', 'Check');
		const issues = connectionIndexValidator.validateNode(
			node,
			createGraphNode(node, new Map([[2, [conn('X')]]])),
			createContext(),
		);
		expect(issues.map((i) => i.code)).toEqual(['INVALID_OUTPUT_INDEX']);
	});

	it('flags Switch output beyond rules', () => {
		const node = createMockNode('n8n-nodes-base.switch', 'Route', {
			rules: { values: [{}, {}] },
		});
		const issues = connectionIndexValidator.validateNode(
			node,
			createGraphNode(node, new Map([[3, [conn('X')]]])),
			createContext(),
		);
		expect(issues.map((i) => i.code)).toEqual(['INVALID_OUTPUT_INDEX']);
	});

	it('accepts Switch fallback extra output', () => {
		const node = createMockNode('n8n-nodes-base.switch', 'Route', {
			rules: { values: [{}, {}] },
			options: { fallbackOutput: 'extra' },
		});
		expect(
			connectionIndexValidator.validateNode(
				node,
				createGraphNode(
					node,
					new Map([
						[0, [conn('A')]],
						[1, [conn('B')]],
						[2, [conn('Fallback')]],
					]),
				),
				createContext(),
			),
		).toEqual([]);
	});
});
