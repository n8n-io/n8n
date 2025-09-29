import { mock } from 'jest-mock-extended';
import { VectorStoreQATool } from 'langchain/tools';
import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { ToolVectorStore } from './ToolVectorStore.node';

describe('ToolVectorStore', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should read name from node name on version >=1.1', async () => {
			const node = new ToolVectorStore();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ typeVersion: 1.2, name: 'test tool' })),
					getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'name':
								return 'wrong_field';
							case 'topK':
								return 4;
							default:
								return;
						}
					}),
					getInputConnectionData: jest.fn().mockImplementation(async (inputName, _itemIndex) => {
						switch (inputName) {
							case NodeConnectionTypes.AiVectorStore:
								return jest.fn();
							case NodeConnectionTypes.AiLanguageModel:
								return {
									_modelType: jest.fn(),
								};
							default:
								return;
						}
					}),
				}),
				0,
			);

			expect(supplyDataResult.response).toBeInstanceOf(VectorStoreQATool);

			const tool = supplyDataResult.response as VectorStoreQATool;
			expect(tool.name).toBe('test_tool');
			expect(tool.description).toContain('test_tool');
		});

		it('should read name from name parameter on version <1.2', async () => {
			const node = new ToolVectorStore();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ typeVersion: 1, name: 'wrong name' })),
					getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'name':
								return 'test_tool';
							case 'topK':
								return 4;
							default:
								return;
						}
					}),
					getInputConnectionData: jest.fn().mockImplementation(async (inputName, _itemIndex) => {
						switch (inputName) {
							case NodeConnectionTypes.AiVectorStore:
								return jest.fn();
							case NodeConnectionTypes.AiLanguageModel:
								return {
									_modelType: jest.fn(),
								};
							default:
								return;
						}
					}),
				}),
				0,
			);

			expect(supplyDataResult.response).toBeInstanceOf(VectorStoreQATool);

			const tool = supplyDataResult.response as VectorStoreQATool;
			expect(tool.name).toBe('test_tool');
			expect(tool.description).toContain('test_tool');
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should execute vector store tool and return result', async () => {
			const node = new ToolVectorStore();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'test question' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1.2, name: 'test tool' })),
				getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
					switch (paramName) {
						case 'description':
							return 'test description';
						case 'topK':
							return 4;
						default:
							return;
					}
				}),
				getInputConnectionData: jest.fn().mockImplementation(async (inputName, _itemIndex) => {
					switch (inputName) {
						case NodeConnectionTypes.AiVectorStore:
							return jest.fn();
						case NodeConnectionTypes.AiLanguageModel:
							return {
								_modelType: jest.fn(),
							};
						default:
							return;
					}
				}),
			});

			// Mock the VectorStoreQATool.invoke method
			const mockResult = 'This is the answer from vector store';
			VectorStoreQATool.prototype.invoke = jest.fn().mockResolvedValue(mockResult);

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
			expect(VectorStoreQATool.prototype.invoke).toHaveBeenCalledWith(inputData[0].json);
		});

		it('should handle multiple input items', async () => {
			const node = new ToolVectorStore();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'first question' },
				},
				{
					json: { query: 'second question' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1.2, name: 'test tool' })),
				getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
					switch (paramName) {
						case 'description':
							return 'test description';
						case 'topK':
							return 4;
						default:
							return;
					}
				}),
				getInputConnectionData: jest.fn().mockImplementation(async (inputName, _itemIndex) => {
					switch (inputName) {
						case NodeConnectionTypes.AiVectorStore:
							return jest.fn();
						case NodeConnectionTypes.AiLanguageModel:
							return {
								_modelType: jest.fn(),
							};
						default:
							return;
					}
				}),
			});

			// Mock the VectorStoreQATool.invoke method
			VectorStoreQATool.prototype.invoke = jest
				.fn()
				.mockResolvedValueOnce('Answer to first question')
				.mockResolvedValueOnce('Answer to second question');

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: 'Answer to first question',
						},
						pairedItem: {
							item: 0,
						},
					},
					{
						json: {
							response: 'Answer to second question',
						},
						pairedItem: {
							item: 1,
						},
					},
				],
			]);
			expect(VectorStoreQATool.prototype.invoke).toHaveBeenCalledTimes(2);
		});
	});
});
