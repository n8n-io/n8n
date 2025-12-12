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

			expect(SerpAPI.prototype.invoke).toHaveBeenCalledWith(inputData[0].json.input);
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

		it('should fallback to chatInput if input is not provided', async () => {
			const node = new ToolSerpApi();
			const inputData: INodeExecutionData[] = [
				{
					json: { chatInput: 'fallback query test' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test serpapi' })),
				getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
				getNodeParameter: jest.fn().mockReturnValue({}),
			});

			const mockResult = 'Fallback query results';
			SerpAPI.prototype.invoke = jest.fn().mockResolvedValue(mockResult);

			const result = await node.execute.call(mockExecute);

			expect(SerpAPI.prototype.invoke).toHaveBeenCalledWith(inputData[0].json.chatInput);
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
		});

		it('should throw error if neither input nor chatInput is provided', async () => {
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
				'No query string found at index 0',
			);
		});

		it.each([
			['', 'empty string'],
			[123, 'number'],
			[{ query: 'test' }, 'object'],
			[['query1'], 'array'],
			[null, 'null'],
			[undefined, 'undefined'],
		])('should throw error for invalid query type: %s', async (invalidInput, _description) => {
			const node = new ToolSerpApi();
			const inputData: INodeExecutionData[] = [{ json: { input: invalidInput } }];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test serpapi' })),
				getCredentials: jest.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
				getNodeParameter: jest.fn().mockReturnValue({}),
			});

			await expect(node.execute.call(mockExecute)).rejects.toThrow(
				'No query string found at index 0',
			);
		});
	});
});
