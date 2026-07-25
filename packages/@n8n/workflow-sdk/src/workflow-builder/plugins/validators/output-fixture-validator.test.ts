import { outputFixtureValidator } from './output-fixture-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	config: {
		parameters?: Record<string, unknown>;
		output?: Array<Record<string, unknown>>;
		credentials?: Record<string, unknown>;
	} = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1',
		config: {
			parameters: config.parameters ?? {},
			...(config.output ? { output: config.output } : {}),
			...(config.credentials ? { credentials: config.credentials } : {}),
		},
	} as NodeInstance<string, string, unknown>;
}

function conn(node: string): ConnectionTarget {
	return { node, type: 'main', index: 0 };
}

function createGraphNode(
	node: NodeInstance<string, string, unknown>,
	connections: Map<string, Map<number, ConnectionTarget[]>> = new Map(),
): GraphNode {
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

describe('outputFixtureValidator', () => {
	it('has correct id', () => {
		expect(outputFixtureValidator.id).toBe('core:output-fixture');
	});

	it('flags output wrapped in { json: ... } envelope', () => {
		const node = createMockNode('n8n-nodes-base.httpRequest', 'Fetch', {
			output: [{ json: { id: 1 } }],
		});
		const issues = outputFixtureValidator.validateNode(
			node,
			createGraphNode(node),
			createContext(new Map([['Fetch', createGraphNode(node)]])),
		);
		expect(issues).toContainEqual(
			expect.objectContaining({ code: 'OUTPUT_FIXTURE_ITEM_ENVELOPE' }),
		);
	});

	it('accepts raw $json output fixtures', () => {
		const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch', {
			output: [{ id: 1 }],
		});
		const set = createMockNode('n8n-nodes-base.set', 'Map', {
			parameters: {
				keepOnlySet: true,
				values: { string: [{ name: 'id', value: '={{ $json.id }}' }] },
			},
		});
		const httpConns = new Map<string, Map<number, ConnectionTarget[]>>();
		httpConns.set('main', new Map([[0, [conn('Map')]]]));
		const nodes = new Map<string, GraphNode>([
			['Fetch', createGraphNode(http, httpConns)],
			['Map', createGraphNode(set)],
		]);
		expect(
			outputFixtureValidator.validateNode(http, nodes.get('Fetch')!, createContext(nodes)),
		).toEqual([]);
	});

	it('flags HTTP Request without output when downstream reads $json', () => {
		const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch');
		const set = createMockNode('n8n-nodes-base.set', 'Map', {
			parameters: {
				assignments: {
					assignments: [{ id: '1', name: 'id', value: '={{ $json.id }}', type: 'string' }],
				},
			},
		});
		const httpConns = new Map<string, Map<number, ConnectionTarget[]>>();
		httpConns.set('main', new Map([[0, [conn('Map')]]]));
		const nodes = new Map<string, GraphNode>([
			['Fetch', createGraphNode(http, httpConns)],
			['Map', createGraphNode(set)],
		]);
		expect(
			outputFixtureValidator
				.validateNode(http, nodes.get('Fetch')!, createContext(nodes))
				.map((i) => i.code),
		).toEqual(['MISSING_OUTPUT_FIXTURE']);
	});

	it('does not flag manualTrigger without output', () => {
		const trigger = createMockNode('n8n-nodes-base.manualTrigger', 'Start');
		const set = createMockNode('n8n-nodes-base.set', 'Map', {
			parameters: {
				assignments: {
					assignments: [{ id: '1', name: 'x', value: '={{ $json.x }}', type: 'string' }],
				},
			},
		});
		const triggerConns = new Map<string, Map<number, ConnectionTarget[]>>();
		triggerConns.set('main', new Map([[0, [conn('Map')]]]));
		const nodes = new Map<string, GraphNode>([
			['Start', createGraphNode(trigger, triggerConns)],
			['Map', createGraphNode(set)],
		]);
		expect(
			outputFixtureValidator.validateNode(trigger, nodes.get('Start')!, createContext(nodes)),
		).toEqual([]);
	});

	it('does not flag HTTP without output when nothing downstream reads fields', () => {
		const http = createMockNode('n8n-nodes-base.httpRequest', 'Fetch');
		const noop = createMockNode('n8n-nodes-base.noOp', 'Done');
		const httpConns = new Map<string, Map<number, ConnectionTarget[]>>();
		httpConns.set('main', new Map([[0, [conn('Done')]]]));
		const nodes = new Map<string, GraphNode>([
			['Fetch', createGraphNode(http, httpConns)],
			['Done', createGraphNode(noop)],
		]);
		expect(
			outputFixtureValidator.validateNode(http, nodes.get('Fetch')!, createContext(nodes)),
		).toEqual([]);
	});
});
