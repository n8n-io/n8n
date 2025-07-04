import type { INode } from 'n8n-workflow';

import type { SimpleWorkflow } from '../../types';
import { RemoveNodeTool } from '../remove-node.tool';
import { ToolTestHarness } from './test-utils';

describe('RemoveNodeTool', () => {
	let harness: ToolTestHarness;
	let tool: RemoveNodeTool;

	beforeEach(() => {
		harness = new ToolTestHarness();
		tool = new RemoveNodeTool(harness.context.nodeTypes);
	});

	describe('execute', () => {
		it('should successfully remove a node and its connections', async () => {
			// Create initial workflow state with nodes and connections
			const initialNodes: INode[] = [
				{
					id: 'node_1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [250, 300],
					parameters: {},
					typeVersion: 3,
				},
				{
					id: 'node_2',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					position: [450, 300],
					parameters: {},
					typeVersion: 3.2,
				},
				{
					id: 'node_3',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					position: [650, 300],
					parameters: {},
					typeVersion: 2,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes: initialNodes,
				connections: {
					node_1: {
						main: [[{ node: 'node_2', type: 'main', index: 0 }]],
					},
					node_2: {
						main: [[{ node: 'node_3', type: 'main', index: 0 }]],
					},
				},
			};

			harness.setState({ workflowJSON: initialWorkflow });

			// Execute the tool to remove node_2
			const result = await harness.execute(tool, { nodeId: 'node_2' });

			// Assert success
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				removedNodeId: 'node_2',
				removedNodeName: 'Set',
				removedNodeType: 'n8n-nodes-base.set',
				connectionsRemoved: 2, // One incoming and one outgoing
				message: 'Successfully removed node "Set" (n8n-nodes-base.set)\nRemoved 2 connections',
			});

			// Verify state updates
			expect(result.stateUpdates?.workflowJSON?.nodes).toHaveLength(2);
			expect(result.stateUpdates?.workflowJSON?.nodes).toEqual([initialNodes[0], initialNodes[2]]);

			// Verify connections were properly cleaned up
			const updatedConnections = result.stateUpdates?.workflowJSON?.connections;
			expect(updatedConnections).toEqual({
				node_1: {
					main: [[]], // Empty array since node_2 was removed
				},
				// node_2 connections should be completely removed
			});
		});

		it('should handle removing a node with no connections', async () => {
			// Create workflow with isolated node
			const initialNodes: INode[] = [
				{
					id: 'node_1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [250, 300],
					parameters: {},
					typeVersion: 3,
				},
				{
					id: 'node_2',
					name: 'Isolated Node',
					type: 'n8n-nodes-base.set',
					position: [450, 300],
					parameters: {},
					typeVersion: 3.2,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes: initialNodes,
				connections: {},
			};

			harness.setState({ workflowJSON: initialWorkflow });

			// Execute the tool
			const result = await harness.execute(tool, { nodeId: 'node_2' });

			// Assert success
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				removedNodeId: 'node_2',
				removedNodeName: 'Isolated Node',
				removedNodeType: 'n8n-nodes-base.set',
				connectionsRemoved: 0,
				message: 'Successfully removed node "Isolated Node" (n8n-nodes-base.set)',
			});

			// Verify only one node remains
			expect(result.stateUpdates?.workflowJSON?.nodes).toHaveLength(1);
			expect(result.stateUpdates?.workflowJSON?.nodes?.[0].id).toBe('node_1');
		});

		it('should handle removing a node with multiple connections', async () => {
			// Create workflow with a node that has multiple connections
			const initialNodes: INode[] = [
				{
					id: 'node_1',
					name: 'HTTP Request 1',
					type: 'n8n-nodes-base.httpRequest',
					position: [250, 200],
					parameters: {},
					typeVersion: 3,
				},
				{
					id: 'node_2',
					name: 'HTTP Request 2',
					type: 'n8n-nodes-base.httpRequest',
					position: [250, 400],
					parameters: {},
					typeVersion: 3,
				},
				{
					id: 'node_3',
					name: 'Merge',
					type: 'n8n-nodes-base.merge',
					position: [450, 300],
					parameters: {},
					typeVersion: 2.1,
				},
				{
					id: 'node_4',
					name: 'Set',
					type: 'n8n-nodes-base.set',
					position: [650, 300],
					parameters: {},
					typeVersion: 3.2,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes: initialNodes,
				connections: {
					node_1: {
						main: [[{ node: 'node_3', type: 'main', index: 0 }]],
					},
					node_2: {
						main: [[{ node: 'node_3', type: 'main', index: 1 }]],
					},
					node_3: {
						main: [[{ node: 'node_4', type: 'main', index: 0 }]],
					},
				},
			};

			harness.setState({ workflowJSON: initialWorkflow });

			// Execute the tool to remove the merge node
			const result = await harness.execute(tool, { nodeId: 'node_3' });

			// Assert success
			expect(result.success).toBe(true);
			expect(result.data?.connectionsRemoved).toBe(3); // 2 incoming, 1 outgoing

			// Verify connections were cleaned up
			const updatedConnections = result.stateUpdates?.workflowJSON?.connections;
			expect(updatedConnections).toEqual({
				node_1: {
					main: [[]], // Empty since target was removed
				},
				node_2: {
					main: [[]], // Empty since target was removed
				},
			});
		});

		it('should return error when node does not exist', async () => {
			// Create simple workflow
			const initialNodes: INode[] = [
				{
					id: 'node_1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [250, 300],
					parameters: {},
					typeVersion: 3,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes: initialNodes,
				connections: {},
			};

			harness.setState({ workflowJSON: initialWorkflow });

			// Execute the tool with non-existent node ID
			const result = await harness.execute(tool, { nodeId: 'non_existent_node' });

			// Assert failure
			expect(result.success).toBe(false);
			expect(result.error).toEqual({
				message: 'Node with ID "non_existent_node" not found in the workflow',
				code: 'NODE_NOT_FOUND',
				details: { nodeId: 'non_existent_node' },
			});

			// Verify no state changes
			expect(result.stateUpdates).toBeUndefined();
		});

		it('should handle removing the only node in workflow', async () => {
			// Create workflow with single node
			const initialNodes: INode[] = [
				{
					id: 'node_1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [250, 300],
					parameters: {},
					typeVersion: 3,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes: initialNodes,
				connections: {},
			};

			harness.setState({ workflowJSON: initialWorkflow });

			// Execute the tool
			const result = await harness.execute(tool, { nodeId: 'node_1' });

			// Assert success
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				removedNodeId: 'node_1',
				removedNodeName: 'HTTP Request',
				removedNodeType: 'n8n-nodes-base.httpRequest',
				connectionsRemoved: 0,
				message: 'Successfully removed node "HTTP Request" (n8n-nodes-base.httpRequest)',
			});

			// Verify empty workflow
			expect(result.stateUpdates?.workflowJSON?.nodes).toEqual([]);
			expect(result.stateUpdates?.workflowJSON?.connections).toEqual({});
		});
	});

	describe('schema validation', () => {
		it('should validate nodeId is required', async () => {
			const result = await harness.execute(tool, {} as any);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('VALIDATION_ERROR');
		});

		it('should validate nodeId is a string', async () => {
			const result = await harness.execute(tool, { nodeId: 123 } as any);

			expect(result.success).toBe(false);
			expect(result.error?.code).toBe('VALIDATION_ERROR');
		});
	});
});
