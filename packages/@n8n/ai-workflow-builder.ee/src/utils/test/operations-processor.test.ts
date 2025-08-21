import type { INode, IConnections } from 'n8n-workflow';

import { createNode, createWorkflow } from '../../../test/test-utils';
import type { SimpleWorkflow, WorkflowOperation } from '../../types/workflow';
import type { WorkflowState } from '../../workflow-state';
import { applyOperations, processOperations } from '../operations-processor';

describe('operations-processor', () => {
	describe('applyOperations', () => {
		let baseWorkflow: SimpleWorkflow;
		let node1: INode;
		let node2: INode;
		let node3: INode;

		beforeEach(() => {
			node1 = createNode({ id: 'node1', name: 'Node 1', position: [100, 100] });
			node2 = createNode({ id: 'node2', name: 'Node 2', position: [300, 100] });
			node3 = createNode({ id: 'node3', name: 'Node 3', position: [500, 100] });

			baseWorkflow = {
				name: 'Test Workflow',
				nodes: [node1, node2, node3],
				connections: {
					node1: {
						main: [[{ node: 'node2', type: 'main', index: 0 }]],
					},
					node2: {
						main: [[{ node: 'node3', type: 'main', index: 0 }]],
					},
				},
			};
		});

		describe('clear operation', () => {
			it('should reset workflow to empty state', () => {
				const operations: WorkflowOperation[] = [{ type: 'clear' }];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toEqual([]);
				expect(result.connections).toEqual({});
			});

			it('should clear even complex workflows', () => {
				// Add more connections
				baseWorkflow.connections.node1.ai_tool = [[{ node: 'node3', type: 'ai_tool', index: 0 }]];

				const operations: WorkflowOperation[] = [{ type: 'clear' }];
				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toEqual([]);
				expect(result.connections).toEqual({});
			});
		});

		describe('removeNode operation', () => {
			it('should remove single node and its connections', () => {
				const operations: WorkflowOperation[] = [{ type: 'removeNode', nodeIds: ['node2'] }];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(2);
				expect(result.nodes.find((n) => n.id === 'node2')).toBeUndefined();
				// node1's connection to node2 is filtered out, leaving empty array
				expect(result.connections.node1).toEqual({ main: [[]] });
				// node2 is removed entirely as source
				expect(result.connections.node2).toBeUndefined();
			});

			it('should remove multiple nodes', () => {
				const operations: WorkflowOperation[] = [
					{ type: 'removeNode', nodeIds: ['node1', 'node3'] },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(1);
				expect(result.nodes[0].id).toBe('node2');
				// node2's connection to node3 is filtered out, leaving empty array
				expect(result.connections).toEqual({
					node2: { main: [[]] },
				});
			});

			it('should handle non-existent node IDs gracefully', () => {
				const operations: WorkflowOperation[] = [{ type: 'removeNode', nodeIds: ['non-existent'] }];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(3);
				expect(result.connections).toEqual(baseWorkflow.connections);
			});

			it('should clean up connections to removed nodes', () => {
				// Add more complex connections
				baseWorkflow.connections.node3 = {
					main: [[{ node: 'node2', type: 'main', index: 1 }]],
				};

				const operations: WorkflowOperation[] = [{ type: 'removeNode', nodeIds: ['node2'] }];

				const result = applyOperations(baseWorkflow, operations);

				// node1's connection to node2 is filtered out, leaving empty array
				expect(result.connections.node1).toEqual({ main: [[]] });
				expect(result.connections.node3).toBeDefined();
				expect(result.connections.node3.main[0]).toEqual([]);
			});
		});

		describe('addNodes operation', () => {
			it('should add new nodes', () => {
				const newNode = createNode({ id: 'node4', name: 'Node 4', position: [700, 100] });
				const operations: WorkflowOperation[] = [{ type: 'addNodes', nodes: [newNode] }];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(4);
				expect(result.nodes.find((n) => n.id === 'node4')).toEqual(newNode);
			});

			it('should update existing nodes by ID', () => {
				const updatedNode = createNode({
					id: 'node2',
					name: 'Updated Node 2',
					position: [400, 200],
				});
				const operations: WorkflowOperation[] = [{ type: 'addNodes', nodes: [updatedNode] }];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(3);
				const node = result.nodes.find((n) => n.id === 'node2');
				expect(node?.name).toBe('Updated Node 2');
				expect(node?.position).toEqual([400, 200]);
			});

			it('should handle multiple nodes with same ID (keep latest)', () => {
				const node2a = createNode({ id: 'node2', name: 'Node 2A' });
				const node2b = createNode({ id: 'node2', name: 'Node 2B' });
				const operations: WorkflowOperation[] = [{ type: 'addNodes', nodes: [node2a, node2b] }];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(3);
				const node = result.nodes.find((n) => n.id === 'node2');
				expect(node?.name).toBe('Node 2B');
			});
		});

		describe('updateNode operation', () => {
			it('should update existing node properties', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'updateNode',
						nodeId: 'node2',
						updates: { name: 'Updated Name', position: [350, 150] },
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				const node = result.nodes.find((n) => n.id === 'node2');
				expect(node?.name).toBe('Updated Name');
				expect(node?.position).toEqual([350, 150]);
				expect(node?.type).toBe('n8n-nodes-base.code'); // preserved
			});

			it('should handle non-existent node gracefully', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'updateNode',
						nodeId: 'non-existent',
						updates: { name: 'Should not apply' },
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toEqual(baseWorkflow.nodes);
			});

			it('should preserve other properties during partial update', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'updateNode',
						nodeId: 'node1',
						updates: { disabled: true },
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				const node = result.nodes.find((n) => n.id === 'node1');
				expect(node?.disabled).toBe(true);
				expect(node?.name).toBe('Node 1');
				expect(node?.position).toEqual([100, 100]);
			});
		});

		describe('setConnections operation', () => {
			it('should replace all connections', () => {
				const newConnections: IConnections = {
					node3: {
						main: [[{ node: 'node1', type: 'main', index: 0 }]],
					},
				};
				const operations: WorkflowOperation[] = [
					{ type: 'setConnections', connections: newConnections },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.connections).toEqual(newConnections);
			});

			it('should handle empty connections object', () => {
				const operations: WorkflowOperation[] = [{ type: 'setConnections', connections: {} }];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.connections).toEqual({});
			});
		});

		describe('mergeConnections operation', () => {
			it('should add new connections to existing ones', () => {
				const newConnections: IConnections = {
					node3: {
						main: [[{ node: 'node1', type: 'main', index: 0 }]],
					},
				};
				const operations: WorkflowOperation[] = [
					{ type: 'mergeConnections', connections: newConnections },
				];

				const result = applyOperations(baseWorkflow, operations);

				// Original connections preserved
				expect(result.connections.node1).toEqual(baseWorkflow.connections.node1);
				expect(result.connections.node2).toEqual(baseWorkflow.connections.node2);
				// New connection added
				expect(result.connections.node3).toEqual(newConnections.node3);
			});

			it('should avoid duplicate connections', () => {
				const duplicateConnections: IConnections = {
					node1: {
						main: [[{ node: 'node2', type: 'main', index: 0 }]], // Already exists
					},
				};
				const operations: WorkflowOperation[] = [
					{ type: 'mergeConnections', connections: duplicateConnections },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.connections.node1.main[0]).toHaveLength(1);
			});

			it('should merge complex multi-output connections', () => {
				// Setup base with multi-output
				baseWorkflow.connections.node1.main = [
					[{ node: 'node2', type: 'main', index: 0 }],
					[{ node: 'node3', type: 'main', index: 0 }],
				];

				const newConnections: IConnections = {
					node1: {
						main: [
							[{ node: 'node3', type: 'main', index: 1 }], // New connection at output 0
							[], // Nothing at output 1
							[{ node: 'node2', type: 'main', index: 1 }], // New output 2
						],
					},
				};

				const operations: WorkflowOperation[] = [
					{ type: 'mergeConnections', connections: newConnections },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.connections.node1.main[0]).toHaveLength(2); // Original + new
				expect(result.connections.node1.main[1]).toHaveLength(1); // Original only
				expect(result.connections.node1.main[2]).toHaveLength(1); // New only
			});

			it('should handle arrays with null/undefined gracefully', () => {
				baseWorkflow.connections.node1.main = [null, [{ node: 'node2', type: 'main', index: 0 }]];

				const newConnections: IConnections = {
					node1: {
						main: [[{ node: 'node3', type: 'main', index: 0 }]],
					},
				};

				const operations: WorkflowOperation[] = [
					{ type: 'mergeConnections', connections: newConnections },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.connections.node1.main[0]).toEqual([
					{ node: 'node3', type: 'main', index: 0 },
				]);
				expect(result.connections.node1.main[1]).toEqual([
					{ node: 'node2', type: 'main', index: 0 },
				]);
			});
		});

		describe('multiple operations', () => {
			it('should apply operations in sequence', () => {
				const newNode = createNode({ id: 'node4', name: 'Node 4' });
				const operations: WorkflowOperation[] = [
					{ type: 'addNodes', nodes: [newNode] },
					{ type: 'removeNode', nodeIds: ['node1'] },
					{
						type: 'updateNode',
						nodeId: 'node2',
						updates: { name: 'Updated Node 2' },
					},
					{
						type: 'mergeConnections',
						connections: {
							node4: {
								main: [[{ node: 'node2', type: 'main', index: 0 }]],
							},
						},
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(3);
				expect(result.nodes.find((n) => n.id === 'node1')).toBeUndefined();
				expect(result.nodes.find((n) => n.id === 'node4')).toBeDefined();
				expect(result.nodes.find((n) => n.id === 'node2')?.name).toBe('Updated Node 2');
				expect(result.connections.node4).toBeDefined();
			});

			it('should handle clear followed by other operations', () => {
				const newNode = createNode({ id: 'newNode', name: 'New Node' });
				const operations: WorkflowOperation[] = [
					{ type: 'clear' },
					{ type: 'addNodes', nodes: [newNode] },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(1);
				expect(result.nodes[0].id).toBe('newNode');
				expect(result.connections).toEqual({});
			});
		});

		describe('edge cases', () => {
			it('should handle empty operations array', () => {
				const result = applyOperations(baseWorkflow, []);

				expect(result.nodes).toEqual(baseWorkflow.nodes);
				expect(result.connections).toEqual(baseWorkflow.connections);
			});

			it('should handle operations on empty workflow', () => {
				const emptyWorkflow = createWorkflow([]);
				const operations: WorkflowOperation[] = [
					{ type: 'removeNode', nodeIds: ['any'] },
					{ type: 'updateNode', nodeId: 'any', updates: { name: 'test' } },
				];

				const result = applyOperations(emptyWorkflow, operations);

				expect(result.nodes).toEqual([]);
				expect(result.connections).toEqual({});
			});
		});
	});

	describe('processOperations', () => {
		const createState = (
			workflowJSON: SimpleWorkflow,
			workflowOperations: WorkflowOperation[] | null = null,
		): typeof WorkflowState.State => ({
			workflowJSON,
			workflowOperations,
			messages: [],
			workflowContext: {},
			previousSummary: 'EMPTY',
		});

		it('should process operations and clear them', () => {
			const workflow = createWorkflow([createNode()]);
			const operations: WorkflowOperation[] = [
				{ type: 'addNodes', nodes: [createNode({ id: 'node2' })] },
			];
			const state = createState(workflow, operations);

			const result = processOperations(state);

			expect(result.workflowJSON).toBeDefined();
			expect(result.workflowJSON?.nodes).toHaveLength(2);
			expect(result.workflowOperations).toBeNull();
		});

		it('should handle null operations array', () => {
			const workflow = createWorkflow([createNode()]);
			const state = createState(workflow, null);

			const result = processOperations(state);

			expect(result).toEqual({});
		});

		it('should handle empty operations array', () => {
			const workflow = createWorkflow([createNode()]);
			const state = createState(workflow, []);

			const result = processOperations(state);

			expect(result).toEqual({});
		});

		it('should apply multiple operations correctly', () => {
			const node1 = createNode({ id: 'node1' });
			const node2 = createNode({ id: 'node2' });
			const workflow = createWorkflow([node1]);
			const operations: WorkflowOperation[] = [
				{ type: 'addNodes', nodes: [node2] },
				{
					type: 'setConnections',
					connections: {
						node1: {
							main: [[{ node: 'node2', type: 'main', index: 0 }]],
						},
					},
				},
			];
			const state = createState(workflow, operations);

			const result = processOperations(state);

			expect(result.workflowJSON?.nodes).toHaveLength(2);
			expect(result.workflowJSON?.connections.node1).toBeDefined();
			expect(result.workflowOperations).toBeNull();
		});
	});
});
