import { describe, it, expect, beforeEach } from '@jest/globals';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import type { WorkflowState } from '../../workflow-state';
import { ConnectNodesTool } from '../connect-nodes.tool';
import { createMockToolContext } from './test-utils/mock-context';
import { createMockNodeTypes } from './test-utils/node-mocks';

describe('ConnectNodesTool', () => {
	let nodeTypes: INodeTypeDescription[];
	let tool: ConnectNodesTool;
	let mockState: typeof WorkflowState.State;

	beforeEach(() => {
		nodeTypes = createMockNodeTypes();
		tool = new ConnectNodesTool(nodeTypes);
		mockState = {
			messages: [],
			prompt: '',
			workflowJSON: {
				nodes: [
					{
						id: 'node_1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [100, 100],
						parameters: {},
					},
					{
						id: 'node_2',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 100],
						parameters: {},
					},
					{
						id: 'node_3',
						name: 'AI Agent',
						type: '@n8n/n8n-nodes-langchain.agent',
						typeVersion: 1,
						position: [500, 100],
						parameters: {},
					},
					{
						id: 'node_4',
						name: 'OpenAI Chat Model',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						typeVersion: 1,
						position: [500, 250],
						parameters: {},
					},
					{
						id: 'node_5',
						name: 'Calculator Tool',
						type: '@n8n/n8n-nodes-langchain.toolCalculator',
						typeVersion: 1,
						position: [300, 250],
						parameters: {},
					},
				],
				connections: {},
			},
			isWorkflowPrompt: false,
		};
	});

	describe('execute', () => {
		it('should connect two main nodes successfully', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					sourceNodeId: 'node_1',
					targetNodeId: 'node_2',
					connectionType: NodeConnectionTypes.Main,
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.sourceNode).toBe('HTTP Request');
				expect(result.data.targetNode).toBe('Set');
				expect(result.data.connectionType).toBe(NodeConnectionTypes.Main);
				expect(result.data.swapped).toBe(false);
				if (result.stateUpdates) {
					const updates =
						typeof result.stateUpdates === 'function'
							? result.stateUpdates(mockState)
							: result.stateUpdates;
					expect(updates.workflowJSON?.connections).toHaveProperty('HTTP Request');
				}
			}
		});

		it('should auto-swap nodes for AI connections when needed', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			// Incorrectly specify AI Agent as source and OpenAI Model as target
			const result = await tool['execute'](
				{
					sourceNodeId: 'node_3', // AI Agent (main node)
					targetNodeId: 'node_4', // OpenAI Chat Model (sub-node)
					connectionType: NodeConnectionTypes.AiLanguageModel,
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				// Should be swapped: OpenAI Model (sub-node) as source, AI Agent as target
				expect(result.data.sourceNode).toBe('OpenAI Chat Model');
				expect(result.data.targetNode).toBe('AI Agent');
				expect(result.data.swapped).toBe(true);
				expect(result.data.message).toContain('Auto-corrected connection');
			}
		});

		it('should connect AI tool to agent correctly', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					sourceNodeId: 'node_5', // Calculator Tool (sub-node)
					targetNodeId: 'node_3', // AI Agent
					connectionType: NodeConnectionTypes.AiTool,
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.sourceNode).toBe('Calculator Tool');
				expect(result.data.targetNode).toBe('AI Agent');
				expect(result.data.swapped).toBe(false);
			}
		});

		it('should handle non-existent source node', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					sourceNodeId: 'non_existent',
					targetNodeId: 'node_2',
					connectionType: NodeConnectionTypes.Main,
				},
				mockContext,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('not found');
				expect(result.error.code).toBe('NODES_NOT_FOUND');
				expect(result.error.details?.foundSource).toBe(false);
				expect(result.error.details?.foundTarget).toBe(true);
			}
		});

		it('should handle non-existent target node', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					sourceNodeId: 'node_1',
					targetNodeId: 'non_existent',
					connectionType: NodeConnectionTypes.Main,
				},
				mockContext,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe('NODES_NOT_FOUND');
				expect(result.error.details?.foundSource).toBe(true);
				expect(result.error.details?.foundTarget).toBe(false);
			}
		});

		it('should reject AI connection between two main nodes', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					sourceNodeId: 'node_1', // HTTP Request (main node)
					targetNodeId: 'node_2', // Set (main node)
					connectionType: NodeConnectionTypes.AiLanguageModel,
				},
				mockContext,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe('INVALID_CONNECTION');
				expect(result.error.message).toContain('requires a sub-node');
			}
		});

		it('should use custom output and input indices', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					sourceNodeId: 'node_1',
					targetNodeId: 'node_2',
					connectionType: NodeConnectionTypes.Main,
					sourceOutputIndex: 1,
					targetInputIndex: 2,
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success && result.stateUpdates) {
				const updates =
					typeof result.stateUpdates === 'function'
						? result.stateUpdates(mockState)
						: result.stateUpdates;
				const connections = updates.workflowJSON?.connections?.['HTTP Request'];
				expect(connections).toBeDefined();
				expect(connections?.main?.[1]).toBeDefined();
				expect(connections?.main?.[1]?.[0]).toEqual({
					node: 'Set',
					type: NodeConnectionTypes.Main,
					index: 2,
				});
			}
		});

		it('should preserve existing connections when adding new ones', async () => {
			// Pre-populate with existing connection
			mockState.workflowJSON.connections = {
				'HTTP Request': {
					main: [[{ node: 'Some Other Node', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			};

			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					sourceNodeId: 'node_1',
					targetNodeId: 'node_2',
					connectionType: NodeConnectionTypes.Main,
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success && result.stateUpdates) {
				const updates =
					typeof result.stateUpdates === 'function'
						? result.stateUpdates(mockState)
						: result.stateUpdates;
				const connections = updates.workflowJSON?.connections?.['HTTP Request'];
				expect(connections).toBeDefined();
				expect(connections?.main?.[0]).toHaveLength(2); // Should have both connections
				expect(connections?.main?.[0]).toContainEqual({
					node: 'Some Other Node',
					type: NodeConnectionTypes.Main,
					index: 0,
				});
				expect(connections?.main?.[0]).toContainEqual({
					node: 'Set',
					type: NodeConnectionTypes.Main,
					index: 0,
				});
			}
		});
	});

	describe('formatSuccessMessage', () => {
		it('should return the message from output', () => {
			const output = {
				sourceNode: 'Source',
				targetNode: 'Target',
				connectionType: NodeConnectionTypes.Main,
				swapped: false,
				message: 'Test connection message',
				found: { sourceNode: true, targetNode: true },
			};

			const message = tool['formatSuccessMessage'](output);
			expect(message).toBe('Test connection message');
		});
	});

	describe('tool metadata', () => {
		it('should have correct name and description', () => {
			expect(tool['name']).toBe('connect_nodes');
			expect(tool['description']).toContain('Connect two nodes in the workflow');
			expect(tool['description']).toContain('AUTO-CORRECT');
		});
	});
});
