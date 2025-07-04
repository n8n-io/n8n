import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription, INode } from 'n8n-workflow';

import type { WorkflowState } from '../../workflow-state';
import { createMockToolContext } from '../test-utils/mock-context';
import { createMockNodeTypes } from '../test-utils/node-mocks';
import { UpdateNodeParametersTool } from '../update-node-parameters.tool';

// Mock the parameter updater chain
jest.mock('../../chains/parameter-updater', () => ({
	parameterUpdaterChain: jest.fn(() => ({
		invoke: jest.fn(),
	})),
}));

describe('UpdateNodeParametersTool', () => {
	let nodeTypes: INodeTypeDescription[];
	let tool: UpdateNodeParametersTool;
	let mockState: typeof WorkflowState.State;
	let mockLlm: BaseChatModel;
	let mockChainInvoke: jest.Mock;

	beforeEach(() => {
		// Reset mocks
		jest.clearAllMocks();

		// Import and setup chain mock
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { parameterUpdaterChain } = require('../../chains/parameter-updater');
		mockChainInvoke = jest.fn();
		(parameterUpdaterChain as jest.Mock).mockReturnValue({
			invoke: mockChainInvoke,
		});

		nodeTypes = createMockNodeTypes();
		tool = new UpdateNodeParametersTool(nodeTypes);

		// Create mock LLM
		mockLlm = {
			bindTools: jest.fn(),
		} as unknown as BaseChatModel;

		mockState = {
			messages: [],
			prompt: 'Create a workflow to fetch weather data',
			workflowJSON: {
				nodes: [
					{
						id: 'node_1',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [100, 100],
						parameters: {
							url: 'https://api.example.com',
							method: 'GET',
						},
					},
					{
						id: 'node_2',
						name: 'Set',
						type: 'n8n-nodes-base.set',
						typeVersion: 1,
						position: [300, 100],
						parameters: {
							assignments: {
								assignments: [
									{
										id: 'id1',
										name: 'status',
										value: 'pending',
										type: 'string',
									},
								],
							},
						},
					},
					{
						id: 'node_3',
						name: 'IF',
						type: 'n8n-nodes-base.if',
						typeVersion: 1,
						position: [500, 100],
						parameters: {
							conditions: {
								conditions: [],
							},
						},
					},
				],
				connections: {},
			},
			isWorkflowPrompt: false,
		};
	});

	describe('execute', () => {
		it('should update node parameters successfully', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);
			// Add LLM to context
			mockContext.llm = mockLlm;

			// Mock chain response
			mockChainInvoke.mockResolvedValue({
				url: 'https://api.weather.com/v1/weather?city=London',
				method: 'GET',
				sendHeaders: true,
				headerParameters: {
					parameters: [
						{
							name: 'X-API-Key',
							value: '={{ $credentials.weatherApiKey }}',
						},
					],
				},
			});

			const result = await tool['execute'](
				{
					nodeId: 'node_1',
					changes: ['Set the URL to call the weather API for London', 'Add API key header'],
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.nodeId).toBe('node_1');
				expect(result.data.nodeName).toBe('HTTP Request');
				expect(result.data.nodeType).toBe('n8n-nodes-base.httpRequest');
				expect(result.data.updatedParameters).toHaveProperty('url');
				expect(result.data.updatedParameters.url).toContain('weather');
				expect(result.data.updatedParameters).toHaveProperty('sendHeaders', true);
				expect(result.data.appliedChanges).toHaveLength(2);
				expect(result.data.message).toContain('Successfully updated parameters');
			}
		});

		it('should handle non-existent node ID', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);
			(mockContext as any).llm = mockLlm;

			const result = await tool['execute'](
				{
					nodeId: 'non_existent',
					changes: ['Update something'],
				},
				mockContext,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('not found');
				expect(result.error.code).toBe('NODE_NOT_FOUND');
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				expect(result.error.details?.nodeId).toBe('non_existent');
			}
		});

		it('should handle missing LLM in context', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);
			// Don't add LLM to context

			const result = await tool['execute'](
				{
					nodeId: 'node_1',
					changes: ['Update URL'],
				},
				mockContext,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe('LLM_NOT_AVAILABLE');
				expect(result.error.message).toContain('LLM is required');
			}
		});

		it('should update Set node assignments', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);
			(mockContext as any).llm = mockLlm;

			// Mock chain response for Set node
			mockChainInvoke.mockResolvedValue({
				assignments: {
					assignments: [
						{
							id: 'id1',
							name: 'status',
							value: 'completed',
							type: 'string',
						},
						{
							id: 'id2',
							name: 'timestamp',
							value: '={{ $now.toISO() }}',
							type: 'string',
						},
					],
				},
			});

			const result = await tool['execute'](
				{
					nodeId: 'node_2',
					changes: ['Change status to completed', 'Add timestamp field with current time'],
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.nodeType).toBe('n8n-nodes-base.set');
				const assignments = result.data.updatedParameters.assignments as {
					assignments: Array<{ id: string; name: string; value: string; type: string }>;
				};
				expect(assignments.assignments).toHaveLength(2);
				expect(assignments.assignments[0].value).toBe('completed');
				expect(assignments.assignments[1].name).toBe('timestamp');
			}
		});

		it('should update IF node conditions', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);
			mockContext.llm = mockLlm;

			// Mock chain response for IF node
			mockChainInvoke.mockResolvedValue({
				conditions: {
					options: {
						caseSensitive: false,
						leftValue: '',
						typeValidation: 'loose',
					},
					conditions: [
						{
							leftValue: "={{ $('HTTP Request').item.json.temperature }}",
							rightValue: 25,
							operator: {
								type: 'number',
								operation: 'gt',
							},
						},
					],
					combinator: 'and',
				},
			});

			const result = await tool['execute'](
				{
					nodeId: 'node_3',
					changes: ['Check if temperature is greater than 25'],
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.nodeType).toBe('n8n-nodes-base.if');
				const conditions = result.data.updatedParameters.conditions as {
					conditions: Array<{
						leftValue: string;
						rightValue: number;
						operator: { type: string; operation: string };
					}>;
				};
				expect(conditions.conditions).toHaveLength(1);
				expect(conditions.conditions[0].rightValue).toBe(25);
				expect(conditions.conditions[0].operator.operation).toBe('gt');
			}
		});

		it('should handle chain execution errors', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);
			(mockContext as any).llm = mockLlm;

			// Mock chain to throw error
			mockChainInvoke.mockRejectedValue(new Error('LLM processing failed'));

			const result = await tool['execute'](
				{
					nodeId: 'node_1',
					changes: ['Update URL'],
				},
				mockContext,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.code).toBe('PARAMETER_UPDATE_FAILED');
				expect(result.error.message).toContain('LLM processing failed');
			}
		});

		it('should update workflow state with modified node', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);
			(mockContext as any).llm = mockLlm;

			mockChainInvoke.mockResolvedValue({
				url: 'https://new-api.com',
				method: 'POST',
			});

			const result = await tool['execute'](
				{
					nodeId: 'node_1',
					changes: ['Change to POST request to new API'],
				},
				mockContext,
			);

			expect(result.success).toBe(true);
			if (result.success && result.stateUpdates) {
				const updates =
					typeof result.stateUpdates === 'function'
						? result.stateUpdates(mockState)
						: result.stateUpdates;
				expect(updates.workflowJSON?.nodes).toHaveLength(3);
				const updatedNode = updates.workflowJSON?.nodes.find((n: INode) => n.id === 'node_1');
				expect(updatedNode?.parameters.url).toBe('https://new-api.com');
				expect(updatedNode?.parameters.method).toBe('POST');
			}
		});

		it('should pass correct parameters to chain', async () => {
			const mockContext = createMockToolContext(nodeTypes, () => mockState);
			mockContext.llm = mockLlm;

			mockChainInvoke.mockResolvedValue({});

			await tool['execute'](
				{
					nodeId: 'node_1',
					changes: ['Update URL'],
				},
				mockContext,
			);

			expect(mockChainInvoke).toHaveBeenCalledWith({
				user_workflow_prompt: 'Create a workflow to fetch weather data',
				workflow_json: expect.any(String),
				node_id: 'node_1',
				node_name: 'HTTP Request',
				node_type: 'n8n-nodes-base.httpRequest',
				current_parameters: expect.any(String),
				node_definition: expect.stringContaining('Node Type: n8n-nodes-base.httpRequest'),
				changes: '1. Update URL',
			});
		});
	});

	describe('formatSuccessMessage', () => {
		it('should return the message from output', () => {
			const output = {
				nodeId: 'node_1',
				nodeName: 'HTTP Request',
				nodeType: 'n8n-nodes-base.httpRequest',
				updatedParameters: {},
				appliedChanges: ['Change 1', 'Change 2'],
				message: 'Test success message',
			};

			const message = tool['formatSuccessMessage'](output);
			expect(message).toBe('Test success message');
		});
	});

	describe('tool metadata', () => {
		it('should have correct name and description', () => {
			expect(tool['name']).toBe('update_node_parameters');
			expect(tool['description']).toContain('Update the parameters of an existing node');
			expect(tool['description']).toContain('natural language changes');
		});
	});
});
