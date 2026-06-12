import { FakeListChatModel } from '@langchain/core/utils/testing';
import { PromptTemplate } from '@langchain/core/prompts';

import { BatchedSummarizationChain } from '../V2/batchedSummarizationChain';

import { sleep } from 'n8n-workflow';

jest.mock('n8n-workflow', () => ({
	sleep: jest.fn().mockResolvedValue(undefined),
}));

describe('BatchedSummarizationChain', () => {
	let mockLlm: FakeListChatModel;

	beforeEach(() => {
		jest.clearAllMocks();
		mockLlm = new FakeListChatModel({
			responses: ['Summary 1', 'Summary 2', 'Summary 3', 'Final Summary'],
		});
	});

	describe('map_reduce summarization', () => {
		it('should process documents in batches with delay', async () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'map_reduce',
				batchSize: 2,
				delayBetweenBatches: 100,
			});

			const documents = [
				{ pageContent: 'Document 1 content', metadata: {} },
				{ pageContent: 'Document 2 content', metadata: {} },
				{ pageContent: 'Document 3 content', metadata: {} },
				{ pageContent: 'Document 4 content', metadata: {} },
			];

			const result = await chain.invoke({ input_documents: documents });

			expect(result).toHaveProperty('output_text');
			expect(typeof result.output_text).toBe('string');

			// Verify sleep was called for delays between batches
			expect(sleep).toHaveBeenCalledWith(100);
		});

		it('should handle single batch without delay', async () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'map_reduce',
				batchSize: 5,
				delayBetweenBatches: 100,
			});

			const documents = [
				{ pageContent: 'Document 1 content', metadata: {} },
				{ pageContent: 'Document 2 content', metadata: {} },
			];

			const result = await chain.invoke({ input_documents: documents });

			expect(result).toHaveProperty('output_text');

			// Sleep should not be called for single batch
			expect(sleep).not.toHaveBeenCalled();
		});

		it('should use custom prompts when provided', async () => {
			const customMapPrompt = new PromptTemplate({
				template: 'Custom map: {text}',
				inputVariables: ['text'],
			});

			const customCombinePrompt = new PromptTemplate({
				template: 'Custom combine: {text}',
				inputVariables: ['text'],
			});

			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'map_reduce',
				batchSize: 1,
				delayBetweenBatches: 0,
				combineMapPrompt: customMapPrompt,
				combinePrompt: customCombinePrompt,
			});

			const documents = [{ pageContent: 'Test content', metadata: {} }];

			const result = await chain.invoke({ input_documents: documents });

			expect(result).toHaveProperty('output_text');
		});
	});

	describe('stuff summarization', () => {
		it('should combine all documents at once', async () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'stuff',
				batchSize: 2, // This should be ignored for stuff type
				delayBetweenBatches: 100,
			});

			const documents = [
				{ pageContent: 'Document 1', metadata: {} },
				{ pageContent: 'Document 2', metadata: {} },
			];

			const result = await chain.invoke({ input_documents: documents });

			expect(result).toHaveProperty('output_text');

			// No batching delays for stuff method
			expect(sleep).not.toHaveBeenCalled();
		});
	});

	describe('refine summarization', () => {
		it('should process documents sequentially with batching', async () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'refine',
				batchSize: 2,
				delayBetweenBatches: 50,
			});

			const documents = [
				{ pageContent: 'Document 1', metadata: {} },
				{ pageContent: 'Document 2', metadata: {} },
				{ pageContent: 'Document 3', metadata: {} },
				{ pageContent: 'Document 4', metadata: {} },
			];

			const result = await chain.invoke({ input_documents: documents });

			expect(result).toHaveProperty('output_text');

			// Verify delay was applied between batches
			expect(sleep).toHaveBeenCalledWith(50);
		});

		it('should handle empty document list', async () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'refine',
				batchSize: 2,
				delayBetweenBatches: 0,
			});

			const result = await chain.invoke({ input_documents: [] });

			expect(result).toEqual({ output_text: '' });
		});

		it('should handle single document without refinement', async () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'refine',
				batchSize: 2,
				delayBetweenBatches: 100,
			});

			const documents = [{ pageContent: 'Single document', metadata: {} }];

			const result = await chain.invoke({ input_documents: documents });

			expect(result).toHaveProperty('output_text');

			// No delay needed for single document
			expect(sleep).not.toHaveBeenCalled();
		});
	});

	describe('batching configuration', () => {
		it('should respect batchSize of 1', async () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'map_reduce',
				batchSize: 1,
				delayBetweenBatches: 10,
			});

			const documents = [
				{ pageContent: 'Doc 1', metadata: {} },
				{ pageContent: 'Doc 2', metadata: {} },
			];

			const result = await chain.invoke({ input_documents: documents });

			expect(result).toHaveProperty('output_text');

			// Should have delay between single document batches
			expect(sleep).toHaveBeenCalledWith(10);
		});

		it('should handle zero delay between batches', async () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'map_reduce',
				batchSize: 1,
				delayBetweenBatches: 0,
			});

			const documents = [
				{ pageContent: 'Doc 1', metadata: {} },
				{ pageContent: 'Doc 2', metadata: {} },
			];

			const result = await chain.invoke({ input_documents: documents });

			expect(result).toHaveProperty('output_text');

			// No delay should be called when delay is 0
			expect(sleep).not.toHaveBeenCalled();
		});

		it('should process documents in exact batches according to batchSize', async () => {
			// Create a mock that tracks call timing to verify batching
			const callTimestamps: number[] = [];
			const mockLlmWithTiming = new FakeListChatModel({
				responses: [
					'Summary 1',
					'Summary 2',
					'Summary 3',
					'Summary 4',
					'Summary 5',
					'Final Summary',
				],
			});

			// Override invoke to track when calls are made
			mockLlmWithTiming.invoke = jest.fn().mockImplementation(async () => {
				callTimestamps.push(Date.now());
				return 'Mock summary';
			});

			const chain = new BatchedSummarizationChain({
				model: mockLlmWithTiming,
				type: 'map_reduce',
				batchSize: 2, // Process 2 documents at a time
				delayBetweenBatches: 50,
			});

			const documents = [
				{ pageContent: 'Document 1', metadata: {} },
				{ pageContent: 'Document 2', metadata: {} },
				{ pageContent: 'Document 3', metadata: {} },
				{ pageContent: 'Document 4', metadata: {} },
				{ pageContent: 'Document 5', metadata: {} },
			];

			const startTime = Date.now();
			await chain.invoke({ input_documents: documents });

			// Verify the correct number of calls were made (5 for map phase + 1 for reduce phase)
			expect(mockLlmWithTiming.invoke).toHaveBeenCalledTimes(6);

			// Verify sleep was called the correct number of times (2 delays for 3 batches: batch1->batch2->batch3)
			expect(sleep).toHaveBeenCalledTimes(2);
			expect(sleep).toHaveBeenCalledWith(50);
		});

		it('should verify batchSize controls parallel processing', async () => {
			const processingOrder: string[] = [];
			const mockLlmWithOrder = new FakeListChatModel({
				responses: ['Summary 1', 'Summary 2', 'Summary 3', 'Summary 4', 'Final Summary'],
			});

			// Track the order of processing
			mockLlmWithOrder.invoke = jest.fn().mockImplementation(async (input) => {
				const docText = typeof input === 'string' ? input : input.toString();
				processingOrder.push(docText.substring(0, 20)); // Track part of the input
				// Add small delay to make timing differences visible
				await new Promise((resolve) => setTimeout(resolve, 10));
				return 'Mock summary';
			});

			const chain = new BatchedSummarizationChain({
				model: mockLlmWithOrder,
				type: 'map_reduce',
				batchSize: 3, // Should process 3 documents in first batch, 1 in second batch
				delayBetweenBatches: 100,
			});

			const documents = [
				{ pageContent: 'Document A content', metadata: {} },
				{ pageContent: 'Document B content', metadata: {} },
				{ pageContent: 'Document C content', metadata: {} },
				{ pageContent: 'Document D content', metadata: {} },
			];

			await chain.invoke({ input_documents: documents });

			// Should have called sleep once (between batch 1 and batch 2)
			expect(sleep).toHaveBeenCalledTimes(1);
			expect(sleep).toHaveBeenCalledWith(100);

			// Verify that processing occurred (4 documents + 1 combine call)
			expect(mockLlmWithOrder.invoke).toHaveBeenCalledTimes(5);
		});
	});

	describe('withConfig compatibility', () => {
		it('should return self for LangChain compatibility', () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'map_reduce',
				batchSize: 1,
				delayBetweenBatches: 0,
			});

			const result = chain.withConfig({});
			expect(result).toBe(chain);
		});
	});

	describe('error handling', () => {
		it('should throw error for unknown summarization type', async () => {
			const chain = new BatchedSummarizationChain({
				model: mockLlm,
				type: 'unknown' as any,
				batchSize: 1,
				delayBetweenBatches: 0,
			});

			const documents = [{ pageContent: 'Test', metadata: {} }];

			await expect(chain.invoke({ input_documents: documents })).rejects.toThrow(
				'Unknown summarization type: unknown',
			);
		});
	});
});
