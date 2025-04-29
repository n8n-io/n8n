import { mock } from 'jest-mock-extended';
import { DynamicTool } from 'langchain/tools';
import { type INode, type ISupplyDataFunctions } from 'n8n-workflow';

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
});
