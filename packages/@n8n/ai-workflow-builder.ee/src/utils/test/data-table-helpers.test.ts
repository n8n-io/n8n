import { NodeConnectionTypes } from 'n8n-workflow';

import type { SimpleWorkflow } from '../../types';
import {
	DATA_TABLE_NODE_TYPE,
	SET_NODE_TYPE,
	extractSetNodeFields,
	extractDataTableInfo,
} from '../data-table-helpers';

describe('data-table-helpers', () => {
	const createEmptyWorkflow = (): SimpleWorkflow => ({
		name: 'Test Workflow',
		nodes: [],
		connections: {},
	});

	describe('extractSetNodeFields', () => {
		it('should return empty array when node not found', () => {
			const workflow = createEmptyWorkflow();
			expect(extractSetNodeFields(workflow, 'NonExistent')).toEqual([]);
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
							operation: 'insert',
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
	});
});
