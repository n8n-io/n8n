import { FakeChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { processItem } from '../processItem';
import { TextClassifier } from '../TextClassifier.node';

jest.mock('../processItem', () => ({
	processItem: jest.fn(),
}));

describe('TextClassifier Node', () => {
	let node: TextClassifier;
	let mockExecuteFunction: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.resetAllMocks();
		node = new TextClassifier();
		mockExecuteFunction = mock<IExecuteFunctions>();

		mockExecuteFunction.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		mockExecuteFunction.getInputData.mockReturnValue([{ json: { testValue: 'none' } }]);
		mockExecuteFunction.getNode.mockReturnValue({
			name: 'Text Classifier',
			typeVersion: 1.1,
			parameters: {},
		} as INode);

		mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
			if (param === 'inputText') return 'Test input';
			if (param === 'categories.categories')
				return [{ category: 'test', description: 'test category' }];
			return defaultValue;
		});

		const fakeLLM = new FakeChatModel({});
		mockExecuteFunction.getInputConnectionData.mockResolvedValue(fakeLLM);
	});

	describe('execute', () => {
		it('should process items with correct parameters', async () => {
			(processItem as jest.Mock).mockResolvedValue({ test: true });

			const result = await node.execute.call(mockExecuteFunction);

			expect(processItem).toHaveBeenCalledWith(
				mockExecuteFunction,
				0,
				{ json: { testValue: 'none' } },
				expect.any(FakeChatModel),
				expect.any(Object),
				[{ category: 'test', description: 'test category' }],
				expect.any(String),
				'If there is not a very fitting category, select none of the categories.',
			);

			expect(result).toEqual([[{ json: { testValue: 'none' } }]]);
		});

		it('should handle multiple input items', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [
						{ category: 'test1', description: 'test category' },
						{ category: 'test2', description: 'some other category' },
					];
				return defaultValue;
			});
			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
			]);

			(processItem as jest.Mock)
				.mockResolvedValueOnce({ test1: true, test2: false })
				.mockResolvedValueOnce({ test1: false, test2: true });

			const result = await node.execute.call(mockExecuteFunction);

			expect(processItem).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(2);
			expect(result[0][0].json).toEqual({ item: 1 });
			expect(result[1][0].json).toEqual({ item: 2 });
		});

		it('should process items in batches when batchSize is set', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [{ category: 'test', description: 'test category' }];
				if (param === 'batchSize') return 2;
				return defaultValue;
			});

			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
				{ json: { item: 3 } },
				{ json: { item: 4 } },
			]);

			(processItem as jest.Mock)
				.mockResolvedValueOnce({ test: true })
				.mockResolvedValueOnce({ test: true })
				.mockResolvedValueOnce({ test: true })
				.mockResolvedValueOnce({ test: true });

			const result = await node.execute.call(mockExecuteFunction);

			expect(processItem).toHaveBeenCalledTimes(4);
			expect(result[0]).toHaveLength(4);
			expect(result[0]).toEqual([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
				{ json: { item: 3 } },
				{ json: { item: 4 } },
			]);
		});

		it('should respect delayBetweenBatches', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [{ category: 'test', description: 'test category' }];
				if (param === 'options.batching.batchSize') return 2;
				if (param === 'options.batching.delayBetweenBatches') return 100;
				return defaultValue;
			});

			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
				{ json: { item: 3 } },
				{ json: { item: 4 } },
				{ json: { item: 5 } },
				{ json: { item: 6 } },
			]);

			(processItem as jest.Mock).mockResolvedValue({ test: true });

			const startTime = Date.now();
			await node.execute.call(mockExecuteFunction);
			const endTime = Date.now();

			expect(endTime - startTime).toBeGreaterThanOrEqual(200);
		});

		it('should handle errors in batch processing', async () => {
			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'inputText') return 'Test input';
				if (param === 'categories.categories')
					return [{ category: 'test', description: 'test category' }];
				if (param === 'batchSize') return 2;
				return defaultValue;
			});

			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
				{ json: { item: 3 } },
			]);

			(processItem as jest.Mock)
				.mockResolvedValueOnce({ test: true })
				.mockRejectedValueOnce(new Error('Batch error'))
				.mockResolvedValueOnce({ test: true });

			mockExecuteFunction.continueOnFail.mockReturnValue(true);

			const result = await node.execute.call(mockExecuteFunction);

			expect(result[0]).toHaveLength(3);
			expect(result[0][1].json).toHaveProperty('error', 'Batch error');
		});

		it('should throw error when continueOnFail is false', async () => {
			mockExecuteFunction.continueOnFail.mockReturnValue(false);
			(processItem as jest.Mock).mockRejectedValue(new Error('Test error'));

			await expect(node.execute.call(mockExecuteFunction)).rejects.toThrow('Test error');
		});

		it('should continue on failure when configured', async () => {
			mockExecuteFunction.continueOnFail.mockReturnValue(true);
			(processItem as jest.Mock).mockRejectedValue(new Error('Test error'));

			const result = await node.execute.call(mockExecuteFunction);

			expect(result).toEqual([[{ json: { error: 'Test error' }, pairedItem: { item: 0 } }]]);
		});
	});
});
