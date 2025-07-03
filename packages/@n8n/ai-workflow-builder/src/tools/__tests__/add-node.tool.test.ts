import { describe, it, expect, beforeEach } from '@jest/globals';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { WorkflowState } from '../../workflow-state';
import { AddNodesTool } from '../add-node.tool';
import { createMockToolContext } from '../test-utils/mock-context';
import { createMockNodeTypes } from '../test-utils/node-mocks';

describe('AddNodesTool', () => {
	let nodeTypes: INodeTypeDescription[];
	let tool: AddNodesTool;
	let mockState: typeof WorkflowState.State;

	beforeEach(() => {
		nodeTypes = createMockNodeTypes();
		tool = new AddNodesTool(nodeTypes);
		mockState = {
			messages: [],
			prompt: '',
			steps: [],
			nodes: [],
			workflowJSON: {
				nodes: [],
				connections: {},
			},
			isWorkflowPrompt: false,
			next: 'PLAN',
		};
	});

	describe('execute', () => {
		it('should add a single node successfully', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					nodes: [
						{
							nodeType: 'n8n-nodes-base.httpRequest',
							name: 'Get Customer Data',
						},
					],
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.addedNodes).toHaveLength(1);
				expect(result.data.addedNodes[0].name).toBe('Get Customer Data');
				expect(result.data.addedNodes[0].type).toBe('n8n-nodes-base.httpRequest');
				expect(result.data.addedNodes[0].displayName).toBe('HTTP Request');
				expect(result.data.errors).toHaveLength(0);
				expect(result.data.successCount).toBe(1);
				expect(result.data.totalRequested).toBe(1);
			}
		});

		it('should add multiple nodes successfully', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					nodes: [
						{
							nodeType: 'n8n-nodes-base.httpRequest',
							name: 'Get API Data',
						},
						{
							nodeType: 'n8n-nodes-base.set',
							name: 'Transform Data',
						},
						{
							nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
							name: 'OpenAI Model',
						},
					],
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.addedNodes).toHaveLength(3);
				expect(result.data.successCount).toBe(3);
				expect(result.data.message).toContain('Successfully added 3 nodes');
				expect(result.data.message).toContain('(sub-node)'); // OpenAI Model is a sub-node
			}
		});

		it('should handle non-existent node types', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					nodes: [
						{
							nodeType: 'non.existent.node',
							name: 'Invalid Node',
						},
					],
				},
				mockContext,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Failed to add nodes');
				expect(result.error.code).toBe('ALL_NODES_FAILED');
				expect(result.error.details?.errors).toContain('Node type "non.existent.node" not found');
			}
		});

		it('should handle partial success', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					nodes: [
						{
							nodeType: 'n8n-nodes-base.httpRequest',
							name: 'Valid Node',
						},
						{
							nodeType: 'invalid.node',
							name: 'Invalid Node',
						},
					],
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.addedNodes).toHaveLength(1);
				expect(result.data.errors).toHaveLength(1);
				expect(result.data.successCount).toBe(1);
				expect(result.data.totalRequested).toBe(2);
				expect(result.data.message).toContain('Successfully added 1 node');
				expect(result.data.message).toContain('Errors:');
			}
		});

		it('should generate unique names for duplicate node names', async () => {
			// Pre-populate state with existing nodes
			mockState.workflowJSON.nodes = [
				{
					id: 'existing_1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [100, 100],
					parameters: {},
				},
			];

			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					nodes: [
						{
							nodeType: 'n8n-nodes-base.httpRequest',
							name: 'HTTP Request',
						},
					],
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.addedNodes[0].name).toBe('HTTP Request1');
			}
		});

		it('should update workflow JSON state', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);

			const result = await tool['execute'](
				{
					nodes: [
						{
							nodeType: 'n8n-nodes-base.httpRequest',
							name: 'Test Node',
						},
					],
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success && result.stateUpdates) {
				const updates =
					typeof result.stateUpdates === 'function'
						? result.stateUpdates(mockState)
						: result.stateUpdates;
				expect(updates.workflowJSON?.nodes).toHaveLength(1);
				expect(updates.workflowJSON?.nodes[0].name).toBe('Test Node');
			}
		});
	});

	describe('buildResponseMessage', () => {
		it('should format message for successful additions', () => {
			const addedNodes = [
				{
					id: 'node_1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					position: [100, 100] as [number, number],
				},
			];

			const message = tool['buildResponseMessage'](addedNodes, [], nodeTypes);

			expect(message).toContain('Successfully added 1 node:');
			expect(message).toContain('- "HTTP Request" (HTTP Request) with ID node_1');
		});

		it('should include sub-node indicator', () => {
			const addedNodes = [
				{
					id: 'node_1',
					name: 'OpenAI Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					displayName: 'OpenAI Chat Model',
					position: [100, 100] as [number, number],
				},
			];

			const message = tool['buildResponseMessage'](addedNodes, [], nodeTypes);

			expect(message).toContain('(sub-node)');
		});

		it('should include errors in message', () => {
			const addedNodes = [
				{
					id: 'node_1',
					name: 'Valid Node',
					type: 'n8n-nodes-base.set',
					displayName: 'Set',
					position: [100, 100] as [number, number],
				},
			];
			const errors = ['Node type "invalid.node" not found'];

			const message = tool['buildResponseMessage'](addedNodes, errors, nodeTypes);

			expect(message).toContain('Successfully added 1 node:');
			expect(message).toContain('Errors:');
			expect(message).toContain('- Node type "invalid.node" not found');
		});
	});

	describe('tool metadata', () => {
		it('should have correct name and description', () => {
			expect(tool['name']).toBe('add_nodes');
			expect(tool['description']).toContain('Add one or more nodes to the workflow canvas');
		});
	});
});
