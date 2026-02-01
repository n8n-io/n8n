import { SearxngSearch } from '@langchain/community/tools/searxng_search';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';

import { ToolSearXng } from './ToolSearXng.node';

describe('ToolSearXng', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should return SearXNG tool instance', async () => {
			const node = new ToolSearXng();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ name: 'test searxng' })),
					getCredentials: jest.fn().mockResolvedValue({ apiUrl: 'https://searx.example.com' }),
					getNodeParameter: jest.fn().mockReturnValue({}),
				}),
				0,
			);

			expect(supplyDataResult.response).toBeInstanceOf(SearxngSearch);
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should execute SearXNG search and return result', async () => {
			const node = new ToolSearXng();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'artificial intelligence' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test searxng' })),
				getCredentials: jest.fn().mockResolvedValue({ apiUrl: 'https://searx.example.com' }),
				getNodeParameter: jest.fn().mockReturnValue({}),
			});

			// Mock the SearxngSearch.invoke method
			const mockResult = 'Search results for artificial intelligence...';
			SearxngSearch.prototype.invoke = jest.fn().mockResolvedValue(mockResult);

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
			expect(SearxngSearch.prototype.invoke).toHaveBeenCalledWith({
				query: 'artificial intelligence',
			});
		});

		it('should handle multiple input items', async () => {
			const node = new ToolSearXng();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'machine learning' },
				},
				{
					json: { query: 'deep learning' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test searxng' })),
				getCredentials: jest.fn().mockResolvedValue({ apiUrl: 'https://searx.example.com' }),
				getNodeParameter: jest.fn().mockReturnValue({}),
			});

			// Mock the SearxngSearch.invoke method
			SearxngSearch.prototype.invoke = jest
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
			expect(SearxngSearch.prototype.invoke).toHaveBeenCalledTimes(2);
		});

		it('should handle credentials and options correctly', async () => {
			const node = new ToolSearXng();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'test query' },
				},
			];

			const testOptions = { engines: ['google'], safesearch: 1 };
			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test searxng' })),
				getCredentials: jest.fn().mockResolvedValue({ apiUrl: 'https://searx.test.com' }),
				getNodeParameter: jest.fn().mockReturnValue(testOptions),
			});

			SearxngSearch.prototype.invoke = jest.fn().mockResolvedValue('test result');

			await node.execute.call(mockExecute);

			expect(mockExecute.getCredentials).toHaveBeenCalledWith('searXngApi');
			expect(mockExecute.getNodeParameter).toHaveBeenCalledWith('options', 0);
		});
	});
});
