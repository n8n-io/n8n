// Mock the utility functions before imports
jest.mock('@utils/agent-execution', () => ({
	processHitlResponses: jest.fn(),
	buildResponseMetadata: jest.fn(),
}));

jest.mock('@utils/agent-execution/createEngineRequests', () => ({
	hasGatedToolNodeName: jest.fn(),
	extractHitlMetadata: jest.fn(),
}));

import { DynamicTool, DynamicStructuredTool } from '@langchain/core/tools';
import type { RequestResponseMetadata } from '@utils/agent-execution/types';
import { mock } from 'jest-mock-extended';
import type { EngineResponse, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

import { ToolExecutor } from '../ToolExecutor.node';

const { processHitlResponses, buildResponseMetadata } = jest.requireMock('@utils/agent-execution');
const { hasGatedToolNodeName, extractHitlMetadata } = jest.requireMock(
	'@utils/agent-execution/createEngineRequests',
);

const mockProcessHitlResponses = jest.mocked(processHitlResponses);
const mockBuildResponseMetadata = jest.mocked(buildResponseMetadata);
const mockHasGatedToolNodeName = jest.mocked(hasGatedToolNodeName);
const mockExtractHitlMetadata = jest.mocked(extractHitlMetadata);

describe('ToolExecutor Node', () => {
	let node: ToolExecutor;
	let mockExecuteFunction: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		node = new ToolExecutor();
		mockExecuteFunction = mock<IExecuteFunctions>();

		mockExecuteFunction.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		mockExecuteFunction.getNode.mockReturnValue({
			name: 'Tool Executor',
			typeVersion: 1,
			parameters: {},
		} as INode);

		jest.clearAllMocks();

		// Mock default return for processHitlResponses - no pending HITL tools
		// This must come after clearAllMocks to take effect
		mockProcessHitlResponses.mockReturnValue({
			hasApprovedHitlTools: false,
			pendingGatedToolRequest: null,
		});
	});

	describe('description', () => {
		it('should have the expected properties', () => {
			expect(node.description).toBeDefined();
			expect(node.description.name).toBe('toolExecutor');
			expect(node.description.displayName).toBe('Tool Executor');
			expect(node.description.version).toBe(1);
			expect(node.description.properties).toBeDefined();
			expect(node.description.inputs).toEqual([
				NodeConnectionTypes.Main,
				NodeConnectionTypes.AiTool,
			]);
			expect(node.description.outputs).toEqual([NodeConnectionTypes.Main]);
		});
	});

	describe('ToolExecutor', () => {
		it('should throw error if no tool inputs found', async () => {
			mockExecuteFunction.getInputConnectionData.mockResolvedValue(null);

			await expect(node.execute.call(mockExecuteFunction)).rejects.toThrow(
				new NodeOperationError(mockExecuteFunction.getNode(), 'No tool inputs found'),
			);
		});

		it('executes a basic tool with string input', async () => {
			const mockInvoke = jest.fn().mockResolvedValue('test result');

			const mockTool = new DynamicTool({
				name: 'test_tool',
				description: 'A test tool',
				func: jest.fn(),
			});

			mockTool.invoke = mockInvoke;

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([mockTool]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { test_tool: 'test input' };
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(mockInvoke).toHaveBeenCalledWith('test input');
			expect(result).toEqual([[{ json: 'test result' }]]);
		});

		it('executes a structured tool with schema validation', async () => {
			const mockTool = new DynamicStructuredTool({
				name: 'test_structured_tool',
				description: 'A test structured tool',
				schema: z.object({
					number: z.number(),
					boolean: z.boolean(),
				}),
				func: jest.fn(),
			});

			const mockInvoke = jest.fn().mockResolvedValue('test result');
			mockTool.invoke = mockInvoke;

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([mockTool]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { test_structured_tool: { number: '42', boolean: 'true' } };
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(mockTool.invoke).toHaveBeenCalledWith({ number: 42, boolean: true });
			expect(result).toEqual([[{ json: 'test result' }]]);
		});

		it('executes a specific tool from a toolkit with several tools', async () => {
			const mockTool = new DynamicTool({
				name: 'specific_tool',
				description: 'A specific tool',
				func: jest.fn().mockResolvedValue('specific result'),
			});

			const irrelevantTool = new DynamicTool({
				name: 'other_tool',
				description: 'A specific irrelevant tool',
				func: jest.fn().mockResolvedValue('specific result'),
			});

			mockTool.invoke = jest.fn().mockResolvedValue('specific result');

			const toolkit = {
				getTools: () => [mockTool, irrelevantTool],
			};

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([toolkit]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { specific_tool: 'test input' };
				if (param === 'toolName') return 'specific_tool';
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(mockTool.invoke).toHaveBeenCalledWith('test input');
			expect(result).toEqual([[{ json: 'specific result' }]]);
		});

		it('handles JSON string query inputs', async () => {
			const mockTool = new DynamicTool({
				name: 'json_tool',
				description: 'A tool that handles JSON',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('json result');

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([mockTool]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return '{"json_tool": {"key": "value"}}';
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(mockTool.invoke).toHaveBeenCalledWith({ key: 'value' });
			expect(result).toEqual([[{ json: 'json result' }]]);
		});
	});

	describe('HITL response handling', () => {
		beforeEach(() => {
			mockProcessHitlResponses.mockReset();
			mockBuildResponseMetadata.mockReset();
		});

		it('should return pending gated tool request when HITL tools are approved', async () => {
			const mockPendingRequest = {
				actions: [
					{
						actionType: 'ExecutionNodeAction' as const,
						nodeName: 'test_node',
						input: { test: 'data' },
						type: 'ai_tool',
						id: 'test-id',
						metadata: { itemIndex: 0 },
					},
				],
				metadata: {},
			};

			mockProcessHitlResponses.mockReturnValue({
				hasApprovedHitlTools: true,
				pendingGatedToolRequest: mockPendingRequest,
			});

			const mockResponse: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [],
				metadata: {},
			};
			const result = await node.execute.call(mockExecuteFunction, mockResponse);

			expect(processHitlResponses).toHaveBeenCalledWith(mockResponse, 0);
			expect(result).toEqual(mockPendingRequest);
		});

		it('should continue execution when no approved HITL tools', async () => {
			mockProcessHitlResponses.mockReturnValue({
				hasApprovedHitlTools: false,
				pendingGatedToolRequest: null,
			});

			const mockTool = new DynamicTool({
				name: 'test_tool',
				description: 'A test tool',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('test result');

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([mockTool]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { test_tool: 'test input' };
				return '';
			});

			const mockResponse: EngineResponse<RequestResponseMetadata> = {
				actionResponses: [],
				metadata: {},
			};
			const result = await node.execute.call(mockExecuteFunction, mockResponse);

			expect(processHitlResponses).toHaveBeenCalledWith(mockResponse, 0);
			expect(result).toEqual([[{ json: 'test result' }]]);
		});

		it('should continue execution when processHitlResponses returns undefined pendingGatedToolRequest', async () => {
			mockProcessHitlResponses.mockReturnValue({
				hasApprovedHitlTools: true,
				pendingGatedToolRequest: undefined,
			});

			const mockTool = new DynamicTool({
				name: 'test_tool',
				description: 'A test tool',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('test result');

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([mockTool]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { test_tool: 'test input' };
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(result).toEqual([[{ json: 'test result' }]]);
		});
	});

	describe('Gated tools handling', () => {
		beforeEach(() => {
			mockProcessHitlResponses.mockReset();
			mockHasGatedToolNodeName.mockReset();
			mockExtractHitlMetadata.mockReset();
			mockBuildResponseMetadata.mockReset();

			mockProcessHitlResponses.mockReturnValue({
				hasApprovedHitlTools: false,
				pendingGatedToolRequest: null,
			});
		});

		it('should handle gated tool in toolkit and return engine request', async () => {
			const mockHitlMetadata = {
				tool: 'gated_tool',
				toolInput: { toolParameters: { param: 'value' } },
			};

			mockHasGatedToolNodeName.mockReturnValue(true);
			mockExtractHitlMetadata.mockReturnValue(mockHitlMetadata);
			mockBuildResponseMetadata.mockReturnValue({ test: 'metadata' });

			const mockTool = new DynamicTool({
				name: 'gated_tool',
				description: 'A gated tool',
				func: jest.fn(),
			});

			mockTool.metadata = { gatedToolNodeName: 'hitl_node' };

			const toolkit = {
				getTools: () => [mockTool],
			};

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([toolkit]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query')
					return { gated_tool: { param: 'value' }, hitl_node: { approval: 'pending' } };
				if (param === 'toolName') return 'gated_tool';
				if (param === 'node') return 'hitl_node';
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(hasGatedToolNodeName).toHaveBeenCalledWith(mockTool.metadata);
			expect(extractHitlMetadata).toHaveBeenCalledWith(mockTool.metadata, 'gated_tool', {
				toolParameters: {
					param: 'value',
				},
			});

			// Verify the result is a NodeOutput with actions
			if (
				!result ||
				typeof result !== 'object' ||
				Array.isArray(result) ||
				!('actions' in result)
			) {
				throw new Error('Expected result to be an object with actions');
			}

			expect(result).toHaveProperty('actions');
			expect(result).toHaveProperty('metadata');
			expect(result.actions).toHaveLength(1);
			expect(result.actions[0].nodeName).toBe('hitl_node');
			expect(result.actions[0].actionType).toBe('ExecutionNodeAction');
			expect(result.actions[0].input).toMatchObject({
				tool: 'gated_tool',
				toolParameters: { param: 'value' },
				approval: 'pending',
			});
		});

		it('should not treat tool as gated when hasGatedToolNodeName returns false', async () => {
			mockHasGatedToolNodeName.mockReturnValue(false);

			const mockTool = new DynamicTool({
				name: 'normal_tool',
				description: 'A normal tool',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('normal result');
			mockTool.metadata = {};

			const toolkit = {
				getTools: () => [mockTool],
			};

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([toolkit]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { normal_tool: 'test input' };
				if (param === 'toolName') return 'normal_tool';
				if (param === 'node') return 'some_node';
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(hasGatedToolNodeName).toHaveBeenCalledWith(mockTool.metadata);
			expect(extractHitlMetadata).not.toHaveBeenCalled();
			expect(result).toEqual([[{ json: 'normal result' }]]);
		});

		it('should not treat tool as gated when node parameter is empty', async () => {
			mockHasGatedToolNodeName.mockReturnValue(true);

			const mockTool = new DynamicTool({
				name: 'tool_with_metadata',
				description: 'A tool with gated metadata',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('tool result');
			mockTool.metadata = { gatedToolNodeName: 'hitl_node' };

			const toolkit = {
				getTools: () => [mockTool],
			};

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([toolkit]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { tool_with_metadata: 'test input' };
				if (param === 'toolName') return 'tool_with_metadata';
				if (param === 'node') return '';
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(hasGatedToolNodeName).toHaveBeenCalledWith(mockTool.metadata);
			expect(extractHitlMetadata).not.toHaveBeenCalled();
			expect(result).toEqual([[{ json: 'tool result' }]]);
		});
	});

	describe('Query data extraction', () => {
		beforeEach(() => {
			mockProcessHitlResponses.mockReset();
			mockProcessHitlResponses.mockReturnValue({
				hasApprovedHitlTools: false,
				pendingGatedToolRequest: null,
			});
		});

		it('should extract query data using node name with spaces', async () => {
			const mockTool = new DynamicTool({
				name: 'tool with spaces',
				description: 'A tool with spaces in name',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('result');

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([mockTool]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { tool_with_spaces: { param: 'value' } };
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(mockTool.invoke).toHaveBeenCalledWith({ param: 'value' });
			expect(result).toEqual([[{ json: 'result' }]]);
		});

		it('should extract query data using underscore-converted node name', async () => {
			const mockTool = new DynamicTool({
				name: 'my tool name',
				description: 'A tool with multiple spaces',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('result');

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([mockTool]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { my_tool_name: { data: 'test' } };
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(mockTool.invoke).toHaveBeenCalledWith({ data: 'test' });
			expect(result).toEqual([[{ json: 'result' }]]);
		});

		it('should prefer exact node name match over underscore-converted name', async () => {
			const mockTool = new DynamicTool({
				name: 'test tool',
				description: 'A test tool',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('result');

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([mockTool]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query')
					return {
						'test tool': { exact: 'match' },
						test_tool: { underscore: 'match' },
					};
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			// Should use exact match first
			expect(mockTool.invoke).toHaveBeenCalledWith({ exact: 'match' });
			expect(result).toEqual([[{ json: 'result' }]]);
		});

		it('should handle toolkit tools with query data extraction', async () => {
			const mockTool = new DynamicTool({
				name: 'toolkit tool',
				description: 'A toolkit tool',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('toolkit result');

			const toolkit = {
				getTools: () => [mockTool],
			};

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([toolkit]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { toolkit_tool: { toolkit: 'data' } };
				if (param === 'toolName') return 'toolkit tool';
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(mockTool.invoke).toHaveBeenCalledWith({ toolkit: 'data' });
			expect(result).toEqual([[{ json: 'toolkit result' }]]);
		});

		it('should use empty object when query data is not found for tool', async () => {
			const mockTool = new DynamicTool({
				name: 'missing_tool',
				description: 'A tool not in query',
				func: jest.fn(),
			});
			mockTool.invoke = jest.fn().mockResolvedValue('result');

			mockExecuteFunction.getInputConnectionData.mockResolvedValue([mockTool]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return { other_tool: { param: 'value' } };
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(mockTool.invoke).toHaveBeenCalledWith({});
			expect(result).toEqual([[{ json: 'result' }]]);
		});

		it('should throw error when query JSON is invalid', async () => {
			mockExecuteFunction.getInputConnectionData.mockResolvedValue([]);
			mockExecuteFunction.getNodeParameter.mockImplementation((param) => {
				if (param === 'query') return '{ invalid json }';
				return '';
			});

			await expect(node.execute.call(mockExecuteFunction)).rejects.toThrow(NodeOperationError);
		});
	});
});
