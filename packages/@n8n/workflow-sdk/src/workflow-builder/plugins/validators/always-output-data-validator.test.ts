import { alwaysOutputDataValidator } from './always-output-data-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	config: { parameters?: Record<string, unknown>; alwaysOutputData?: boolean } = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '2',
		config: {
			parameters: config.parameters ?? {},
			...(config.alwaysOutputData !== undefined
				? { alwaysOutputData: config.alwaysOutputData }
				: {}),
		},
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
	mapKey: string,
): string[] {
	return alwaysOutputDataValidator
		.validateNode(node, nodes.get(mapKey)!, createContext(nodes))
		.map((issue) => issue.code);
}

describe('alwaysOutputDataValidator', () => {
	it('has correct id', () => {
		expect(alwaysOutputDataValidator.id).toBe('core:always-output-data');
	});

	describe('ALWAYS_OUTPUT_DATA_NO_EFFECT', () => {
		it('flags alwaysOutputData on a leaf node', () => {
			const notify = createMockNode('n8n-nodes-base.slack', 'Notify', {
				alwaysOutputData: true,
			});
			const nodes = new Map<string, GraphNode>([['Notify', createGraphNode(notify)]]);

			expect(codesFor(notify, nodes, 'Notify')).toEqual(['ALWAYS_OUTPUT_DATA_NO_EFFECT']);
		});

		it('accepts alwaysOutputData on a node with downstream consumers', () => {
			const search = createMockNode('n8n-nodes-base.googleSheets', 'Search', {
				alwaysOutputData: true,
			});
			const notify = createMockNode('n8n-nodes-base.slack', 'Notify');
			const nodes = new Map<string, GraphNode>([
				['Search', createGraphNode(search, new Map([[0, [conn('Notify')]]]))],
				['Notify', createGraphNode(notify)],
			]);

			expect(codesFor(search, nodes, 'Search')).toEqual([]);
		});

		it('ignores nodes without the flag', () => {
			const notify = createMockNode('n8n-nodes-base.slack', 'Notify');
			const nodes = new Map<string, GraphNode>([['Notify', createGraphNode(notify)]]);

			expect(codesFor(notify, nodes, 'Notify')).toEqual([]);
		});
	});

	describe('EMPTY_ITEM_NOT_FILTERED', () => {
		it('flags a Code node counting items downstream of alwaysOutputData', () => {
			const search = createMockNode('n8n-nodes-base.googleSheets', 'Search', {
				alwaysOutputData: true,
			});
			const code = createMockNode('n8n-nodes-base.code', 'Summarize', {
				parameters: { jsCode: 'return [{ count: $input.all().length }];' },
			});
			const nodes = new Map<string, GraphNode>([
				['Search', createGraphNode(search, new Map([[0, [conn('Summarize')]]]))],
				['Summarize', createGraphNode(code)],
			]);

			expect(codesFor(code, nodes, 'Summarize')).toEqual(['EMPTY_ITEM_NOT_FILTERED']);
		});

		it('finds the flag several hops upstream', () => {
			const search = createMockNode('n8n-nodes-base.googleSheets', 'Search', {
				alwaysOutputData: true,
			});
			const set = createMockNode('n8n-nodes-base.set', 'Shape');
			const code = createMockNode('n8n-nodes-base.code', 'Summarize', {
				parameters: {
					jsCode: 'const rows = $input.all(); return [{ list: rows.map(r => r.json) }];',
				},
			});
			const nodes = new Map<string, GraphNode>([
				['Search', createGraphNode(search, new Map([[0, [conn('Shape')]]]))],
				['Shape', createGraphNode(set, new Map([[0, [conn('Summarize')]]]))],
				['Summarize', createGraphNode(code)],
			]);

			expect(codesFor(code, nodes, 'Summarize')).toEqual(['EMPTY_ITEM_NOT_FILTERED']);
		});

		it('accepts a Code node that drops empty-json items', () => {
			const search = createMockNode('n8n-nodes-base.googleSheets', 'Search', {
				alwaysOutputData: true,
			});
			const code = createMockNode('n8n-nodes-base.code', 'Summarize', {
				parameters: {
					jsCode:
						'const rows = $input.all().filter((i) => Object.keys(i.json).length > 0); return [{ count: rows.length }];',
				},
			});
			const nodes = new Map<string, GraphNode>([
				['Search', createGraphNode(search, new Map([[0, [conn('Summarize')]]]))],
				['Summarize', createGraphNode(code)],
			]);

			expect(codesFor(code, nodes, 'Summarize')).toEqual([]);
		});

		it('ignores a Code node with no alwaysOutputData upstream', () => {
			const search = createMockNode('n8n-nodes-base.googleSheets', 'Search');
			const code = createMockNode('n8n-nodes-base.code', 'Summarize', {
				parameters: { jsCode: 'return [{ count: $input.all().length }];' },
			});
			const nodes = new Map<string, GraphNode>([
				['Search', createGraphNode(search, new Map([[0, [conn('Summarize')]]]))],
				['Summarize', createGraphNode(code)],
			]);

			expect(codesFor(code, nodes, 'Summarize')).toEqual([]);
		});
	});
});
