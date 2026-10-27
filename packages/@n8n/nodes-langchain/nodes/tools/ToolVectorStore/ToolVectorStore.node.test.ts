import { VectorStoreQATool } from '@langchain/classic/tools';
import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INode,
	type INodeExecutionData,
	type ISupplyDataFunctions,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ToolVectorStore } from './ToolVectorStore.node';

describe('ToolVectorStore', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should read name from node name on version >=1.1', async () => {
			const node = new ToolVectorStore();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: vi.fn(() => mock<INode>({ typeVersion: 1.2, name: 'test tool' })),
					getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'name':
								return 'wrong_field';
							case 'topK':
								return 4;
							default:
								return;
						}
					}),
					getInputConnectionData: vi.fn().mockImplementation(async (inputName, _itemIndex) => {
						switch (inputName) {
							case NodeConnectionTypes.AiVectorStore:
								return vi.fn();
							case NodeConnectionTypes.AiLanguageModel:
								return {
									_modelType: vi.fn(),
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
					getNode: vi.fn(() => mock<INode>({ typeVersion: 1, name: 'wrong name' })),
					getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'name':
								return 'test_tool';
							case 'topK':
								return 4;
							default:
								return;
						}
					}),
					getInputConnectionData: vi.fn().mockImplementation(async (inputName, _itemIndex) => {
						switch (inputName) {
							case NodeConnectionTypes.AiVectorStore:
								return vi.fn();
							case NodeConnectionTypes.AiLanguageModel:
								return {
									_modelType: vi.fn(),
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
			vi.resetAllMocks();
		});

		it('should execute vector store tool and return result', async () => {
			const node = new ToolVectorStore();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'test question' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: vi.fn(() => inputData),
				getNode: vi.fn(() => mock<INode>({ typeVersion: 1.2, name: 'test tool' })),
				getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
					switch (paramName) {
						case 'description':
							return 'test description';
						case 'topK':
							return 4;
						default:
							return;
					}
				}),
				getInputConnectionData: vi.fn().mockImplementation(async (inputName, _itemIndex) => {
					switch (inputName) {
						case NodeConnectionTypes.AiVectorStore:
							return vi.fn();
						case NodeConnectionTypes.AiLanguageModel:
							return {
								_modelType: vi.fn(),
							};
						default:
							return;
					}
				}),
			});

			// Mock the VectorStoreQATool.invoke method
			const mockResult = 'This is the answer from vector store';
			VectorStoreQATool.prototype.invoke = vi.fn().mockResolvedValue(mockResult);

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
				getInputData: vi.fn(() => inputData),
				getNode: vi.fn(() => mock<INode>({ typeVersion: 1.2, name: 'test tool' })),
				getNodeParameter: vi.fn().mockImplementation((paramName, _itemIndex) => {
					switch (paramName) {
						case 'description':
							return 'test description';
						case 'topK':
							return 4;
						default:
							return;
					}
				}),
				getInputConnectionData: vi.fn().mockImplementation(async (inputName, _itemIndex) => {
					switch (inputName) {
						case NodeConnectionTypes.AiVectorStore:
							return vi.fn();
						case NodeConnectionTypes.AiLanguageModel:
							return {
								_modelType: vi.fn(),
							};
						default:
							return;
					}
				}),
			});

			// Mock the VectorStoreQATool.invoke method
			VectorStoreQATool.prototype.invoke = vi
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
