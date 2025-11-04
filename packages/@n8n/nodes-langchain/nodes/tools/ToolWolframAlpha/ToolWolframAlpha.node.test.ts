import { WolframAlphaTool } from '@langchain/community/tools/wolframalpha';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';

import { ToolWolframAlpha } from './ToolWolframAlpha.node';

describe('ToolWolframAlpha', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should return WolframAlpha tool instance', async () => {
			const node = new ToolWolframAlpha();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ name: 'test wolfram' })),
					getCredentials: jest.fn().mockResolvedValue({ appId: 'test-app-id' }),
				}),
			);

			expect(supplyDataResult.response).toBeInstanceOf(WolframAlphaTool);
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should execute WolframAlpha query and return result', async () => {
			const node = new ToolWolframAlpha();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'what is 2+2?' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test wolfram' })),
				getCredentials: jest.fn().mockResolvedValue({ appId: 'test-app-id' }),
			});

			// Mock the WolframAlphaTool.invoke method
			const mockResult = '4';
			WolframAlphaTool.prototype.invoke = jest.fn().mockResolvedValue(mockResult);

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
			expect(WolframAlphaTool.prototype.invoke).toHaveBeenCalledWith(inputData[0].json);
		});

		it('should handle multiple input items', async () => {
			const node = new ToolWolframAlpha();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'what is 5*3?' },
				},
				{
					json: { query: 'what is the square root of 16?' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test wolfram' })),
				getCredentials: jest.fn().mockResolvedValue({ appId: 'test-app-id' }),
			});

			// Mock the WolframAlphaTool.invoke method
			WolframAlphaTool.prototype.invoke = jest
				.fn()
				.mockResolvedValueOnce('15')
				.mockResolvedValueOnce('4');

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: '15',
						},
						pairedItem: {
							item: 0,
						},
					},
					{
						json: {
							response: '4',
						},
						pairedItem: {
							item: 1,
						},
					},
				],
			]);
			expect(WolframAlphaTool.prototype.invoke).toHaveBeenCalledTimes(2);
		});

		it('should handle credentials correctly', async () => {
			const node = new ToolWolframAlpha();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'test query' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test wolfram' })),
				getCredentials: jest.fn().mockResolvedValue({ appId: 'secret-app-id' }),
			});

			WolframAlphaTool.prototype.invoke = jest.fn().mockResolvedValue('test result');

			await node.execute.call(mockExecute);

			expect(mockExecute.getCredentials).toHaveBeenCalledWith('wolframAlphaApi');
		});
	});
});
