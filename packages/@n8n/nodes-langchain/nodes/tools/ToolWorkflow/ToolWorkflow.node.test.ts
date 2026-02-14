import { mock } from 'jest-mock-extended';
import { DynamicTool } from '@langchain/classic/tools';
import {
	type INode,
	type ISupplyDataFunctions,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

import { ToolWorkflow } from './ToolWorkflow.node';
import type { ToolWorkflowV2 } from './v2/ToolWorkflowV2.node';
import { WorkflowToolService } from './v2/utils/WorkflowToolService';

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

	describe('execute', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should properly spread INodeExecutionData array from tool.invoke', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.2] as ToolWorkflowV2;

			// Mock the tool that returns INodeExecutionData[]
			const mockToolResponse: INodeExecutionData[] = [{ json: { response: 'pikachu' } }];

			const mockTool = {
				invoke: jest.fn().mockResolvedValue(mockToolResponse),
			} as any;

			// Mock WorkflowToolService.createTool to return our mock tool
			jest.spyOn(WorkflowToolService.prototype, 'createTool').mockResolvedValue(mockTool);

			const inputData: INodeExecutionData[] = [{ json: { query: 'what is a pokemon?' } }];

			const executeResult = await node.execute.call(
				mock<IExecuteFunctions>({
					getInputData: jest.fn(() => inputData),
					getNode: jest.fn(() =>
						mock<INode>({
							typeVersion: 2.2,
							name: 'test tool',
							parameters: { workflowInputs: { schema: [] } },
						}),
					),
					getNodeParameter: jest.fn().mockImplementation((paramName) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							default:
								return;
						}
					}),
				}),
			);

			// Verify the result is properly formatted
			expect(executeResult).toHaveLength(1);
			expect(executeResult[0]).toHaveLength(1);
			expect(executeResult[0][0]).toEqual({ json: { response: 'pikachu' } });
			expect(mockTool.invoke).toHaveBeenCalledWith({ query: 'what is a pokemon?' });
		});

		it('should handle multiple items in the response', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.2] as ToolWorkflowV2;

			// Mock the tool that returns multiple INodeExecutionData items
			const mockToolResponse: INodeExecutionData[] = [
				{ json: { id: 1, name: 'pikachu' } },
				{ json: { id: 2, name: 'charizard' } },
			];

			const mockTool = {
				invoke: jest.fn().mockResolvedValue(mockToolResponse),
			} as any;

			jest.spyOn(WorkflowToolService.prototype, 'createTool').mockResolvedValue(mockTool);

			const inputData: INodeExecutionData[] = [{ json: { query: 'list pokemon' } }];

			const executeResult = await node.execute.call(
				mock<IExecuteFunctions>({
					getInputData: jest.fn(() => inputData),
					getNode: jest.fn(() =>
						mock<INode>({
							typeVersion: 2.2,
							name: 'test tool',
							parameters: { workflowInputs: { schema: [] } },
						}),
					),
					getNodeParameter: jest.fn().mockImplementation((paramName) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							default:
								return;
						}
					}),
				}),
			);

			// Verify all items are properly spread into the response
			expect(executeResult).toHaveLength(1);
			expect(executeResult[0]).toHaveLength(2);
			expect(executeResult[0][0]).toEqual({ json: { id: 1, name: 'pikachu' } });
			expect(executeResult[0][1]).toEqual({ json: { id: 2, name: 'charizard' } });
		});

		it('should handle fallback for non-array responses', async () => {
			const toolWorkflowNode = new ToolWorkflow();
			const node = toolWorkflowNode.nodeVersions[2.2] as ToolWorkflowV2;

			// Mock the tool that returns a string (edge case)
			const mockTool = {
				invoke: jest.fn().mockResolvedValue('plain string response'),
			} as any;

			jest.spyOn(WorkflowToolService.prototype, 'createTool').mockResolvedValue(mockTool);

			const inputData: INodeExecutionData[] = [{ json: { query: 'test query' } }];

			const executeResult = await node.execute.call(
				mock<IExecuteFunctions>({
					getInputData: jest.fn(() => inputData),
					getNode: jest.fn(() =>
						mock<INode>({
							typeVersion: 2.2,
							name: 'test tool',
							parameters: { workflowInputs: { schema: [] } },
						}),
					),
					getNodeParameter: jest.fn().mockImplementation((paramName) => {
						switch (paramName) {
							case 'description':
								return 'description text';
							default:
								return;
						}
					}),
				}),
			);

			// Verify the fallback wraps it properly
			expect(executeResult).toHaveLength(1);
			expect(executeResult[0]).toHaveLength(1);
			expect(executeResult[0][0]).toEqual({
				json: { response: 'plain string response' },
				pairedItem: { item: 0 },
			});
		});
	});
});
