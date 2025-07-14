import { mock } from 'jest-mock-extended';
import { DynamicTool } from 'langchain/tools';
import { type INode, type ISupplyDataFunctions } from 'n8n-workflow';

import { ToolWorkflow } from './ToolWorkflow.node';
import type { ToolWorkflowV2 } from './v2/ToolWorkflowV2.node';

describe('ToolWorkflowV2', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should read name from node name on version >=2.2', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.2] as ToolWorkflowV2;

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ typeVersion: 2.2, name: 'test tool' })),
					getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							case 'name':
								return 'wrong_field';
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

		it('should read name from name parameter on version <2.2', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.1] as ToolWorkflowV2;

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ typeVersion: 2.1, name: 'wrong name' })),
					getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							case 'name':
								return 'test_tool';
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
