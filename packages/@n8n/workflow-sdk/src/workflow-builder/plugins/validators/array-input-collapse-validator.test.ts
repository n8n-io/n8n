import { arrayInputCollapseValidator } from './array-input-collapse-validator';
import type { ConnectionTarget, GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	type: string,
	name: string,
	config: { parameters?: Record<string, unknown> } = {},
): NodeInstance<string, string, unknown> {
	return {
		type,
		name,
		version: '1',
		config: {
			parameters: config.parameters ?? {},
		},
	} as NodeInstance<string, string, unknown>;
}

function conn(node: string, index: number): ConnectionTarget {
	return { node, type: 'main', index };
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

function httpToCode(jsCode: string, upstreamType = 'n8n-nodes-base.httpRequest') {
	const http = createMockNode(upstreamType, 'Fetch', {
		parameters: { url: 'https://example.com' },
	});
	const httpConns = new Map<string, Map<number, ConnectionTarget[]>>();
	httpConns.set('main', new Map([[0, [conn('Pick', 0)]]]));
	const code = createMockNode('n8n-nodes-base.code', 'Pick', { parameters: { jsCode } });
	const nodes = new Map<string, GraphNode>();
	nodes.set('Fetch', createGraphNode(http, httpConns));
	nodes.set('Pick', createGraphNode(code));
	return { code, ctx: createContext(nodes) };
}

describe('arrayInputCollapseValidator', () => {
	it('has correct id', () => {
		expect(arrayInputCollapseValidator.id).toBe('core:array-input-collapse');
	});

	it('flags items[0].json + .slice fed by HTTP', () => {
		const js =
			'const storyIds = items[0].json;\nconst top = storyIds.slice(0, 3);\nreturn top.map(id => ({ json: { id } }));';
		const { code, ctx } = httpToCode(js);
		const issues = arrayInputCollapseValidator.validateNode(code, createGraphNode(code), ctx);
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe('ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM');
		expect(issues[0].nodeName).toBe('Pick');
		expect(issues[0].message).toContain('$input.all()');
	});

	it('flags $input.first().json.map applied directly', () => {
		const js = 'return $input.first().json.map(row => ({ json: { close: row[4] } }));';
		const { code, ctx } = httpToCode(js);
		expect(
			arrayInputCollapseValidator.validateNode(code, createGraphNode(code), ctx).map((i) => i.code),
		).toEqual(['ARRAY_INPUT_COLLAPSED_TO_FIRST_ITEM']);
	});

	it('does not flag the correct $input.all() pattern', () => {
		const js =
			'const ids = $input.all().map(i => i.json);\nreturn ids.slice(0, 3).map(id => ({ json: { id } }));';
		const { code, ctx } = httpToCode(js);
		expect(arrayInputCollapseValidator.validateNode(code, createGraphNode(code), ctx)).toEqual([]);
	});

	it('does not flag when upstream is not HTTP Request', () => {
		const js = 'const ids = items[0].json;\nreturn ids.slice(0, 3).map(id => ({ json: { id } }));';
		const { code, ctx } = httpToCode(js, 'n8n-nodes-base.set');
		expect(arrayInputCollapseValidator.validateNode(code, createGraphNode(code), ctx)).toEqual([]);
	});
});
