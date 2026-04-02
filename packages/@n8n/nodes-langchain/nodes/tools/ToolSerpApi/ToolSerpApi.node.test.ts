import { SerpAPI } from '@langchain/community/tools/serpapi';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';

import { ToolSerpApi } from './ToolSerpApi.node';

describe('ToolSerpApi', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should return SerpAPI tool instance', async () => {
			const node = new ToolSerpApi();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ name: 'test serpapi' })),
					getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
					getNodeParameter: jest.fn().mockReturnValue({}),
				}),
				0,
			);

			expect(supplyDataResult.response).toBeInstanceOf(SerpAPI);
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should execute SerpAPI search and return result', async () => {
			const node = new ToolSerpApi();
			const inputData: INodeExecutionData[] = [
				{
					json: { input: 'artificial intelligence news' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test serpapi' })),
				getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
				getNodeParameter: jest.fn().mockReturnValue({}),
			});

			// Mock the SerpAPI.invoke method
			const mockResult = 'Latest news about artificial intelligence...';
			SerpAPI.prototype.invoke = jest.fn().mockResolvedValue(mockResult);

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
			expect(SerpAPI.prototype.invoke).toHaveBeenCalledWith(inputData[0].json);
		});

		it('should handle multiple input items', async () => {
			const node = new ToolSerpApi();
			const inputData: INodeExecutionData[] = [
				{
					json: { input: 'machine learning' },
				},
				{
					json: { input: 'deep learning' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test serpapi' })),
				getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
				getNodeParameter: jest.fn().mockReturnValue({}),
			});

			// Mock the SerpAPI.invoke method
			SerpAPI.prototype.invoke = jest
				.fn()
				.mockResolvedValueOnce('Machine learning search results')
				.mockResolvedValueOnce('Deep learning search results');

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: 'Machine learning search results',
						},
						pairedItem: {
							item: 0,
						},
					},
					{
						json: {
							response: 'Deep learning search results',
						},
						pairedItem: {
							item: 1,
						},
					},
				],
			]);
			expect(SerpAPI.prototype.invoke).toHaveBeenCalledTimes(2);
		});

		it('should handle credentials and options correctly', async () => {
			const node = new ToolSerpApi();
			const inputData: INodeExecutionData[] = [
				{
					json: { input: 'test query' },
				},
			];

			const testOptions = { engine: 'google', location: 'US' };
			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test serpapi' })),
				getCredentials: jest.fn().mockResolvedValue({ apiKey: 'secret-api-key' }),
				getNodeParameter: jest.fn().mockReturnValue(testOptions),
			});

			SerpAPI.prototype.invoke = jest.fn().mockResolvedValue('test result');

			await node.execute.call(mockExecute);

			expect(mockExecute.getCredentials).toHaveBeenCalledWith('serpApi');
			expect(mockExecute.getNodeParameter).toHaveBeenCalledWith('options', 0);
		});

		it('should fail gracefully if input is missing', async () => {
			const node = new ToolSerpApi();
			const inputData: INodeExecutionData[] = [
				{
					json: {},
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test serpapi' })),
				getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
				getNodeParameter: jest.fn().mockReturnValue({}),
			});

			await expect(node.execute.call(mockExecute)).rejects.toThrow(
				'Missing search query input at itemIndex 0',
			);
		});
	});
});
