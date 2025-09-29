import { mock } from 'jest-mock-extended';
import { DynamicTool } from 'langchain/tools';
import {
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { ToolCode } from './ToolCode.node';

describe('ToolCode', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should read name from node name on version >=1.2', async () => {
			const node = new ToolCode();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ typeVersion: 1.2, name: 'test tool' })),
					getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							case 'name':
								return 'wrong_field';
							case 'specifyInputSchema':
								return false;
							case 'language':
								return 'javaScript';
							case 'jsCode':
								return 'return 1;';
							default:
								return;
						}
					}),
				}),
				0,
			);

			expect(supplyDataResult.response).toBeInstanceOf(DynamicTool);

			const tool = supplyDataResult.response as DynamicTool;
			expect(tool.name).toBe('test_tool');
			expect(tool.description).toBe('description text');
			expect(tool.func).toBeInstanceOf(Function);
		});

		it('should read name from name parameter on version <1.2', async () => {
			const node = new ToolCode();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ typeVersion: 1.1, name: 'wrong name' })),
					getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							case 'name':
								return 'test_tool';
							case 'specifyInputSchema':
								return false;
							case 'language':
								return 'javaScript';
							case 'jsCode':
								return 'return 1;';
							default:
								return;
						}
					}),
				}),
				0,
			);

			expect(supplyDataResult.response).toBeInstanceOf(DynamicTool);

			const tool = supplyDataResult.response as DynamicTool;
			expect(tool.name).toBe('test_tool');
			expect(tool.description).toBe('description text');
			expect(tool.func).toBeInstanceOf(Function);
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should execute code tool and return result', async () => {
			const node = new ToolCode();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'test query' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1.2, name: 'test tool' })),
				getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
					switch (paramName) {
						case 'description':
							return 'description text';
						case 'name':
							return 'wrong_field';
						case 'specifyInputSchema':
							return false;
						case 'language':
							return 'javaScript';
						case 'jsCode':
							return 'return "test result";';
						default:
							return;
					}
				}),
				getMode: jest.fn(() => 'manual'),
			});

			// Mock the DynamicTool.invoke method
			const mockResult = 'test result';
			DynamicTool.prototype.invoke = jest.fn().mockResolvedValue(mockResult);

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: mockResult,
						},
						pairedItem: {
							item: 0,
						},
					},
				],
			]);
			expect(DynamicTool.prototype.invoke).toHaveBeenCalledWith({ query: 'test query' });
		});

		it('should handle multiple input items', async () => {
			const node = new ToolCode();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'first query' },
				},
				{
					json: { query: 'second query' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1.2, name: 'test tool' })),
				getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
					switch (paramName) {
						case 'description':
							return 'description text';
						case 'name':
							return 'wrong_field';
						case 'specifyInputSchema':
							return false;
						case 'language':
							return 'javaScript';
						case 'jsCode':
							return 'return "result for " + query;';
						default:
							return;
					}
				}),
				getMode: jest.fn(() => 'manual'),
			});

			// Mock the DynamicTool.invoke method
			DynamicTool.prototype.invoke = jest
				.fn()
				.mockResolvedValueOnce('result for first query')
				.mockResolvedValueOnce('result for second query');

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: 'result for first query',
						},
						pairedItem: {
							item: 0,
						},
					},
					{
						json: {
							response: 'result for second query',
						},
						pairedItem: {
							item: 1,
						},
					},
				],
			]);
			expect(DynamicTool.prototype.invoke).toHaveBeenCalledTimes(2);
		});
	});
});
