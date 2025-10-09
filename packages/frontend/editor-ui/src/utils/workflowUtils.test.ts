import { removeWorkflowExecutionData } from './workflowUtils';
import type { IWorkflowDb } from '@/Interface';
import type { INodeIssues } from 'n8n-workflow';

describe('workflowUtils', () => {
	describe('removeWorkflowExecutionData', () => {
		it('should return undefined if workflow is undefined', () => {
			expect(removeWorkflowExecutionData(undefined)).toBeUndefined();
		});

		it('should remove execution-related data from nodes and workflow-level pinData', () => {
			const mockWorkflow: IWorkflowDb = {
				id: 'test-workflow',
				name: 'Test Workflow',
				active: false,
				isArchived: false,
				createdAt: '2023-01-01T00:00:00Z',
				updatedAt: '2023-01-01T00:00:00Z',
				nodes: [
					{
						id: 'node1',
						name: 'Test Node',
						type: 'test-type',
						typeVersion: 1,
						position: [100, 100],
						parameters: {},
						// Execution-related data that should be removed
						issues: {} as INodeIssues,
						pinData: { someData: 'test' },
					},
					{
						id: 'node2',
						name: 'Clean Node',
						type: 'another-type',
						typeVersion: 1,
						position: [200, 200],
						parameters: {},
						// No execution data
					},
				],
				connections: {},
				// Workflow-level execution data that should be removed
				pinData: { node1: [{ json: { data: 'execution-result' } }] },
				versionId: '1.0',
			};

			const result = removeWorkflowExecutionData(mockWorkflow);

			expect(result).toBeDefined();
			expect(result!.nodes).toHaveLength(2);

			// First node should have execution data removed
			expect(result!.nodes[0]).toEqual({
				id: 'node1',
				name: 'Test Node',
				type: 'test-type',
				typeVersion: 1,
				position: [100, 100],
				parameters: {},
			});

			// Second node should remain unchanged (no execution data to remove)
			expect(result!.nodes[1]).toEqual({
				id: 'node2',
				name: 'Clean Node',
				type: 'another-type',
				typeVersion: 1,
				position: [200, 200],
				parameters: {},
			});

			// Workflow-level pinData should be removed
			expect(result!.pinData).toBeUndefined();

			// Workflow metadata should be preserved
			expect(result!.id).toBe('test-workflow');
			expect(result!.name).toBe('Test Workflow');
			expect(result!.connections).toEqual({});
		});

		it('should preserve all other node properties', () => {
			const mockWorkflow: IWorkflowDb = {
				id: 'test-workflow',
				name: 'Test Workflow',
				active: false,
				isArchived: false,
				createdAt: '2023-01-01T00:00:00Z',
				updatedAt: '2023-01-01T00:00:00Z',
				nodes: [
					{
						id: 'node1',
						name: 'Complex Node',
						type: 'complex-type',
						typeVersion: 2,
						position: [150, 250],
						parameters: { param1: 'value1', param2: { nested: true } },
						color: '#ff0000',
						notes: 'Some notes',
						disabled: true,
						// Execution data to be removed
						issues: {} as INodeIssues,
						pinData: { result: [{ json: { test: 'data' } }] },
					},
				],
				connections: {},
				versionId: '2.0',
			};

			const result = removeWorkflowExecutionData(mockWorkflow);

			expect(result!.nodes[0]).toEqual({
				id: 'node1',
				name: 'Complex Node',
				type: 'complex-type',
				typeVersion: 2,
				position: [150, 250],
				parameters: { param1: 'value1', param2: { nested: true } },
				color: '#ff0000',
				notes: 'Some notes',
				disabled: true,
			});
		});
	});
});
