import { dataTableColumnValidator } from './data-table-column-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	parameters: Record<string, unknown>,
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.dataTable',
		name: 'Write Table',
		version: '1',
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function ctx(): PluginContext {
	return { nodes: new Map(), workflowId: 't', workflowName: 'T', settings: {} };
}

describe('dataTableColumnValidator', () => {
	it('flags camelCase column keys', () => {
		const node = createMockNode({
			columns: { value: { dayName: 'Monday', score: 1 } },
		});
		expect(
			dataTableColumnValidator
				.validateNode(node, { instance: node, connections: new Map() } as GraphNode, ctx())
				.map((i) => i.code),
		).toEqual(['DATA_TABLE_CAMELCASE_COLUMN']);
	});

	it('accepts snake_case columns', () => {
		const node = createMockNode({
			columns: { value: { day_name: 'Monday' } },
		});
		expect(
			dataTableColumnValidator.validateNode(
				node,
				{ instance: node, connections: new Map() } as GraphNode,
				ctx(),
			),
		).toEqual([]);
	});
});
