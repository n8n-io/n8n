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
					'Node 1': {
						main: [[{ node: 'Node 2', type: 'main', index: 0 }]],
					},
					'Node 2': {
						main: [[{ node: 'Node 3', type: 'main', index: 0 }]],
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
				baseWorkflow.connections['Node 1'].ai_tool = [
					[{ node: 'Node 3', type: 'ai_tool', index: 0 }],
				];

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
				// Node 1's connection to Node 2 is filtered out, leaving empty array
				expect(result.connections['Node 1']).toEqual({ main: [[]] });
				// Node 2 is removed entirely as source
				expect(result.connections['Node 2']).toBeUndefined();
			});

			it('should remove multiple nodes', () => {
				const operations: WorkflowOperation[] = [
					{ type: 'removeNode', nodeIds: ['node1', 'node3'] },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(1);
				expect(result.nodes[0].id).toBe('node2');
				// Node 2's connection to Node 3 is filtered out, leaving empty array
				expect(result.connections).toEqual({
					'Node 2': { main: [[]] },
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
				baseWorkflow.connections['Node 3'] = {
					main: [[{ node: 'Node 2', type: 'main', index: 1 }]],
				};

				const operations: WorkflowOperation[] = [{ type: 'removeNode', nodeIds: ['node2'] }];

				const result = applyOperations(baseWorkflow, operations);

				// Node 1's connection to Node 2 is filtered out, leaving empty array
				expect(result.connections['Node 1']).toEqual({ main: [[]] });
				expect(result.connections['Node 3']).toBeDefined();
				expect(result.connections['Node 3'].main[0]).toEqual([]);
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
					'Node 3': {
						main: [[{ node: 'Node 1', type: 'main', index: 0 }]],
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
					'Node 3': {
						main: [[{ node: 'Node 1', type: 'main', index: 0 }]],
					},
				};
				const operations: WorkflowOperation[] = [
					{ type: 'mergeConnections', connections: newConnections },
				];

				const result = applyOperations(baseWorkflow, operations);

				// Original connections preserved
				expect(result.connections['Node 1']).toEqual(baseWorkflow.connections['Node 1']);
				expect(result.connections['Node 2']).toEqual(baseWorkflow.connections['Node 2']);
				// New connection added
				expect(result.connections['Node 3']).toEqual(newConnections['Node 3']);
			});

			it('should avoid duplicate connections', () => {
				const duplicateConnections: IConnections = {
					'Node 1': {
						main: [[{ node: 'Node 2', type: 'main', index: 0 }]], // Already exists
					},
				};
				const operations: WorkflowOperation[] = [
					{ type: 'mergeConnections', connections: duplicateConnections },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.connections['Node 1'].main[0]).toHaveLength(1);
			});

			it('should merge complex multi-output connections', () => {
				// Setup base with multi-output
				baseWorkflow.connections['Node 1'].main = [
					[{ node: 'Node 2', type: 'main', index: 0 }],
					[{ node: 'Node 3', type: 'main', index: 0 }],
				];

				const newConnections: IConnections = {
					'Node 1': {
						main: [
							[{ node: 'Node 3', type: 'main', index: 1 }], // New connection at output 0
							[], // Nothing at output 1
							[{ node: 'Node 2', type: 'main', index: 1 }], // New output 2
						],
					},
				};

				const operations: WorkflowOperation[] = [
					{ type: 'mergeConnections', connections: newConnections },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.connections['Node 1'].main[0]).toHaveLength(2); // Original + new
				expect(result.connections['Node 1'].main[1]).toHaveLength(1); // Original only
				expect(result.connections['Node 1'].main[2]).toHaveLength(1); // New only
			});

			it('should handle arrays with null/undefined gracefully', () => {
				baseWorkflow.connections['Node 1'].main = [
					null,
					[{ node: 'Node 2', type: 'main', index: 0 }],
				];

				const newConnections: IConnections = {
					'Node 1': {
						main: [[{ node: 'Node 3', type: 'main', index: 0 }]],
					},
				};

				const operations: WorkflowOperation[] = [
					{ type: 'mergeConnections', connections: newConnections },
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.connections['Node 1'].main[0]).toEqual([
					{ node: 'Node 3', type: 'main', index: 0 },
				]);
				expect(result.connections['Node 1'].main[1]).toEqual([
					{ node: 'Node 2', type: 'main', index: 0 },
				]);
			});
		});

		describe('removeConnection operation', () => {
			it('should remove a specific connection between two nodes', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'removeConnection',
						sourceNode: 'Node 1',
						targetNode: 'Node 2',
						connectionType: 'main',
						sourceOutputIndex: 0,
						targetInputIndex: 0,
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Connection should be removed and cleaned up entirely
				expect(result.connections['Node 1']).toBeUndefined();
				// Other connections should remain
				expect(result.connections['Node 2'].main[0]).toEqual([
					{ node: 'Node 3', type: 'main', index: 0 },
				]);
			});

			it('should remove connection and clean up empty structures', () => {
				// Workflow with only one connection from Node 1
				const simpleWorkflow: SimpleWorkflow = {
					name: 'Simple',
					nodes: [node1, node2],
					connections: {
						'Node 1': {
							main: [[{ node: 'Node 2', type: 'main', index: 0 }]],
						},
					},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'removeConnection',
						sourceNode: 'Node 1',
						targetNode: 'Node 2',
						connectionType: 'main',
						sourceOutputIndex: 0,
						targetInputIndex: 0,
					},
				];

				const result = applyOperations(simpleWorkflow, operations);

				// Empty structures are cleaned up completely
				expect(result.connections['Node 1']).toBeUndefined();
			});

			it('should remove one connection when multiple exist at same output', () => {
				// Add multiple connections from Node 1 output 0
				baseWorkflow.connections['Node 1'].main = [
					[
						{ node: 'Node 2', type: 'main', index: 0 },
						{ node: 'Node 3', type: 'main', index: 0 },
					],
				];

				const operations: WorkflowOperation[] = [
					{
						type: 'removeConnection',
						sourceNode: 'Node 1',
						targetNode: 'Node 2',
						connectionType: 'main',
						sourceOutputIndex: 0,
						targetInputIndex: 0,
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Only Node 2 connection removed, Node 3 connection remains
				expect(result.connections['Node 1'].main[0]).toEqual([
					{ node: 'Node 3', type: 'main', index: 0 },
				]);
			});

			it('should remove connection at specific output index', () => {
				// Setup multi-output connection
				baseWorkflow.connections['Node 1'].main = [
					[{ node: 'Node 2', type: 'main', index: 0 }], // Output 0
					[{ node: 'Node 3', type: 'main', index: 0 }], // Output 1
				];

				const operations: WorkflowOperation[] = [
					{
						type: 'removeConnection',
						sourceNode: 'Node 1',
						targetNode: 'Node 3',
						connectionType: 'main',
						sourceOutputIndex: 1,
						targetInputIndex: 0,
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Output 0 unchanged
				expect(result.connections['Node 1'].main[0]).toEqual([
					{ node: 'Node 2', type: 'main', index: 0 },
				]);
				// Output 1 connection removed
				expect(result.connections['Node 1'].main[1]).toEqual([]);
			});

			it('should handle AI connection types', () => {
				// Setup AI connection
				baseWorkflow.connections['Node 1'].ai_languageModel = [
					[{ node: 'Node 2', type: 'ai_languageModel', index: 0 }],
				];

				const operations: WorkflowOperation[] = [
					{
						type: 'removeConnection',
						sourceNode: 'Node 1',
						targetNode: 'Node 2',
						connectionType: 'ai_languageModel',
						sourceOutputIndex: 0,
						targetInputIndex: 0,
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// AI connection type removed, but main connection remains
				expect(result.connections['Node 1'].ai_languageModel).toBeUndefined();
				expect(result.connections['Node 1'].main).toBeDefined();
			});

			it('should handle non-existent connection gracefully', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'removeConnection',
						sourceNode: 'Node 1',
						targetNode: 'Node 3', // No direct connection
						connectionType: 'main',
						sourceOutputIndex: 0,
						targetInputIndex: 0,
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Workflow unchanged
				expect(result.connections).toEqual(baseWorkflow.connections);
			});

			it('should handle non-existent source node gracefully', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'removeConnection',
						sourceNode: 'non-existent',
						targetNode: 'Node 2',
						connectionType: 'main',
						sourceOutputIndex: 0,
						targetInputIndex: 0,
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Workflow unchanged
				expect(result.connections).toEqual(baseWorkflow.connections);
			});

			it('should handle non-existent connection type gracefully', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'removeConnection',
						sourceNode: 'Node 1',
						targetNode: 'Node 2',
						connectionType: 'ai_tool', // Does not exist
						sourceOutputIndex: 0,
						targetInputIndex: 0,
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Workflow unchanged
				expect(result.connections).toEqual(baseWorkflow.connections);
			});

			it('should handle out-of-range output index gracefully', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'removeConnection',
						sourceNode: 'Node 1',
						targetNode: 'Node 2',
						connectionType: 'main',
						sourceOutputIndex: 99, // Out of range
						targetInputIndex: 0,
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Workflow unchanged
				expect(result.connections).toEqual(baseWorkflow.connections);
			});
		});

		describe('renameNode operation', () => {
			it('should rename a node', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Renamed Node 1',
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				const node = result.nodes.find((n) => n.id === 'node1');
				expect(node?.name).toBe('Renamed Node 1');
			});

			it('should update connection source keys when renaming a node', () => {
				// Rename node1 which is a source in connections
				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Source Node',
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Old key should not exist
				expect(result.connections['Node 1']).toBeUndefined();
				// New key should exist with same connections
				expect(result.connections['Source Node']).toBeDefined();
				expect(result.connections['Source Node'].main[0]).toEqual([
					{ node: 'Node 2', type: 'main', index: 0 },
				]);
			});

			it('should update connection target references when renaming a node', () => {
				// Rename node2 which is a target in connections from Node 1
				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node2',
						oldName: 'Node 2',
						newName: 'Target Node',
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Node 1's connection should now point to 'Target Node'
				expect(result.connections['Node 1'].main[0]).toEqual([
					{ node: 'Target Node', type: 'main', index: 0 },
				]);
				// Node 2's source key should be renamed
				expect(result.connections['Node 2']).toBeUndefined();
				expect(result.connections['Target Node']).toBeDefined();
			});

			it('should update both source and target references when node is in middle of chain', () => {
				// Node 2 is both a target (from Node 1) and a source (to Node 3)
				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node2',
						oldName: 'Node 2',
						newName: 'Middle Node',
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Node 1's connection should point to 'Middle Node'
				expect(result.connections['Node 1'].main[0]).toEqual([
					{ node: 'Middle Node', type: 'main', index: 0 },
				]);
				// Node 2's source key should be renamed to 'Middle Node'
				expect(result.connections['Node 2']).toBeUndefined();
				expect(result.connections['Middle Node']).toBeDefined();
				expect(result.connections['Middle Node'].main[0]).toEqual([
					{ node: 'Node 3', type: 'main', index: 0 },
				]);
			});

			it('should handle renaming a node with no connections', () => {
				// Create a workflow with an isolated node
				const isolatedWorkflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Isolated Node',
					},
				];

				const result = applyOperations(isolatedWorkflow, operations);

				expect(result.nodes[0].name).toBe('Isolated Node');
				expect(result.connections).toEqual({});
			});

			it('should handle non-existent node gracefully', () => {
				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'non-existent',
						oldName: 'Non Existent',
						newName: 'New Name',
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Nodes unchanged
				expect(result.nodes.map((n) => n.name)).toEqual(['Node 1', 'Node 2', 'Node 3']);
			});

			it('should handle AI connection types when renaming', () => {
				// Add AI connection type
				baseWorkflow.connections['Node 1'].ai_languageModel = [
					[{ node: 'Node 2', type: 'ai_languageModel', index: 0 }],
				];

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node2',
						oldName: 'Node 2',
						newName: 'AI Model',
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Both main and AI connection types should be updated
				expect(result.connections['Node 1'].main[0]).toEqual([
					{ node: 'AI Model', type: 'main', index: 0 },
				]);
				expect(result.connections['Node 1'].ai_languageModel[0]).toEqual([
					{ node: 'AI Model', type: 'ai_languageModel', index: 0 },
				]);
			});

			it('should handle multiple connections to the renamed node', () => {
				// Add another connection to Node 2
				baseWorkflow.connections['Node 3'] = {
					main: [[{ node: 'Node 2', type: 'main', index: 1 }]],
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node2',
						oldName: 'Node 2',
						newName: 'Central Node',
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				// Both incoming connections should be updated
				expect(result.connections['Node 1'].main[0]).toEqual([
					{ node: 'Central Node', type: 'main', index: 0 },
				]);
				expect(result.connections['Node 3'].main[0]).toEqual([
					{ node: 'Central Node', type: 'main', index: 1 },
				]);
			});

			it('should update $node["name"] expression references in node parameters', () => {
				const nodeWithExpression = createNode({
					id: 'node2',
					name: 'Node 2',
					parameters: {
						value: '={{ $node["Node 1"].json.field }}',
					},
				});
				const workflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1, nodeWithExpression],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Renamed Node',
					},
				];

				const result = applyOperations(workflow, operations);

				const updatedNode = result.nodes.find((n) => n.id === 'node2');
				expect(updatedNode?.parameters?.value).toBe('={{ $node["Renamed Node"].json.field }}');
			});

			it('should update $() function expression references', () => {
				const nodeWithExpression = createNode({
					id: 'node2',
					name: 'Node 2',
					parameters: {
						value: "={{ $('Node 1').first().json.data }}",
					},
				});
				const workflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1, nodeWithExpression],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Source Node',
					},
				];

				const result = applyOperations(workflow, operations);

				const updatedNode = result.nodes.find((n) => n.id === 'node2');
				expect(updatedNode?.parameters?.value).toBe("={{ $('Source Node').first().json.data }}");
			});

			it('should update $items() function expression references', () => {
				const nodeWithExpression = createNode({
					id: 'node2',
					name: 'Node 2',
					parameters: {
						value: '={{ $items("Node 1", 0) }}',
					},
				});
				const workflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1, nodeWithExpression],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Data Node',
					},
				];

				const result = applyOperations(workflow, operations);

				const updatedNode = result.nodes.find((n) => n.id === 'node2');
				expect(updatedNode?.parameters?.value).toBe('={{ $items("Data Node", 0) }}');
			});

			it('should update nested parameter expressions', () => {
				const nodeWithNestedExpression = createNode({
					id: 'node2',
					name: 'Node 2',
					parameters: {
						options: {
							nested: {
								value: "={{ $('Node 1').json.field }}",
							},
						},
					},
				});
				const workflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1, nodeWithNestedExpression],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'NewNode',
					},
				];

				const result = applyOperations(workflow, operations);

				const updatedNode = result.nodes.find((n) => n.id === 'node2');
				expect((updatedNode?.parameters?.options as Record<string, unknown>)?.nested).toEqual({
					value: "={{ $('NewNode').json.field }}",
				});
			});

			it('should not update expressions referencing different nodes', () => {
				const nodeWithExpression = createNode({
					id: 'node3',
					name: 'Node 3',
					parameters: {
						value: '={{ $node["Node 2"].json.field }}',
					},
				});
				const workflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1, node2, nodeWithExpression],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Renamed',
					},
				];

				const result = applyOperations(workflow, operations);

				const updatedNode = result.nodes.find((n) => n.id === 'node3');
				// Should remain unchanged - references Node 2, not Node 1
				expect(updatedNode?.parameters?.value).toBe('={{ $node["Node 2"].json.field }}');
			});

			it('should update multiple expression references in the same parameter', () => {
				const nodeWithMultipleRefs = createNode({
					id: 'node2',
					name: 'Node 2',
					parameters: {
						value: "={{ $('Node 1').json.a + $node['Node 1'].json.b }}",
					},
				});
				const workflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1, nodeWithMultipleRefs],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Source',
					},
				];

				const result = applyOperations(workflow, operations);

				const updatedNode = result.nodes.find((n) => n.id === 'node2');
				expect(updatedNode?.parameters?.value).toBe(
					"={{ $('Source').json.a + $node['Source'].json.b }}",
				);
			});

			it('should not update non-expression string parameters', () => {
				const nodeWithPlainString = createNode({
					id: 'node2',
					name: 'Node 2',
					parameters: {
						// This is NOT an expression (doesn't start with =)
						description: 'This references Node 1 in plain text',
					},
				});
				const workflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1, nodeWithPlainString],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Renamed',
					},
				];

				const result = applyOperations(workflow, operations);

				const updatedNode = result.nodes.find((n) => n.id === 'node2');
				// Plain strings should not be modified
				expect(updatedNode?.parameters?.description).toBe('This references Node 1 in plain text');
			});

			it('should update expressions in Form node HTML fields', () => {
				const formNode = createNode({
					id: 'form1',
					name: 'Form',
					type: 'n8n-nodes-base.form',
					parameters: {
						formFields: {
							values: [
								{ fieldType: 'text', fieldLabel: 'Name' },
								{
									fieldType: 'html',
									html: "<p>Data from {{ $('Node 1').json.field }}</p>",
								},
								{ fieldType: 'email', fieldLabel: 'Email' },
							],
						},
					},
				});
				const workflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1, formNode],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Data Source',
					},
				];

				const result = applyOperations(workflow, operations);

				const updatedFormNode = result.nodes.find((n) => n.id === 'form1');
				const formFields = updatedFormNode?.parameters?.formFields as {
					values: Array<{ fieldType: string; html?: string }>;
				};
				const htmlField = formFields.values.find((f) => f.fieldType === 'html');
				expect(htmlField?.html).toBe("<p>Data from {{ $('Data Source').json.field }}</p>");
			});

			it('should update expressions in Code node jsCode', () => {
				const codeNode = createNode({
					id: 'code1',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					parameters: {
						jsCode: "const data = $('Node 1').item.json;\nreturn { result: data };",
					},
				});
				const workflow: SimpleWorkflow = {
					name: 'Test',
					nodes: [node1, codeNode],
					connections: {},
				};

				const operations: WorkflowOperation[] = [
					{
						type: 'renameNode',
						nodeId: 'node1',
						oldName: 'Node 1',
						newName: 'Input Node',
					},
				];

				const result = applyOperations(workflow, operations);

				const updatedCodeNode = result.nodes.find((n) => n.id === 'code1');
				expect(updatedCodeNode?.parameters?.jsCode).toBe(
					"const data = $('Input Node').item.json;\nreturn { result: data };",
				);
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
							'Node 4': {
								main: [[{ node: 'Node 2', type: 'main', index: 0 }]],
							},
						},
					},
				];

				const result = applyOperations(baseWorkflow, operations);

				expect(result.nodes).toHaveLength(3);
				expect(result.nodes.find((n) => n.id === 'node1')).toBeUndefined();
				expect(result.nodes.find((n) => n.id === 'node4')).toBeDefined();
				expect(result.nodes.find((n) => n.id === 'node2')?.name).toBe('Updated Node 2');
				expect(result.connections['Node 4']).toBeDefined();
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
			workflowValidation: null,
			validationHistory: [],
			techniqueCategories: [],
			previousSummary: 'EMPTY',
			templateIds: [],
			cachedTemplates: [],
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
