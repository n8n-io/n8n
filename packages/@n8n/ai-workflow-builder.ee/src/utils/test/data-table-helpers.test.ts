import type { IConnection } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { SimpleWorkflow } from '../../types';
import {
	DATA_TABLE_NODE_TYPE,
	SET_NODE_TYPE,
	findPredecessorNodes,
	extractSetNodeFields,
	extractDataTableInfo,
} from '../data-table-helpers';

describe('data-table-helpers', () => {
	const createEmptyWorkflow = (): SimpleWorkflow => ({
		name: 'Test Workflow',
		nodes: [],
		connections: {},
	});

	describe('findPredecessorNodes', () => {
		it('should return empty array for workflow with no connections', () => {
			const workflow = createEmptyWorkflow();
			expect(findPredecessorNodes(workflow, 'Target')).toEqual([]);
		});

		it('should find single predecessor', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [],
				connections: {
					Source: {
						main: [[{ node: 'Target', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			};
			expect(findPredecessorNodes(workflow, 'Target')).toEqual(['Source']);
		});

		it('should find multiple predecessors', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [],
				connections: {
					Source1: {
						main: [[{ node: 'Target', type: NodeConnectionTypes.Main, index: 0 }]],
					},
					Source2: {
						main: [[{ node: 'Target', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			};
			const predecessors = findPredecessorNodes(workflow, 'Target');
			expect(predecessors).toContain('Source1');
			expect(predecessors).toContain('Source2');
			expect(predecessors).toHaveLength(2);
		});

		it('should handle null connections in array', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [],
				connections: {
					Source: {
						main: [
							null as unknown as IConnection[],
							[{ node: 'Target', type: NodeConnectionTypes.Main, index: 0 }],
						],
					},
				},
			};
			expect(findPredecessorNodes(workflow, 'Target')).toEqual(['Source']);
		});

		it('should not return nodes that do not connect to target', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [],
				connections: {
					Source: {
						main: [[{ node: 'OtherNode', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			};
			expect(findPredecessorNodes(workflow, 'Target')).toEqual([]);
		});
	});

	describe('extractSetNodeFields', () => {
		it('should return empty array when node not found', () => {
			const workflow = createEmptyWorkflow();
			expect(extractSetNodeFields(workflow, 'NonExistent')).toEqual([]);
		});

		it('should return empty array for non-Set node with same name', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'MyNode',
						type: 'n8n-nodes-base.code',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};
			expect(extractSetNodeFields(workflow, 'MyNode')).toEqual([]);
		});

		it('should return empty array when Set node has no assignments', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Set',
						type: SET_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};
			expect(extractSetNodeFields(workflow, 'Set')).toEqual([]);
		});

		it('should extract fields from Set node assignments', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Set',
						type: SET_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [
									{ name: 'email', type: 'string' },
									{ name: 'age', type: 'number' },
									{ name: 'active', type: 'boolean' },
								],
							},
						},
					},
				],
				connections: {},
			};

			const fields = extractSetNodeFields(workflow, 'Set');
			expect(fields).toEqual([
				{ name: 'email', type: 'text' },
				{ name: 'age', type: 'number' },
				{ name: 'active', type: 'boolean' },
			]);
		});

		it('should filter out assignments without name or type', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Set',
						type: SET_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [
									{ name: 'valid', type: 'string' },
									{ name: '', type: 'string' },
									{ name: 'noType', type: '' },
								],
							},
						},
					},
				],
				connections: {},
			};

			const fields = extractSetNodeFields(workflow, 'Set');
			expect(fields).toEqual([{ name: 'valid', type: 'text' }]);
		});
	});

	describe('extractDataTableInfo', () => {
		it('should return empty array for workflow with no Data Table nodes', () => {
			const workflow = createEmptyWorkflow();
			expect(extractDataTableInfo(workflow)).toEqual([]);
		});

		it('should extract basic Data Table info', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Data Table',
						type: DATA_TABLE_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							dataTableId: { __rl: true, mode: 'id', value: 'my_table' },
							operation: 'insert',
						},
					},
				],
				connections: {},
			};

			const info = extractDataTableInfo(workflow);
			expect(info).toHaveLength(1);
			expect(info[0]).toEqual({
				nodeName: 'Data Table',
				tableName: 'my_table',
				columns: [],
				setNodeName: undefined,
				operation: 'insert',
			});
		});

		it('should default to unknown table name when not specified', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Data Table',
						type: DATA_TABLE_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};

			const info = extractDataTableInfo(workflow);
			expect(info[0].tableName).toBeUndefined();
		});

		it('should default operation to insert', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Data Table',
						type: DATA_TABLE_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							dataTableId: { value: 'test' },
						},
					},
				],
				connections: {},
			};

			const info = extractDataTableInfo(workflow);
			expect(info[0].operation).toBe('insert');
		});

		it('should infer columns from predecessor Set node', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Prepare Data',
						type: SET_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							assignments: {
								assignments: [
									{ name: 'userId', type: 'number' },
									{ name: 'status', type: 'string' },
								],
							},
						},
					},
					{
						id: '2',
						name: 'Data Table',
						type: DATA_TABLE_NODE_TYPE,
						typeVersion: 1,
						position: [200, 0],
						parameters: {
							dataTableId: { value: 'users' },
							columns: {
								mappingMode: 'autoMapInputData',
							},
						},
					},
				],
				connections: {
					'Prepare Data': {
						main: [[{ node: 'Data Table', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			};

			const info = extractDataTableInfo(workflow);
			expect(info[0].columns).toEqual([
				{ name: 'userId', type: 'number' },
				{ name: 'status', type: 'text' },
			]);
			expect(info[0].setNodeName).toBe('Prepare Data');
		});

		it('should return null setNodeName when no Set node is found', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Data Table',
						type: DATA_TABLE_NODE_TYPE,
						typeVersion: 1,
						position: [200, 0],
						parameters: {
							dataTableId: { value: 'test' },
						},
					},
				],
				connections: {
					'HTTP Request': {
						main: [[{ node: 'Data Table', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			};

			const info = extractDataTableInfo(workflow);
			expect(info[0].columns).toEqual([]);
			expect(info[0].setNodeName).toBeUndefined();
		});

		it('should extract info from multiple Data Table nodes', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Users Table',
						type: DATA_TABLE_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {
							dataTableId: { value: 'users' },
							operation: 'insert',
						},
					},
					{
						id: '2',
						name: 'Orders Table',
						type: DATA_TABLE_NODE_TYPE,
						typeVersion: 1,
						position: [200, 0],
						parameters: {
							dataTableId: { value: 'orders' },
							operation: 'upsert',
						},
					},
				],
				connections: {},
			};

			const info = extractDataTableInfo(workflow);
			expect(info).toHaveLength(2);
			expect(info[0].tableName).toBe('users');
			expect(info[0].operation).toBe('insert');
			expect(info[1].tableName).toBe('orders');
			expect(info[1].operation).toBe('upsert');
		});
	});
});
