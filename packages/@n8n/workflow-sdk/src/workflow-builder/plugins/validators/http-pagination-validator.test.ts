import { httpPaginationValidator } from './http-pagination-validator';
import type { GraphNode, IDataObject, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	config: {
		parameters?: Record<string, unknown>;
		output?: IDataObject[];
	} = {},
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.httpRequest',
		name: 'Fetch Orders',
		version: '4.2',
		config: {
			parameters: config.parameters ?? {},
			output: config.output,
		},
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return { instance: node, connections: new Map() };
}

function createContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};
}

function paginationParams(
	completeWhen: string | undefined,
	mode = 'updateAParameterInEachRequest',
) {
	return {
		url: 'https://api.example.com/orders',
		options: {
			pagination: {
				pagination: {
					paginationMode: mode,
					...(completeWhen !== undefined ? { paginationCompleteWhen: completeWhen } : {}),
				},
			},
		},
	};
}

describe('httpPaginationValidator', () => {
	it('has correct id', () => {
		expect(httpPaginationValidator.id).toBe('core:http-pagination');
	});

	it('flags responseIsEmpty with an envelope output shape', () => {
		const node = createMockNode({
			parameters: paginationParams('responseIsEmpty'),
			output: [{ orders: [{ id: '1' }], nextPage: '2' }],
		});
		const issues = httpPaginationValidator.validateNode(
			node,
			createGraphNode(node),
			createContext(),
		);
		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe('HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY');
		expect(issues[0].message).toContain("paginationCompleteWhen: 'other'");
		expect(issues[0].message).toContain('$response.body.orders.length === 0');
	});

	it('flags when paginationCompleteWhen is defaulted (omitted)', () => {
		const node = createMockNode({
			parameters: paginationParams(undefined),
			output: [{ data: [] }],
		});
		const issues = httpPaginationValidator.validateNode(
			node,
			createGraphNode(node),
			createContext(),
		);
		expect(issues.map((i) => i.code)).toEqual(['HTTP_PAGINATION_ENVELOPE_RESPONSE_IS_EMPTY']);
	});

	it('does not flag when completeWhen is other', () => {
		const node = createMockNode({
			parameters: paginationParams('other'),
			output: [{ orders: [] }],
		});
		expect(
			httpPaginationValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('does not flag when pagination is off', () => {
		const node = createMockNode({
			parameters: paginationParams('responseIsEmpty', 'off'),
			output: [{ orders: [] }],
		});
		expect(
			httpPaginationValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('does not flag without declared output', () => {
		const node = createMockNode({
			parameters: paginationParams('responseIsEmpty'),
		});
		expect(
			httpPaginationValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('does not flag a bare-record output with no array field', () => {
		const node = createMockNode({
			parameters: paginationParams('responseIsEmpty'),
			output: [{ id: '1', name: 'Ada' }],
		});
		expect(
			httpPaginationValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});
});
