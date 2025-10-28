import { NodeConnectionTypes } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';
import type { DynamicStructuredTool, Tool } from 'langchain/tools';

import { createEngineRequests } from '@utils/agent-execution';

describe('createEngineRequests', () => {
	it('should create engine request from tool call', async () => {
		const mockTool = mock<DynamicStructuredTool>();
		mockTool.name = 'test_tool';
		mockTool.metadata = { sourceNodeName: 'Test Tool' };

		const toolCalls = [
			{
				tool: 'test_tool',
				toolInput: { input: 'test data' },
				toolCallId: 'call_123',
			},
		];

		const result = await createEngineRequests(toolCalls, 0, [mockTool]);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			actionType: 'ExecutionNodeAction',
			nodeName: 'Test Tool',
			input: { input: 'test data' },
			type: NodeConnectionTypes.AiTool,
			id: 'call_123',
			metadata: {
				itemIndex: 0,
			},
		});
	});

	it('should filter out tool calls with no matching tool', async () => {
		const mockTool = mock<DynamicStructuredTool>();
		mockTool.name = 'test_tool';
		mockTool.metadata = { sourceNodeName: 'Test Tool' };

		const toolCalls = [
			{
				tool: 'non_existent_tool',
				toolInput: { input: 'test data' },
				toolCallId: 'call_123',
			},
		];

		const result = await createEngineRequests(toolCalls, 0, [mockTool]);

		expect(result).toHaveLength(0);
	});

	it('should filter out tool calls with no nodeName in metadata', async () => {
		const mockTool = mock<DynamicStructuredTool>();
		mockTool.name = 'test_tool';
		mockTool.metadata = {}; // No sourceNodeName

		const toolCalls = [
			{
				tool: 'test_tool',
				toolInput: { input: 'test data' },
				toolCallId: 'call_123',
			},
		];

		const result = await createEngineRequests(toolCalls, 0, [mockTool]);

		expect(result).toHaveLength(0);
	});

	it('should handle multiple tool calls', async () => {
		const mockTool1 = mock<DynamicStructuredTool>();
		mockTool1.name = 'test_tool_1';
		mockTool1.metadata = { sourceNodeName: 'Test Tool 1' };

		const mockTool2 = mock<DynamicStructuredTool>();
		mockTool2.name = 'test_tool_2';
		mockTool2.metadata = { sourceNodeName: 'Test Tool 2' };

		const toolCalls = [
			{
				tool: 'test_tool_1',
				toolInput: { input: 'data 1' },
				toolCallId: 'call_123',
			},
			{
				tool: 'test_tool_2',
				toolInput: { input: 'data 2' },
				toolCallId: 'call_456',
			},
		];

		const result = await createEngineRequests(toolCalls, 0, [mockTool1, mockTool2]);

		expect(result).toHaveLength(2);
		expect(result[0].nodeName).toBe('Test Tool 1');
		expect(result[1].nodeName).toBe('Test Tool 2');
	});

	it('should include tool name in input for toolkit tools', async () => {
		const mockTool = mock<DynamicStructuredTool>();
		mockTool.name = 'test_tool';
		mockTool.metadata = {
			sourceNodeName: 'Test Toolkit',
			isFromToolkit: true,
		};

		const toolCalls = [
			{
				tool: 'test_tool',
				toolInput: { input: 'test data' },
				toolCallId: 'call_123',
			},
		];

		const result = await createEngineRequests(toolCalls, 0, [mockTool]);

		expect(result).toHaveLength(1);
		expect(result[0].input).toEqual({
			input: 'test data',
			tool: 'test_tool',
		});
	});

	it('should not include tool name in input for non-toolkit tools', async () => {
		const mockTool = mock<DynamicStructuredTool>();
		mockTool.name = 'test_tool';
		mockTool.metadata = {
			sourceNodeName: 'Test Tool',
			isFromToolkit: false,
		};

		const toolCalls = [
			{
				tool: 'test_tool',
				toolInput: { input: 'test data' },
				toolCallId: 'call_123',
			},
		];

		const result = await createEngineRequests(toolCalls, 0, [mockTool]);

		expect(result).toHaveLength(1);
		expect(result[0].input).toEqual({
			input: 'test data',
		});
	});

	it('should set correct itemIndex in metadata', async () => {
		const mockTool = mock<DynamicStructuredTool>();
		mockTool.name = 'test_tool';
		mockTool.metadata = { sourceNodeName: 'Test Tool' };

		const toolCalls = [
			{
				tool: 'test_tool',
				toolInput: { input: 'test data' },
				toolCallId: 'call_123',
			},
		];

		const result = await createEngineRequests(toolCalls, 5, [mockTool]);

		expect(result).toHaveLength(1);
		expect(result[0].metadata.itemIndex).toBe(5);
	});

	it('should handle empty tool calls array', async () => {
		const mockTool = mock<DynamicStructuredTool>();
		mockTool.name = 'test_tool';
		mockTool.metadata = { sourceNodeName: 'Test Tool' };

		const result = await createEngineRequests([], 0, [mockTool]);

		expect(result).toHaveLength(0);
	});

	it('should handle tools as Tool type (not just DynamicStructuredTool)', async () => {
		const mockTool = mock<Tool>();
		mockTool.name = 'test_tool';
		mockTool.metadata = { sourceNodeName: 'Test Tool' };

		const toolCalls = [
			{
				tool: 'test_tool',
				toolInput: { input: 'test data' },
				toolCallId: 'call_123',
			},
		];

		const result = await createEngineRequests(toolCalls, 0, [mockTool]);

		expect(result).toHaveLength(1);
		expect(result[0].nodeName).toBe('Test Tool');
	});

	it('should preserve all tool input properties', async () => {
		const mockTool = mock<DynamicStructuredTool>();
		mockTool.name = 'test_tool';
		mockTool.metadata = { sourceNodeName: 'Test Tool' };

		const toolCalls = [
			{
				tool: 'test_tool',
				toolInput: {
					input: 'test data',
					param1: 'value1',
					param2: 123,
					param3: true,
				},
				toolCallId: 'call_123',
			},
		];

		const result = await createEngineRequests(toolCalls, 0, [mockTool]);

		expect(result).toHaveLength(1);
		expect(result[0].input).toEqual({
			input: 'test data',
			param1: 'value1',
			param2: 123,
			param3: true,
		});
	});
});
