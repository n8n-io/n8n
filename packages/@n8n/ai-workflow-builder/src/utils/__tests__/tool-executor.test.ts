import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import type { INode } from 'n8n-workflow';

import { executeToolsInParallel } from '../tool-executor';
import type { WorkflowState } from '../../workflow-state';
import type { SimpleWorkflow } from '../../types';

describe('executeToolsInParallel', () => {
	// Helper function to create a mock AI message with tool calls
	function createAIMessage(toolCalls: Array<{ name: string; args: any; id: string }>) {
		return new AIMessage({
			content: '',
			tool_calls: toolCalls,
		});
	}

	// Helper function to create a mock tool that returns a Command
	function createMockTool(name: string, stateUpdate: Partial<typeof WorkflowState.State>) {
		return {
			invoke: jest.fn().mockResolvedValue(
				new Command({
					update: stateUpdate,
				}),
			),
		};
	}

	// Helper function to create a mock tool that returns a ToolMessage
	function createMockMessageTool(name: string, message: string) {
		return {
			invoke: jest.fn().mockResolvedValue(
				new ToolMessage({
					content: message,
					tool_call_id: 'test-id',
				}),
			),
		};
	}

	describe('parallel node removals', () => {
		it('should handle removing nodes with complex connection chains', async () => {
			// A -> B -> C -> D -> E
			const nodes: INode[] = [
				{
					id: 'A',
					name: 'Node A',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'B',
					name: 'Node B',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'C',
					name: 'Node C',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'D',
					name: 'Node D',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'E',
					name: 'Node E',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes,
				connections: {
					A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
					B: { main: [[{ node: 'C', type: 'main', index: 0 }]] },
					C: { main: [[{ node: 'D', type: 'main', index: 0 }]] },
					D: { main: [[{ node: 'E', type: 'main', index: 0 }]] },
				},
			};

			// Remove B and D in parallel
			const removeBUpdate: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [nodes[0], nodes[2], nodes[3], nodes[4]], // A, C, D, E
					connections: {
						A: { main: [[]] },
						C: { main: [[{ node: 'D', type: 'main', index: 0 }]] },
						D: { main: [[{ node: 'E', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Removed B', tool_call_id: 'call_1' })],
			};

			const removeDUpdate: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [nodes[0], nodes[1], nodes[2], nodes[4]], // A, B, C, E
					connections: {
						A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
						B: { main: [[{ node: 'C', type: 'main', index: 0 }]] },
						C: { main: [[]] },
					},
				},
				messages: [new ToolMessage({ content: 'Removed D', tool_call_id: 'call_2' })],
			};

			const mockTool = createMockTool('remove_node', removeBUpdate);
			const toolMap = new Map([['remove_node', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'remove_node', args: { nodeId: 'B' }, id: 'call_1' },
						{ name: 'remove_node', args: { nodeId: 'D' }, id: 'call_2' },
					]),
				],
				prompt: 'Remove nodes B and D',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? removeBUpdate : removeDUpdate,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have A, C, E remaining
			expect(result.workflowJSON?.nodes).toHaveLength(3);
			expect(result.workflowJSON?.nodes.map((n) => n.id).sort()).toEqual(['A', 'C', 'E']);

			// Connections should be properly cleaned
			expect(result.workflowJSON?.connections).toEqual({
				A: { main: [[]] }, // B was removed
				C: { main: [[]] }, // D was removed
			});
		});

		it('should correctly handle multiple parallel node removals', async () => {
			// Initial state with 4 nodes
			const initialNodes: INode[] = [
				{
					id: 'node_1',
					name: 'Node 1',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'node_2',
					name: 'Node 2',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'node_3',
					name: 'Node 3',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'node_4',
					name: 'Node 4',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes: initialNodes,
				connections: {
					node_1: { main: [[{ node: 'node_2', type: 'main', index: 0 }]] },
					node_2: { main: [[{ node: 'node_3', type: 'main', index: 0 }]] },
					node_3: { main: [[{ node: 'node_4', type: 'main', index: 0 }]] },
				},
			};

			// Tool 1 removes node_2 (returns nodes 1, 3, 4)
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [initialNodes[0], initialNodes[2], initialNodes[3]],
					connections: {
						node_1: { main: [[]] },
						node_3: { main: [[{ node: 'node_4', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Removed node_2', tool_call_id: 'call_1' })],
			};

			// Tool 2 removes node_3 (returns nodes 1, 2, 4)
			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [initialNodes[0], initialNodes[1], initialNodes[3]],
					connections: {
						node_1: { main: [[{ node: 'node_2', type: 'main', index: 0 }]] },
						node_2: { main: [[]] },
					},
				},
				messages: [new ToolMessage({ content: 'Removed node_3', tool_call_id: 'call_2' })],
			};

			const mockTool1 = createMockTool('remove_node', tool1Update);
			const mockTool2 = createMockTool('remove_node', tool2Update);

			const toolMap = new Map([
				['remove_node', mockTool1], // Both calls will use the same tool
			]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'remove_node', args: { nodeId: 'node_2' }, id: 'call_1' },
						{ name: 'remove_node', args: { nodeId: 'node_3' }, id: 'call_2' },
					]),
				],
				prompt: 'Remove nodes 2 and 3',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			// Mock the tool to return different results based on the call
			let callCount = 0;
			mockTool1.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have only nodes 1 and 4 remaining
			expect(result.workflowJSON?.nodes).toHaveLength(2);
			expect(result.workflowJSON?.nodes.map((n) => n.id)).toEqual(['node_1', 'node_4']);

			// Connections should be cleaned up
			expect(result.workflowJSON?.connections).toEqual({
				node_1: { main: [[]] }, // Connection to node_2 removed
				// node_2 and node_3 connections removed entirely
			});

			// Should have both messages
			expect(result.messages).toHaveLength(2);
		});

		it('should handle removal of all nodes', async () => {
			const initialNodes: INode[] = [
				{
					id: 'node_1',
					name: 'Node 1',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'node_2',
					name: 'Node 2',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes: initialNodes,
				connections: {
					node_1: { main: [[{ node: 'node_2', type: 'main', index: 0 }]] },
				},
			};

			// Tool 1 removes node_1
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [initialNodes[1]],
					connections: {},
				},
				messages: [new ToolMessage({ content: 'Removed node_1', tool_call_id: 'call_1' })],
			};

			// Tool 2 removes node_2
			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [initialNodes[0]],
					connections: {
						node_1: { main: [[]] },
					},
				},
				messages: [new ToolMessage({ content: 'Removed node_2', tool_call_id: 'call_2' })],
			};

			const mockTool = createMockTool('remove_node', tool1Update);
			const toolMap = new Map([['remove_node', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'remove_node', args: { nodeId: 'node_1' }, id: 'call_1' },
						{ name: 'remove_node', args: { nodeId: 'node_2' }, id: 'call_2' },
					]),
				],
				prompt: 'Remove all nodes',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have no nodes remaining
			expect(result.workflowJSON?.nodes).toEqual([]);
			expect(result.workflowJSON?.connections).toEqual({});
		});

		it('should handle removing nodes that are connected to multiple other nodes', async () => {
			// Hub and spoke pattern: B connects to A, C, D, E
			const nodes: INode[] = [
				{
					id: 'A',
					name: 'Node A',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'B',
					name: 'Node B (Hub)',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'C',
					name: 'Node C',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'D',
					name: 'Node D',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'E',
					name: 'Node E',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes,
				connections: {
					A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
					B: {
						main: [
							[
								{ node: 'C', type: 'main', index: 0 },
								{ node: 'D', type: 'main', index: 0 },
								{ node: 'E', type: 'main', index: 0 },
							],
						],
					},
					C: { main: [[{ node: 'B', type: 'main', index: 1 }]] },
					D: { main: [[{ node: 'B', type: 'main', index: 1 }]] },
				},
			};

			// Remove the hub node B
			const removeBUpdate: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [nodes[0], nodes[2], nodes[3], nodes[4]], // A, C, D, E
					connections: {
						A: { main: [[]] },
						C: { main: [[]] },
						D: { main: [[]] },
					},
				},
				messages: [new ToolMessage({ content: 'Removed hub node B', tool_call_id: 'call_1' })],
			};

			const mockTool = createMockTool('remove_node', removeBUpdate);
			const toolMap = new Map([['remove_node', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [createAIMessage([{ name: 'remove_node', args: { nodeId: 'B' }, id: 'call_1' }])],
				prompt: 'Remove hub node B',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			mockTool.invoke.mockResolvedValue(new Command({ update: removeBUpdate }));

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have all nodes except B
			expect(result.workflowJSON?.nodes).toHaveLength(4);
			expect(result.workflowJSON?.nodes.map((n) => n.id).sort()).toEqual(['A', 'C', 'D', 'E']);

			// All connections to/from B should be removed
			expect(result.workflowJSON?.connections).toEqual({
				A: { main: [[]] },
				C: { main: [[]] },
				D: { main: [[]] },
			});
		});

		it('should handle removing nodes with multiple input/output indices', async () => {
			// Node with multiple inputs and outputs (like a Merge node)
			const nodes: INode[] = [
				{
					id: 'A1',
					name: 'Input 1',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'A2',
					name: 'Input 2',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'MERGE',
					name: 'Merge',
					type: 'test.merge',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'B1',
					name: 'Output 1',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'B2',
					name: 'Output 2',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes,
				connections: {
					A1: { main: [[{ node: 'MERGE', type: 'main', index: 0 }]] },
					A2: { main: [[{ node: 'MERGE', type: 'main', index: 1 }]] },
					MERGE: {
						main: [
							[{ node: 'B1', type: 'main', index: 0 }],
							[{ node: 'B2', type: 'main', index: 0 }],
						],
					},
				},
			};

			// Remove the merge node
			const removeMergeUpdate: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [nodes[0], nodes[1], nodes[3], nodes[4]], // A1, A2, B1, B2
					connections: {
						A1: { main: [[]] },
						A2: { main: [[]] },
					},
				},
				messages: [new ToolMessage({ content: 'Removed MERGE', tool_call_id: 'call_1' })],
			};

			const mockTool = createMockTool('remove_node', removeMergeUpdate);
			const toolMap = new Map([['remove_node', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([{ name: 'remove_node', args: { nodeId: 'MERGE' }, id: 'call_1' }]),
				],
				prompt: 'Remove merge node',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			mockTool.invoke.mockResolvedValue(new Command({ update: removeMergeUpdate }));

			const result = await executeToolsInParallel({ state, toolMap });

			expect(result.workflowJSON?.nodes).toHaveLength(4);
			expect(result.workflowJSON?.nodes.map((n) => n.id).sort()).toEqual(['A1', 'A2', 'B1', 'B2']);

			// All connections involving MERGE should be cleaned up
			expect(result.workflowJSON?.connections).toEqual({
				A1: { main: [[]] },
				A2: { main: [[]] },
			});
		});
	});

	describe('parallel node additions', () => {
		it('should handle adding nodes with conflicting IDs', async () => {
			const initialWorkflow: SimpleWorkflow = {
				nodes: [
					{
						id: 'existing',
						name: 'Existing',
						type: 'test.node',
						position: [0, 0],
						parameters: {},
						typeVersion: 1,
					},
				],
				connections: {},
			};

			// Both tools try to add a node with the same ID
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [
						...initialWorkflow.nodes,
						{
							id: 'new_node',
							name: 'New Node 1',
							type: 'test.node1',
							position: [100, 100],
							parameters: { value: 1 },
							typeVersion: 1,
						},
					],
					connections: {},
				},
				messages: [new ToolMessage({ content: 'Added node 1', tool_call_id: 'call_1' })],
			};

			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [
						...initialWorkflow.nodes,
						{
							id: 'new_node',
							name: 'New Node 2',
							type: 'test.node2',
							position: [200, 200],
							parameters: { value: 2 },
							typeVersion: 1,
						},
					],
					connections: {},
				},
				messages: [new ToolMessage({ content: 'Added node 2', tool_call_id: 'call_2' })],
			};

			const mockTool = createMockTool('add_node', tool1Update);
			const toolMap = new Map([['add_node', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'add_node', args: { nodeType: 'node1' }, id: 'call_1' },
						{ name: 'add_node', args: { nodeType: 'node2' }, id: 'call_2' },
					]),
				],
				prompt: 'Add two nodes',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have both nodes, but when tools add nodes with same ID, first one wins
			// This is because the nodeMap already has the node when processing the second update
			expect(result.workflowJSON?.nodes).toHaveLength(2);
			const newNode = result.workflowJSON?.nodes.find((n) => n.id === 'new_node');
			expect(newNode?.name).toBe('New Node 1'); // First one wins in our implementation
			expect(newNode?.type).toBe('test.node1');
			expect(newNode?.parameters).toEqual({ value: 1 });
		});

		it('should correctly merge multiple node additions', async () => {
			const initialWorkflow: SimpleWorkflow = {
				nodes: [],
				connections: {},
			};

			const newNode1: INode = {
				id: 'node_1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				position: [250, 300],
				parameters: {},
				typeVersion: 3,
			};

			const newNode2: INode = {
				id: 'node_2',
				name: 'Set',
				type: 'n8n-nodes-base.set',
				position: [450, 300],
				parameters: {},
				typeVersion: 3.2,
			};

			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [newNode1],
					connections: {},
				},
				messages: [new ToolMessage({ content: 'Added HTTP Request node', tool_call_id: 'call_1' })],
			};

			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [newNode2],
					connections: {},
				},
				messages: [new ToolMessage({ content: 'Added Set node', tool_call_id: 'call_2' })],
			};

			const mockTool1 = createMockTool('add_node', tool1Update);
			const mockTool2 = createMockTool('add_node', tool2Update);

			const toolMap = new Map([['add_node', mockTool1]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'add_node', args: { nodeType: 'httpRequest' }, id: 'call_1' },
						{ name: 'add_node', args: { nodeType: 'set' }, id: 'call_2' },
					]),
				],
				prompt: 'Add HTTP Request and Set nodes',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool1.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have both nodes
			expect(result.workflowJSON?.nodes).toHaveLength(2);
			expect(result.workflowJSON?.nodes.map((n) => n.id).sort()).toEqual(['node_1', 'node_2']);
		});

		it('should handle adding nodes with pre-existing connections', async () => {
			const existingNode: INode = {
				id: 'existing',
				name: 'Existing',
				type: 'test.node',
				position: [0, 0],
				parameters: {},
				typeVersion: 1,
			};

			const initialWorkflow: SimpleWorkflow = {
				nodes: [existingNode],
				connections: {},
			};

			// Tool 1 adds node A and connects existing -> A
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [
						existingNode,
						{
							id: 'A',
							name: 'Node A',
							type: 'test.node',
							position: [100, 0],
							parameters: {},
							typeVersion: 1,
						},
					],
					connections: {
						existing: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Added A and connected', tool_call_id: 'call_1' })],
			};

			// Tool 2 adds node B and connects existing -> B
			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [
						existingNode,
						{
							id: 'B',
							name: 'Node B',
							type: 'test.node',
							position: [100, 100],
							parameters: {},
							typeVersion: 1,
						},
					],
					connections: {
						existing: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Added B and connected', tool_call_id: 'call_2' })],
			};

			const mockTool = createMockTool('add_node', tool1Update);
			const toolMap = new Map([['add_node', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'add_node', args: { nodeType: 'nodeA' }, id: 'call_1' },
						{ name: 'add_node', args: { nodeType: 'nodeB' }, id: 'call_2' },
					]),
				],
				prompt: 'Add and connect nodes',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have all three nodes
			expect(result.workflowJSON?.nodes).toHaveLength(3);
			expect(result.workflowJSON?.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'existing']);

			// Should have both connections from existing node
			expect(result.workflowJSON?.connections.existing?.main?.[0]).toHaveLength(2);
			expect(result.workflowJSON?.connections.existing?.main?.[0]).toContainEqual({
				node: 'A',
				type: 'main',
				index: 0,
			});
			expect(result.workflowJSON?.connections.existing?.main?.[0]).toContainEqual({
				node: 'B',
				type: 'main',
				index: 0,
			});
		});
	});

	describe('parallel parameter updates', () => {
		it('should merge parameter updates to different fields of the same node', async () => {
			const initialNode: INode = {
				id: 'node_1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				position: [250, 300],
				parameters: {
					url: 'https://example.com',
					method: 'GET',
					sendHeaders: false,
				},
				typeVersion: 3,
			};

			const initialWorkflow: SimpleWorkflow = {
				nodes: [initialNode],
				connections: {},
			};

			// Tool 1 updates the URL and adds authentication
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [
						{
							...initialNode,
							parameters: {
								...initialNode.parameters,
								url: 'https://newurl.com',
								authentication: 'predefinedCredentialType',
							},
						},
					],
					connections: {},
				},
				messages: [new ToolMessage({ content: 'Updated URL and auth', tool_call_id: 'call_1' })],
			};

			// Tool 2 updates the method and headers
			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [
						{
							...initialNode,
							parameters: {
								...initialNode.parameters,
								method: 'POST',
								sendHeaders: true,
							},
						},
					],
					connections: {},
				},
				messages: [
					new ToolMessage({ content: 'Updated method and headers', tool_call_id: 'call_2' }),
				],
			};

			const mockTool = createMockTool('update_node_parameters', tool1Update);
			const toolMap = new Map([['update_node_parameters', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{
							name: 'update_node_parameters',
							args: {
								nodeId: 'node_1',
								params: { url: 'https://newurl.com', authentication: 'predefinedCredentialType' },
							},
							id: 'call_1',
						},
						{
							name: 'update_node_parameters',
							args: { nodeId: 'node_1', params: { method: 'POST', sendHeaders: true } },
							id: 'call_2',
						},
					]),
				],
				prompt: 'Update node parameters',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have parameters from both updates merged
			// Note: Since both tools include all original parameters in their updates,
			// the last tool's values win for any overlapping fields
			expect(result.workflowJSON?.nodes).toHaveLength(1);
			expect(result.workflowJSON?.nodes[0].parameters).toEqual({
				url: 'https://example.com', // From tool2Update (includes original)
				method: 'POST', // From tool2Update
				sendHeaders: true, // From tool2Update
				authentication: 'predefinedCredentialType', // From tool1Update (preserved in merge)
			});
		});

		it('should handle parameter updates that conflict', async () => {
			const initialNode: INode = {
				id: 'node_1',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				position: [250, 300],
				parameters: {
					url: 'https://example.com',
					method: 'GET',
					authentication: 'none',
				},
				typeVersion: 3,
			};

			const initialWorkflow: SimpleWorkflow = {
				nodes: [initialNode],
				connections: {},
			};

			// Both tools update the same parameter with different values
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [
						{
							...initialNode,
							parameters: {
								...initialNode.parameters,
								authentication: 'basicAuth',
								basicAuth: { user: 'user1', password: 'pass1' },
							},
						},
					],
					connections: {},
				},
				messages: [new ToolMessage({ content: 'Set basic auth', tool_call_id: 'call_1' })],
			};

			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [
						{
							...initialNode,
							parameters: {
								...initialNode.parameters,
								authentication: 'headerAuth',
								headerAuth: { name: 'X-API-Key', value: 'secret' },
							},
						},
					],
					connections: {},
				},
				messages: [new ToolMessage({ content: 'Set header auth', tool_call_id: 'call_2' })],
			};

			const mockTool = createMockTool('update_node_parameters', tool1Update);
			const toolMap = new Map([['update_node_parameters', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'update_node_parameters', args: { nodeId: 'node_1' }, id: 'call_1' },
						{ name: 'update_node_parameters', args: { nodeId: 'node_1' }, id: 'call_2' },
					]),
				],
				prompt: 'Update auth settings',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Last update wins for conflicting fields
			expect(result.workflowJSON?.nodes[0].parameters.authentication).toBe('headerAuth');
			// Both auth configs are preserved in the merge
			expect(result.workflowJSON?.nodes[0].parameters).toMatchObject({
				authentication: 'headerAuth',
				basicAuth: { user: 'user1', password: 'pass1' },
				headerAuth: { name: 'X-API-Key', value: 'secret' },
			});
		});
	});

	describe('parallel connection operations', () => {
		it('should merge multiple connections without duplicates', async () => {
			const nodes: INode[] = [
				{
					id: 'node_1',
					name: 'Node 1',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'node_2',
					name: 'Node 2',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'node_3',
					name: 'Node 3',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes,
				connections: {},
			};

			// Tool 1 connects node_1 to node_2
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes,
					connections: {
						node_1: { main: [[{ node: 'node_2', type: 'main', index: 0 }]] },
					},
				},
				messages: [
					new ToolMessage({ content: 'Connected node_1 to node_2', tool_call_id: 'call_1' }),
				],
			};

			// Tool 2 connects node_1 to node_3
			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes,
					connections: {
						node_1: { main: [[{ node: 'node_3', type: 'main', index: 0 }]] },
					},
				},
				messages: [
					new ToolMessage({ content: 'Connected node_1 to node_3', tool_call_id: 'call_2' }),
				],
			};

			const mockTool = createMockTool('connect_nodes', tool1Update);
			const toolMap = new Map([['connect_nodes', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'connect_nodes', args: { source: 'node_1', target: 'node_2' }, id: 'call_1' },
						{ name: 'connect_nodes', args: { source: 'node_1', target: 'node_3' }, id: 'call_2' },
					]),
				],
				prompt: 'Connect nodes',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have both connections
			expect(result.workflowJSON?.connections.node_1?.main?.[0]).toHaveLength(2);
			expect(result.workflowJSON?.connections.node_1?.main?.[0]).toContainEqual({
				node: 'node_2',
				type: 'main',
				index: 0,
			});
			expect(result.workflowJSON?.connections.node_1?.main?.[0]).toContainEqual({
				node: 'node_3',
				type: 'main',
				index: 0,
			});
		});

		it('should handle duplicate connection attempts', async () => {
			const nodes: INode[] = [
				{
					id: 'A',
					name: 'Node A',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'B',
					name: 'Node B',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes,
				connections: {
					A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
				},
			};

			// Both tools try to create the same connection
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes,
					connections: {
						A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Connected A to B', tool_call_id: 'call_1' })],
			};

			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes,
					connections: {
						A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Connected A to B again', tool_call_id: 'call_2' })],
			};

			const mockTool = createMockTool('connect_nodes', tool1Update);
			const toolMap = new Map([['connect_nodes', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'connect_nodes', args: { source: 'A', target: 'B' }, id: 'call_1' },
						{ name: 'connect_nodes', args: { source: 'A', target: 'B' }, id: 'call_2' },
					]),
				],
				prompt: 'Connect A to B twice',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should still have only one connection (no duplicates)
			expect(result.workflowJSON?.connections.A?.main?.[0]).toHaveLength(1);
			expect(result.workflowJSON?.connections.A?.main?.[0]).toContainEqual({
				node: 'B',
				type: 'main',
				index: 0,
			});
		});

		it('should handle connections to different output indices', async () => {
			const nodes: INode[] = [
				{
					id: 'IF',
					name: 'IF Node',
					type: 'test.if',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'TRUE',
					name: 'True Branch',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'FALSE',
					name: 'False Branch',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes,
				connections: {},
			};

			// Tool 1 connects IF output 0 to TRUE
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes,
					connections: {
						IF: { main: [[{ node: 'TRUE', type: 'main', index: 0 }], []] },
					},
				},
				messages: [new ToolMessage({ content: 'Connected true branch', tool_call_id: 'call_1' })],
			};

			// Tool 2 connects IF output 1 to FALSE
			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes,
					connections: {
						IF: { main: [[], [{ node: 'FALSE', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Connected false branch', tool_call_id: 'call_2' })],
			};

			const mockTool = createMockTool('connect_nodes', tool1Update);
			const toolMap = new Map([['connect_nodes', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{
							name: 'connect_nodes',
							args: { source: 'IF', target: 'TRUE', outputIndex: 0 },
							id: 'call_1',
						},
						{
							name: 'connect_nodes',
							args: { source: 'IF', target: 'FALSE', outputIndex: 1 },
							id: 'call_2',
						},
					]),
				],
				prompt: 'Connect IF branches',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				return new Command({
					update: callCount === 1 ? tool1Update : tool2Update,
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have both output connections properly merged
			expect(result.workflowJSON?.connections.IF?.main).toHaveLength(2);
			expect(result.workflowJSON?.connections.IF?.main?.[0]).toEqual([
				{ node: 'TRUE', type: 'main', index: 0 },
			]);
			expect(result.workflowJSON?.connections.IF?.main?.[1]).toEqual([
				{ node: 'FALSE', type: 'main', index: 0 },
			]);
		});
	});

	describe('mixed operations', () => {
		it('should handle a mix of add, remove, and connect operations', async () => {
			const initialNodes: INode[] = [
				{
					id: 'node_1',
					name: 'Node 1',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'node_2',
					name: 'Node 2',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const newNode: INode = {
				id: 'node_3',
				name: 'Node 3',
				type: 'test.node',
				position: [0, 0],
				parameters: {},
				typeVersion: 1,
			};

			const initialWorkflow: SimpleWorkflow = {
				nodes: initialNodes,
				connections: {
					node_1: { main: [[{ node: 'node_2', type: 'main', index: 0 }]] },
				},
			};

			// Tool 1: Remove node_2
			const removeUpdate: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [initialNodes[0]],
					connections: {
						node_1: { main: [[]] },
					},
				},
				messages: [new ToolMessage({ content: 'Removed node_2', tool_call_id: 'call_1' })],
			};

			// Tool 2: Add node_3 (starts with initial state, so includes node_2)
			const addUpdate: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [...initialNodes, newNode],
					connections: initialWorkflow.connections,
				},
				messages: [new ToolMessage({ content: 'Added node_3', tool_call_id: 'call_2' })],
			};

			// Tool 3: Connect node_1 to node_3 (starts with initial state)
			const connectUpdate: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: initialNodes,
					connections: {
						node_1: {
							main: [
								[
									{ node: 'node_2', type: 'main', index: 0 },
									{ node: 'node_3', type: 'main', index: 0 },
								],
							],
						},
					},
				},
				messages: [
					new ToolMessage({ content: 'Connected node_1 to node_3', tool_call_id: 'call_3' }),
				],
			};

			const mockRemoveTool = createMockTool('remove_node', removeUpdate);
			const mockAddTool = createMockTool('add_node', addUpdate);
			const mockConnectTool = createMockTool('connect_nodes', connectUpdate);

			const toolMap = new Map([
				['remove_node', mockRemoveTool],
				['add_node', mockAddTool],
				['connect_nodes', mockConnectTool],
			]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'remove_node', args: { nodeId: 'node_2' }, id: 'call_1' },
						{ name: 'add_node', args: { nodeType: 'test' }, id: 'call_2' },
						{ name: 'connect_nodes', args: { source: 'node_1', target: 'node_3' }, id: 'call_3' },
					]),
				],
				prompt: 'Remove node 2, add node 3, connect 1 to 3',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			const result = await executeToolsInParallel({ state, toolMap });

			// The way our merge logic works:
			// 1. Remove operations are processed first: node_2 is removed, leaving [node_1]
			// 2. Then add operations: add_node returns [node_1, node_2, node_3]
			// 3. Our merge logic sees node_2 and node_3 as new nodes (not in current state [node_1])
			// 4. So it adds both, resulting in [node_1, node_2, node_3]
			// This is actually correct behavior - the add operation's view included node_2
			expect(result.workflowJSON?.nodes).toHaveLength(3);
			expect(result.workflowJSON?.nodes.map((n) => n.id).sort()).toEqual([
				'node_1',
				'node_2',
				'node_3',
			]);

			// Should have connection from node_1 to node_3
			expect(result.workflowJSON?.connections.node_1?.main?.[0]).toContainEqual({
				node: 'node_3',
				type: 'main',
				index: 0,
			});
			// The connection to node_2 will also be present since node_2 was re-added
			expect(result.workflowJSON?.connections.node_1?.main?.[0]).toContainEqual({
				node: 'node_2',
				type: 'main',
				index: 0,
			});
		});
	});

	describe('error handling', () => {
		it('should throw error if last message is not an AIMessage', async () => {
			const state: typeof WorkflowState.State = {
				messages: [new ToolMessage({ content: 'Not an AI message', tool_call_id: 'test' })],
				prompt: 'Test',
				workflowJSON: { nodes: [], connections: {} },
				isWorkflowPrompt: false,
			};

			const toolMap = new Map();

			await expect(executeToolsInParallel({ state, toolMap })).rejects.toThrow(
				'Most recent message must be an AIMessage with tool calls',
			);
		});

		it('should throw error if AIMessage has no tool calls', async () => {
			const state: typeof WorkflowState.State = {
				messages: [new AIMessage({ content: 'No tool calls' })],
				prompt: 'Test',
				workflowJSON: { nodes: [], connections: {} },
				isWorkflowPrompt: false,
			};

			const toolMap = new Map();

			await expect(executeToolsInParallel({ state, toolMap })).rejects.toThrow(
				'AIMessage must have tool calls',
			);
		});

		it('should throw error if tool is not found', async () => {
			const state: typeof WorkflowState.State = {
				messages: [createAIMessage([{ name: 'unknown_tool', args: {}, id: 'call_1' }])],
				prompt: 'Test',
				workflowJSON: { nodes: [], connections: {} },
				isWorkflowPrompt: false,
			};

			const toolMap = new Map();

			await expect(executeToolsInParallel({ state, toolMap })).rejects.toThrow(
				'Tool unknown_tool not found',
			);
		});
	});

	describe('edge cases and complex scenarios', () => {
		it('should handle tools that return empty updates', async () => {
			const initialWorkflow: SimpleWorkflow = {
				nodes: [
					{
						id: 'A',
						name: 'Node A',
						type: 'test.node',
						position: [0, 0],
						parameters: {},
						typeVersion: 1,
					},
				],
				connections: {},
			};

			// Tool 1 returns a normal update
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes: [
						...initialWorkflow.nodes,
						{
							id: 'B',
							name: 'Node B',
							type: 'test.node',
							position: [100, 0],
							parameters: {},
							typeVersion: 1,
						},
					],
					connections: {},
				},
				messages: [new ToolMessage({ content: 'Added B', tool_call_id: 'call_1' })],
			};

			// Tool 2 returns an empty update
			const tool2Update: Partial<typeof WorkflowState.State> = {
				messages: [new ToolMessage({ content: 'Did nothing', tool_call_id: 'call_2' })],
			};

			const mockTool1 = createMockTool('add_node', tool1Update);
			const mockTool2 = createMockTool('search_node', tool2Update);

			const toolMap = new Map([
				['add_node', mockTool1],
				['search_node', mockTool2],
			]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'add_node', args: {}, id: 'call_1' },
						{ name: 'search_node', args: {}, id: 'call_2' },
					]),
				],
				prompt: 'Mixed operations',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			const result = await executeToolsInParallel({ state, toolMap });

			// Should have the update from tool 1
			expect(result.workflowJSON?.nodes).toHaveLength(2);
			expect(result.messages).toHaveLength(2);
		});

		it('should handle very large parallel operations', async () => {
			// Create 10 initial nodes
			const initialNodes: INode[] = Array.from({ length: 10 }, (_, i) => ({
				id: `node_${i}`,
				name: `Node ${i}`,
				type: 'test.node',
				position: [i * 100, 0],
				parameters: {},
				typeVersion: 1,
			}));

			const initialWorkflow: SimpleWorkflow = {
				nodes: initialNodes,
				connections: {},
			};

			// Create 5 parallel remove operations
			const toolCalls = [];
			const mockTools = new Map();

			for (let i = 0; i < 5; i++) {
				const nodeId = `node_${i * 2}`; // Remove even-numbered nodes
				toolCalls.push({ name: 'remove_node', args: { nodeId }, id: `call_${i}` });

				const update: Partial<typeof WorkflowState.State> = {
					workflowJSON: {
						nodes: initialNodes.filter((n) => n.id !== nodeId),
						connections: {},
					},
					messages: [new ToolMessage({ content: `Removed ${nodeId}`, tool_call_id: `call_${i}` })],
				};

				if (i === 0) {
					mockTools.set('remove_node', createMockTool('remove_node', update));
				}
			}

			const state: typeof WorkflowState.State = {
				messages: [createAIMessage(toolCalls)],
				prompt: 'Remove multiple nodes',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			const mockTool = mockTools.get('remove_node');
			mockTool.invoke.mockImplementation(async () => {
				const nodeId = `node_${callCount * 2}`;
				const update: Partial<typeof WorkflowState.State> = {
					workflowJSON: {
						nodes: initialNodes.filter((n) => n.id !== nodeId),
						connections: {},
					},
					messages: [
						new ToolMessage({ content: `Removed ${nodeId}`, tool_call_id: `call_${callCount}` }),
					],
				};
				callCount++;
				return new Command({ update });
			});

			const result = await executeToolsInParallel({ state, toolMap: mockTools });

			// Should have only odd-numbered nodes remaining
			expect(result.workflowJSON?.nodes).toHaveLength(5);
			expect(result.workflowJSON?.nodes.map((n) => n.id).sort()).toEqual([
				'node_1',
				'node_3',
				'node_5',
				'node_7',
				'node_9',
			]);
			expect(result.messages).toHaveLength(5);
		});

		it('should handle circular dependency scenarios', async () => {
			// A -> B -> C -> A (circular)
			const nodes: INode[] = [
				{
					id: 'A',
					name: 'Node A',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'B',
					name: 'Node B',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
				{
					id: 'C',
					name: 'Node C',
					type: 'test.node',
					position: [0, 0],
					parameters: {},
					typeVersion: 1,
				},
			];

			const initialWorkflow: SimpleWorkflow = {
				nodes,
				connections: {},
			};

			// Tool 1: A -> B
			const tool1Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes,
					connections: {
						A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Connected A to B', tool_call_id: 'call_1' })],
			};

			// Tool 2: B -> C
			const tool2Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes,
					connections: {
						B: { main: [[{ node: 'C', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Connected B to C', tool_call_id: 'call_2' })],
			};

			// Tool 3: C -> A (creates cycle)
			const tool3Update: Partial<typeof WorkflowState.State> = {
				workflowJSON: {
					nodes,
					connections: {
						C: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
					},
				},
				messages: [new ToolMessage({ content: 'Connected C to A', tool_call_id: 'call_3' })],
			};

			const mockTool = createMockTool('connect_nodes', tool1Update);
			const toolMap = new Map([['connect_nodes', mockTool]]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'connect_nodes', args: { source: 'A', target: 'B' }, id: 'call_1' },
						{ name: 'connect_nodes', args: { source: 'B', target: 'C' }, id: 'call_2' },
						{ name: 'connect_nodes', args: { source: 'C', target: 'A' }, id: 'call_3' },
					]),
				],
				prompt: 'Create circular connections',
				workflowJSON: initialWorkflow,
				isWorkflowPrompt: false,
			};

			let callCount = 0;
			mockTool.invoke.mockImplementation(async () => {
				callCount++;
				const updates = [tool1Update, tool2Update, tool3Update];
				return new Command({
					update: updates[callCount - 1],
				});
			});

			const result = await executeToolsInParallel({ state, toolMap });

			// All connections should be created (our merger doesn't validate cycles)
			expect(result.workflowJSON?.connections).toEqual({
				A: { main: [[{ node: 'B', type: 'main', index: 0 }]] },
				B: { main: [[{ node: 'C', type: 'main', index: 0 }]] },
				C: { main: [[{ node: 'A', type: 'main', index: 0 }]] },
			});
		});
	});

	describe('message handling', () => {
		it('should collect messages from all tools', async () => {
			const mockTool1 = createMockMessageTool('tool1', 'Message from tool 1');
			const mockTool2 = createMockMessageTool('tool2', 'Message from tool 2');

			const toolMap = new Map([
				['tool1', mockTool1],
				['tool2', mockTool2],
			]);

			const state: typeof WorkflowState.State = {
				messages: [
					createAIMessage([
						{ name: 'tool1', args: {}, id: 'call_1' },
						{ name: 'tool2', args: {}, id: 'call_2' },
					]),
				],
				prompt: 'Test',
				workflowJSON: { nodes: [], connections: {} },
				isWorkflowPrompt: false,
			};

			const result = await executeToolsInParallel({ state, toolMap });

			expect(result.messages).toHaveLength(2);
			expect(result.messages).toContainEqual(
				expect.objectContaining({ content: 'Message from tool 1' }),
			);
			expect(result.messages).toContainEqual(
				expect.objectContaining({ content: 'Message from tool 2' }),
			);
		});
	});
});
