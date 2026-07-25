import { sheetsMatchColumnValidator } from './sheets-match-column-validator';
import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';

function createMockNode(
	parameters: Record<string, unknown>,
	version = '4.5',
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.googleSheets',
		name: 'Update Sheet',
		version,
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function createGraphNode(node: NodeInstance<string, string, unknown>): GraphNode {
	return { instance: node, connections: new Map() };
}

function createContext(): PluginContext {
	return {
		nodes: new Map(),
		workflowId: 'test',
		workflowName: 'Test',
		settings: {},
	};
}

describe('sheetsMatchColumnValidator', () => {
	it('flags matchingColumns missing from schema', () => {
		const node = createMockNode({
			operation: 'update',
			columns: {
				mappingMode: 'defineBelow',
				matchingColumns: ['email'],
				schema: [{ id: 'name', displayName: 'name' }],
				value: { name: 'Ada' },
			},
		});
		expect(
			sheetsMatchColumnValidator
				.validateNode(node, createGraphNode(node), createContext())
				.map((i) => i.code),
		).toEqual(['SHEETS_MATCH_COLUMN_NOT_IN_SCHEMA']);
	});

	it('accepts match column present in schema', () => {
		const node = createMockNode({
			operation: 'appendOrUpdate',
			columns: {
				mappingMode: 'defineBelow',
				matchingColumns: ['email'],
				schema: [
					{ id: 'email', displayName: 'email' },
					{ id: 'name', displayName: 'name' },
				],
				value: { email: 'a@b.com', name: 'Ada' },
			},
		});
		expect(
			sheetsMatchColumnValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('ignores non-match operations', () => {
		const node = createMockNode({ operation: 'append', columns: {} });
		expect(
			sheetsMatchColumnValidator.validateNode(node, createGraphNode(node), createContext()),
		).toEqual([]);
	});

	it('no longer accepts displayName as a match-column alias', () => {
		const node = createMockNode({
			operation: 'update',
			columns: {
				mappingMode: 'defineBelow',
				matchingColumns: ['Email'],
				schema: [{ id: 'email', displayName: 'Email' }],
				value: { email: 'a@b.com' },
			},
		});
		expect(
			sheetsMatchColumnValidator
				.validateNode(node, createGraphNode(node), createContext())
				.map((i) => i.code),
		).toEqual(['SHEETS_SCHEMA_ID_NOT_HEADER', 'SHEETS_MATCH_COLUMN_NOT_IN_SCHEMA']);
	});

	describe('column schema', () => {
		it('flags append schema ids that diverge from their displayName', () => {
			const node = createMockNode({
				operation: 'append',
				columns: {
					mappingMode: 'defineBelow',
					schema: [
						{ id: 'reservationNumber', displayName: 'Reservation Number' },
						{ id: 'customerName', displayName: 'Customer Name' },
					],
					value: {
						reservationNumber: '={{ $json.reservationNumber }}',
						customerName: '={{ $json.customerName }}',
					},
				},
			});
			const issues = sheetsMatchColumnValidator.validateNode(
				node,
				createGraphNode(node),
				createContext(),
			);
			expect(issues.map((i) => i.code)).toEqual(['SHEETS_SCHEMA_ID_NOT_HEADER']);
			expect(issues[0].message).toContain('reservationNumber != Reservation Number');
			expect(issues[0].parameterPath).toBe('columns.schema');
		});

		it('caps the examples it lists', () => {
			const node = createMockNode({
				operation: 'append',
				columns: {
					mappingMode: 'defineBelow',
					schema: ['one', 'two', 'three', 'four', 'five'].map((n) => ({
						id: n,
						displayName: n.toUpperCase(),
					})),
				},
			});
			const [issue] = sheetsMatchColumnValidator.validateNode(
				node,
				createGraphNode(node),
				createContext(),
			);
			expect(issue.message).toContain('+2 more');
			expect(issue.message).not.toContain('four != FOUR');
		});

		it('accepts ids that are the header text', () => {
			const node = createMockNode({
				operation: 'append',
				columns: {
					mappingMode: 'defineBelow',
					schema: [
						{ id: 'Reservation Number', displayName: 'Reservation Number' },
						{ id: 'Customer Name', displayName: 'Customer Name' },
					],
					value: {
						'Reservation Number': '={{ $json.reservationNumber }}',
						'Customer Name': '={{ $json.customerName }}',
					},
				},
			});
			expect(
				sheetsMatchColumnValidator.validateNode(node, createGraphNode(node), createContext()),
			).toEqual([]);
		});

		it('flags value keys absent from the schema', () => {
			const node = createMockNode({
				operation: 'append',
				columns: {
					mappingMode: 'defineBelow',
					schema: [{ id: 'Email', displayName: 'Email' }],
					value: { Email: 'a@b.com', phone: '123' },
				},
			});
			const issues = sheetsMatchColumnValidator.validateNode(
				node,
				createGraphNode(node),
				createContext(),
			);
			expect(issues.map((i) => i.code)).toEqual(['SHEETS_VALUE_KEY_NOT_IN_SCHEMA']);
			expect(issues[0].message).toContain('phone');
		});

		it('skips autoMapInputData, which has no hand-written schema', () => {
			const node = createMockNode({
				operation: 'append',
				columns: { mappingMode: 'autoMapInputData', value: {} },
			});
			expect(
				sheetsMatchColumnValidator.validateNode(node, createGraphNode(node), createContext()),
			).toEqual([]);
		});

		it('ignores the schema on typeVersion 3', () => {
			const node = createMockNode(
				{
					operation: 'append',
					columns: {
						mappingMode: 'defineBelow',
						schema: [{ id: 'customerName', displayName: 'Customer Name' }],
					},
				},
				'3',
			);
			expect(
				sheetsMatchColumnValidator.validateNode(node, createGraphNode(node), createContext()),
			).toEqual([]);
		});
	});
});
