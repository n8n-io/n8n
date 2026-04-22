import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { DATA_TABLE_NODE_TYPE, SET_NODE_TYPE } from '@/utils/data-table-helpers';

import { validateConnections } from './connections';

describe('validateConnections', () => {
	const createMockNodeType = (type: string): INodeTypeDescription =>
		({
			name: type,
			displayName: type,
			group: ['transform'],
			version: 1,
			description: 'Mock node',
			defaults: { name: type },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [],
		}) as unknown as INodeTypeDescription;

	const mockNodeTypes: INodeTypeDescription[] = [
		createMockNodeType(DATA_TABLE_NODE_TYPE),
		createMockNodeType(SET_NODE_TYPE),
		createMockNodeType('n8n-nodes-base.httpRequest'),
	];

	describe('data-table-missing-set-node validation', () => {
		it('should return violation when Data Table row column operation has no Set node predecessor', () => {
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
						name: 'Store Data',
						type: DATA_TABLE_NODE_TYPE,
						typeVersion: 1,
						position: [200, 0],
						parameters: {
							operation: 'insert',
						},
					},
				],
				connections: {
					'HTTP Request': {
						main: [[{ node: 'Store Data', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			};

			const violations = validateConnections(workflow, mockNodeTypes);

			expect(violations).toContainEqual(
				expect.objectContaining({
					name: 'data-table-missing-set-node',
					type: 'major',
				}),
			);
		});

		it('should NOT return violation when Data Table has Set node predecessor', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Prepare Data',
						type: SET_NODE_TYPE,
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: '2',
						name: 'Store Data',
						type: DATA_TABLE_NODE_TYPE,
						typeVersion: 1,
						position: [200, 0],
						parameters: {
							operation: 'insert',
						},
					},
				],
				connections: {
					'Prepare Data': {
						main: [[{ node: 'Store Data', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			};

			const violations = validateConnections(workflow, mockNodeTypes);

			expect(violations).not.toContainEqual(
				expect.objectContaining({
					name: 'data-table-missing-set-node',
				}),
			);
		});
	});
});
