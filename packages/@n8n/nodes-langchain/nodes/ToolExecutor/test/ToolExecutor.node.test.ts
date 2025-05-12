import { DynamicTool, DynamicStructuredTool } from '@langchain/core/tools';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { z } from 'zod';

import { ToolExecutor } from '../ToolExecutor.node';

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
				if (param === 'query') return 'test input';
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
				if (param === 'query') return { number: '42', boolean: 'true' };
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
				if (param === 'query') return 'test input';
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
				if (param === 'query') return '{"key": "value"}';
				return '';
			});

			const result = await node.execute.call(mockExecuteFunction);

			expect(mockTool.invoke).toHaveBeenCalledWith({ key: 'value' });
			expect(result).toEqual([[{ json: 'json result' }]]);
		});
	});
});
