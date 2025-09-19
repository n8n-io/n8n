import { mock } from 'jest-mock-extended';
import { VectorStoreQATool } from 'langchain/tools';
import { NodeConnectionTypes, type INode, type ISupplyDataFunctions } from 'n8n-workflow';

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
});
