import { WikipediaQueryRun } from '@langchain/community/tools/wikipedia_query_run';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';

import { ToolWikipedia } from './ToolWikipedia.node';

describe('ToolWikipedia', () => {
	describe('supplyData', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should return Wikipedia tool instance', async () => {
			const node = new ToolWikipedia();

			const supplyDataResult = await node.supplyData.call(
				mock<ISupplyDataFunctions>({
					getNode: jest.fn(() => mock<INode>({ name: 'test wikipedia' })),
				}),
			);

			expect(supplyDataResult.response).toBeInstanceOf(WikipediaQueryRun);
		});
	});

	describe('execute', () => {
		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should execute wikipedia search and return result', async () => {
			const node = new ToolWikipedia();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'artificial intelligence' },
				},
			];

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test wikipedia' })),
			});

			// Mock the WikipediaQueryRun.invoke method
			const mockResult = 'Artificial intelligence (AI) is intelligence demonstrated by machines...';
			WikipediaQueryRun.prototype.invoke = jest.fn().mockResolvedValue(mockResult);

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
			expect(WikipediaQueryRun.prototype.invoke).toHaveBeenCalledWith({
				query: 'artificial intelligence',
			});
		});

		it('should handle multiple input items', async () => {
			const node = new ToolWikipedia();
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
				getNode: jest.fn(() => mock<INode>({ name: 'test wikipedia' })),
			});

			// Mock the WikipediaQueryRun.invoke method
			WikipediaQueryRun.prototype.invoke = jest
				.fn()
				.mockResolvedValueOnce('Machine learning (ML) is a field of artificial intelligence...')
				.mockResolvedValueOnce('Deep learning (also known as deep structured learning...');

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: 'Machine learning (ML) is a field of artificial intelligence...',
						},
						pairedItem: {
							item: 0,
						},
					},
					{
						json: {
							response: 'Deep learning (also known as deep structured learning...',
						},
						pairedItem: {
							item: 1,
						},
					},
				],
			]);
			expect(WikipediaQueryRun.prototype.invoke).toHaveBeenCalledTimes(2);
		});

		it('should skip undefined items', async () => {
			const node = new ToolWikipedia();
			const inputData: INodeExecutionData[] = [
				{
					json: { query: 'test' },
				},
			];
			// Simulate undefined item by mocking getInputData to return array with undefined
			inputData.push(undefined as any);

			const mockExecute = mock<IExecuteFunctions>({
				getInputData: jest.fn(() => inputData),
				getNode: jest.fn(() => mock<INode>({ name: 'test wikipedia' })),
			});

			// Mock the WikipediaQueryRun.invoke method
			WikipediaQueryRun.prototype.invoke = jest.fn().mockResolvedValue('test result');

			const result = await node.execute.call(mockExecute);

			expect(result).toEqual([
				[
					{
						json: {
							response: 'test result',
						},
						pairedItem: {
							item: 0,
						},
					},
				],
			]);
			expect(WikipediaQueryRun.prototype.invoke).toHaveBeenCalledTimes(1);
		});
	});
});
