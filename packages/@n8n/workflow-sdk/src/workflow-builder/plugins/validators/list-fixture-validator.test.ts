import { listFixtureValidator } from './list-fixture-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	config: {
		parameters?: Record<string, unknown>;
		output?: Array<Record<string, unknown>>;
	} = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '4',
		config: {
			parameters: config.parameters ?? {},
			...(config.output ? { output: config.output } : {}),
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
	return listFixtureValidator
		.validateNode(node, nodes.get(mapKey)!, createContext(nodes))
		.map((issue) => issue.code);
}

describe('listFixtureValidator', () => {
	it('has correct id', () => {
		expect(listFixtureValidator.id).toBe('core:list-fixture');
	});

	describe('HTTP_ENVELOPE_NOT_UNWRAPPED', () => {
		it('flags an envelope fixture consumed by a loop with no unwrap', () => {
			const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch Orders', {
				output: [{ orders: [{ id: 1 }, { id: 2 }], total: 2 }],
			});
			const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
			const nodes = new Map<string, GraphNode>([
				['Fetch Orders', createGraphNode(http, new Map([[0, [conn('Loop')]]]))],
				['Loop', createGraphNode(loop)],
			]);

			expect(codesFor(http, nodes, 'Fetch Orders')).toEqual(['HTTP_ENVELOPE_NOT_UNWRAPPED']);
		});

		it('accepts an envelope unwrapped by Split Out before the loop', () => {
			const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch Orders', {
				output: [{ orders: [{ id: 1 }, { id: 2 }] }],
			});
			const split = createMockNode('n8n-nodes-base.splitOut', 'Split Orders', {
				parameters: { fieldToSplitOut: 'orders' },
			});
			const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
			const nodes = new Map<string, GraphNode>([
				['Fetch Orders', createGraphNode(http, new Map([[0, [conn('Split Orders')]]]))],
				['Split Orders', createGraphNode(split, new Map([[0, [conn('Loop')]]]))],
				['Loop', createGraphNode(loop)],
			]);

			expect(codesFor(http, nodes, 'Fetch Orders')).toEqual([]);
		});

		it('accepts an envelope unwrapped by a Code node that maps the array field', () => {
			const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch Orders', {
				output: [{ orders: [{ id: 1 }, { id: 2 }] }],
			});
			const code = createMockNode('n8n-nodes-base.code', 'Unwrap', {
				parameters: { jsCode: 'return $json.orders.map((o) => ({ json: o }));' },
			});
			const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
			const nodes = new Map<string, GraphNode>([
				['Fetch Orders', createGraphNode(http, new Map([[0, [conn('Unwrap')]]]))],
				['Unwrap', createGraphNode(code, new Map([[0, [conn('Loop')]]]))],
				['Loop', createGraphNode(loop)],
			]);

			expect(codesFor(http, nodes, 'Fetch Orders')).toEqual([]);
		});

		it('flags per-item Code consuming the envelope directly', () => {
			const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch Orders', {
				output: [{ orders: [{ id: 1 }] }],
			});
			const code = createMockNode('n8n-nodes-base.code', 'Per Item', {
				parameters: { mode: 'runOnceForEachItem', jsCode: 'return $json;' },
			});
			const nodes = new Map<string, GraphNode>([
				['Fetch Orders', createGraphNode(http, new Map([[0, [conn('Per Item')]]]))],
				['Per Item', createGraphNode(code)],
			]);

			expect(codesFor(http, nodes, 'Fetch Orders')).toEqual(['HTTP_ENVELOPE_NOT_UNWRAPPED']);
		});

		it('ignores non-collection sources with an array field', () => {
			const set = createMockNode('n8n-nodes-base.set', 'Build Payload', {
				output: [{ tags: ['a', 'b'] }],
			});
			const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
			const nodes = new Map<string, GraphNode>([
				['Build Payload', createGraphNode(set, new Map([[0, [conn('Loop')]]]))],
				['Loop', createGraphNode(loop)],
			]);

			expect(codesFor(set, nodes, 'Build Payload')).toEqual([]);
		});
	});

	describe('SINGLE_ITEM_LIST_FIXTURE', () => {
		it('flags a single-item collection fixture feeding a loop', () => {
			const http = createMockNode('n8n-nodes-base.httpRequest', 'Search', {
				output: [{ id: 1, title: 'One' }],
			});
			const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
			const nodes = new Map<string, GraphNode>([
				['Search', createGraphNode(http, new Map([[0, [conn('Loop')]]]))],
				['Loop', createGraphNode(loop)],
			]);

			expect(codesFor(http, nodes, 'Search')).toEqual(['SINGLE_ITEM_LIST_FIXTURE']);
		});

		it('flags a getAll operation whose downstream Code reads $input.first()', () => {
			const list = createMockNode('n8n-nodes-base.googleSheets', 'Get Rows', {
				parameters: { operation: 'getAll' },
				output: [{ name: 'Ada' }],
			});
			const code = createMockNode('n8n-nodes-base.code', 'Format', {
				parameters: { jsCode: 'const row = $input.first().json; return [{ row }];' },
			});
			const nodes = new Map<string, GraphNode>([
				['Get Rows', createGraphNode(list, new Map([[0, [conn('Format')]]]))],
				['Format', createGraphNode(code)],
			]);

			expect(codesFor(list, nodes, 'Get Rows')).toEqual(['SINGLE_ITEM_LIST_FIXTURE']);
		});

		it('accepts a collection fixture with two or more items', () => {
			const http = createMockNode('n8n-nodes-base.httpRequest', 'Search', {
				output: [{ id: 1 }, { id: 2 }],
			});
			const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
			const nodes = new Map<string, GraphNode>([
				['Search', createGraphNode(http, new Map([[0, [conn('Loop')]]]))],
				['Loop', createGraphNode(loop)],
			]);

			expect(codesFor(http, nodes, 'Search')).toEqual([]);
		});

		it('ignores a single-record source with no collection signal', () => {
			const http = createMockNode('n8n-nodes-base.gmail', 'Get Message', {
				parameters: { operation: 'get' },
				output: [{ id: 'abc' }],
			});
			const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
			const nodes = new Map<string, GraphNode>([
				['Get Message', createGraphNode(http, new Map([[0, [conn('Loop')]]]))],
				['Loop', createGraphNode(loop)],
			]);

			expect(codesFor(http, nodes, 'Get Message')).toEqual([]);
		});

		it('ignores nodes with no declared output', () => {
			const http = createMockNode('n8n-nodes-base.httpRequest', 'Search');
			const loop = createMockNode('n8n-nodes-base.splitInBatches', 'Loop');
			const nodes = new Map<string, GraphNode>([
				['Search', createGraphNode(http, new Map([[0, [conn('Loop')]]]))],
				['Loop', createGraphNode(loop)],
			]);

			expect(codesFor(http, nodes, 'Search')).toEqual([]);
		});
	});
});
