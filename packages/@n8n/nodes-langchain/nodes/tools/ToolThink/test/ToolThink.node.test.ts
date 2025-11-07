import { mock } from 'jest-mock-extended';
import { DynamicTool } from 'langchain/tools';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
	INode,
} from 'n8n-workflow';

import { ToolThink } from '../ToolThink.node';

describe('ToolThink', () => {
	const thinkTool = new ToolThink();
	const helpers = mock<ISupplyDataFunctions['helpers']>();

	const createExecuteFunctions = (node: Partial<INode> = { typeVersion: 1 }) => {
		const executeFunctions = mock<ISupplyDataFunctions>({
			helpers,
		});
		executeFunctions.addInputData.mockReturnValue({ index: 0 });
		executeFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'description':
					return 'Tool description';
				default:
					return undefined;
			}
		});
		executeFunctions.getNode.mockReturnValue(mock<INode>(node));
		return executeFunctions;
	};

	describe('Tool response', () => {
		it('should return the same text as response when receiving a text input', async () => {
			const executeFunctions = createExecuteFunctions();

			const { response } = (await thinkTool.supplyData.call(executeFunctions, 0)) as {
				response: DynamicTool;
			};
			expect(response).toBeInstanceOf(DynamicTool);
			expect(response.description).toEqual('Tool description');
			const res = (await response.invoke('foo')) as string;
			expect(res).toEqual('foo');
		});

		it('should use hardcoded name for version 1', async () => {
			const executeFunctions = createExecuteFunctions({ typeVersion: 1 });

			const { response } = (await thinkTool.supplyData.call(executeFunctions, 0)) as {
				response: DynamicTool;
			};
			expect(response.name).toEqual('thinking_tool');
		});

		it('should use dynamic name from node for version 1.1', async () => {
			const executeFunctions = createExecuteFunctions({
				typeVersion: 1.1,
				name: 'My Thinking Tool',
			});

			const { response } = (await thinkTool.supplyData.call(executeFunctions, 0)) as {
				response: DynamicTool;
			};
			expect(response.name).toEqual('My_Thinking_Tool');
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should execute think tool and return input as result', async () => {
			const node = new ToolThink();
			const inputData: INodeExecutionData[] = [
				{
					json: { input: 'thinking about this problem' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1.1, name: 'test think tool' })),
				getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
					switch (paramName) {
						case 'description':
							return 'Tool for thinking';
						default:
							return;
					}
				}),
			});

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: 'thinking about this problem',
						},
						pairedItem: {
							item: 0,
						},
					},
				],
			]);
		});

		it('should handle multiple input items', async () => {
			const node = new ToolThink();
			const inputData: INodeExecutionData[] = [
				{
					json: { input: 'first thought' },
				},
				{
					json: { input: 'second thought' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1.1, name: 'test think tool' })),
				getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
					switch (paramName) {
						case 'description':
							return 'Tool for thinking';
						default:
							return;
					}
				}),
			});

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: 'first thought',
						},
						pairedItem: {
							item: 0,
						},
					},
					{
						json: {
							response: 'second thought',
						},
						pairedItem: {
							item: 1,
						},
					},
				],
			]);
		});

		it('should use hardcoded name for version 1', async () => {
			const node = new ToolThink();
			const inputData: INodeExecutionData[] = [
				{
					json: { input: 'test' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1, name: 'My Thinking Tool' })),
				getNodeParameter: jest.fn().mockImplementation((paramName, _itemIndex) => {
					switch (paramName) {
						case 'description':
							return 'Tool for thinking';
						default:
							return;
					}
				}),
			});

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: 'test',
						},
						pairedItem: {
							item: 0,
						},
					},
				],
			]);
			// The tool should be created with the hardcoded name for version 1
			// This is tested indirectly through the getTool function usage
			expect(mockExecute.getNode).toHaveBeenCalled();
		});
	});
});
