import {
	removeWorkflowExecutionData,
	convertWorkflowTagsToIds,
	sortNodesByExecutionOrder,
} from './workflowUtils';
import type { IWorkflowDb } from '@/Interface';
import type { INodeIssues } from 'n8n-workflow';

describe('workflowUtils', () => {
	describe('convertWorkflowTagsToIds', () => {
		it('should return empty array for undefined tags', () => {
			expect(convertWorkflowTagsToIds(undefined)).toEqual([]);
		});

		it('should return empty array for empty array', () => {
			expect(convertWorkflowTagsToIds([])).toEqual([]);
		});

		it('should return the same array if tags are already string IDs', () => {
			const stringTags = ['tag1', 'tag2', 'tag3'];
			expect(convertWorkflowTagsToIds(stringTags)).toEqual(stringTags);
		});

		it('should convert ITag objects to string IDs', () => {
			const objectTags = [
				{ id: 'tag1', name: 'Tag 1' },
				{ id: 'tag2', name: 'Tag 2' },
				{ id: 'tag3', name: 'Tag 3' },
			];
			expect(convertWorkflowTagsToIds(objectTags)).toEqual(['tag1', 'tag2', 'tag3']);
		});
	});

	describe('removeWorkflowExecutionData', () => {
		it('should return undefined if workflow is undefined', () => {
			expect(removeWorkflowExecutionData(undefined)).toBeUndefined();
		});

		it('should remove execution-related data from nodes and workflow-level pinData', () => {
			const mockWorkflow: IWorkflowDb = {
				id: 'test-workflow',
				name: 'Test Workflow',
				active: false,
				activeVersionId: null,
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
				activeVersionId: null,
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

	describe('sortNodesByExecutionOrder', () => {
		const makeNode = (name: string, position: [number, number], isTrigger = false) => ({
			node: { name, position },
			isTrigger,
		});

		it('should return empty array for empty input', () => {
			expect(sortNodesByExecutionOrder([], {})).toEqual([]);
		});

		it('should return empty array when there are no triggers', () => {
			const nodeA = makeNode('A', [200, 0]);
			const nodeB = makeNode('B', [100, 0]);

			expect(sortNodesByExecutionOrder([nodeA, nodeB], {})).toEqual([]);
		});

		it('should sort a linear chain by execution order', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const nodeA = makeNode('A', [100, 0]);
			const nodeB = makeNode('B', [200, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
				A: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeB, nodeA, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A', 'B']);
		});

		it('should drop orphaned nodes not connected to any trigger', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const connected = makeNode('Connected', [100, 0]);
			const orphaned = makeNode('Orphaned', [50, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'Connected', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([orphaned, connected, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'Connected']);
		});

		it('should group nodes by trigger, processing triggers by X position', () => {
			const triggerA = makeNode('TriggerA', [200, 0], true);
			const triggerB = makeNode('TriggerB', [0, 0], true);
			const nodeA = makeNode('A', [300, 0]);
			const nodeB = makeNode('B', [100, 0]);

			const connections = {
				TriggerA: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
				TriggerB: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeA, triggerA, nodeB, triggerB], connections);

			expect(result.map((n) => n.node.name)).toEqual(['TriggerB', 'B', 'TriggerA', 'A']);
		});

		it('should handle cycles gracefully', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const nodeA = makeNode('A', [100, 0]);
			const nodeB = makeNode('B', [200, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
				A: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
				B: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeB, nodeA, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A', 'B']);
		});

		it('should traverse through intermediate nodes not in the input list', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const nodeC = makeNode('C', [300, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'IntermediateNode', type: 'main' as const, index: 0 }]] },
				IntermediateNode: { main: [[{ node: 'C', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeC, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'C']);
		});

		it('should follow depth-first order, completing each branch before the next', () => {
			const trigger = makeNode('Trigger', [0, 0], true);
			const nodeA = makeNode('A', [100, 0]);
			const nodeB = makeNode('B', [200, 0]);
			const nodeC = makeNode('C', [100, 100]);
			const nodeD = makeNode('D', [200, 100]);

			const connections = {
				Trigger: {
					main: [
						[
							{ node: 'A', type: 'main' as const, index: 0 },
							{ node: 'C', type: 'main' as const, index: 0 },
						],
					],
				},
				A: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
				C: { main: [[{ node: 'D', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeD, nodeC, nodeB, nodeA, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A', 'B', 'C', 'D']);
		});

		it('should not duplicate nodes reachable from multiple triggers', () => {
			const triggerA = makeNode('TriggerA', [0, 0], true);
			const triggerB = makeNode('TriggerB', [100, 100], true);
			const shared = makeNode('Shared', [200, 50]);

			const connections = {
				TriggerA: { main: [[{ node: 'Shared', type: 'main' as const, index: 0 }]] },
				TriggerB: { main: [[{ node: 'Shared', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([shared, triggerB, triggerA], connections);

			expect(result.map((n) => n.node.name)).toEqual(['TriggerA', 'Shared', 'TriggerB']);
		});
	});
});
