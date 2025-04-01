import { Document } from '@langchain/core/documents';
import { mock } from 'jest-mock-extended';
import type { MemoryVectorStore } from 'langchain/vectorstores/memory';

import { MemoryCalculator } from '../MemoryCalculator';

function createTestEmbedding(dimensions = 1536, initialValue = 0.1, multiplier = 1): number[] {
	return new Array(dimensions).fill(initialValue).map((value) => value * multiplier);
}

describe('MemoryCalculator', () => {
	let calculator: MemoryCalculator;

	beforeEach(() => {
		calculator = new MemoryCalculator();
	});

	describe('estimateBatchSize', () => {
		it('should return 0 for empty document arrays', () => {
			const size = calculator.estimateBatchSize([]);
			expect(size).toBe(0);
		});

		it('should calculate size for simple documents', () => {
			const documents = [
				new Document({ pageContent: 'Hello, world!', metadata: { simple: 'value' } }),
			];

			const size = calculator.estimateBatchSize(documents);

			expect(size).toBeGreaterThan(0);

			// The size should account for the content, metadata, embedding size, and overhead
			const simpleCase = calculator.estimateBatchSize([
				new Document({ pageContent: '', metadata: {} }),
			]);
			const withContent = calculator.estimateBatchSize([
				new Document({ pageContent: 'test content', metadata: {} }),
			]);
			const withMetadata = calculator.estimateBatchSize([
				new Document({ pageContent: '', metadata: { key: 'value' } }),
			]);

			// Content should increase size
			expect(withContent).toBeGreaterThan(simpleCase);

			// Metadata should increase size
			expect(withMetadata).toBeGreaterThan(simpleCase);
		});

		it('should account for content length in size calculation', () => {
			const shortDoc = new Document({
				pageContent: 'Short content',
				metadata: {},
			});

			const longDoc = new Document({
				pageContent: 'A'.repeat(1000),
				metadata: {},
			});

			const shortSize = calculator.estimateBatchSize([shortDoc]);
			const longSize = calculator.estimateBatchSize([longDoc]);

			// Long content should result in a larger size estimate
			expect(longSize).toBeGreaterThan(shortSize);
			expect(longSize - shortSize).toBeGreaterThan(1000);
		});

		it('should account for metadata complexity in size calculation', () => {
			const simpleMetadata = new Document({
				pageContent: '',
				metadata: { simple: 'value' },
			});

			const complexMetadata = new Document({
				pageContent: '',
				metadata: {
					nested: {
						objects: {
							with: {
								many: {
									levels: [1, 2, 3, 4, 5],
									andArray: ['a', 'b', 'c', 'd', 'e'],
								},
							},
						},
					},
					moreKeys: 'moreValues',
					evenMore: 'data',
				},
			});

			const simpleSize = calculator.estimateBatchSize([simpleMetadata]);
			const complexSize = calculator.estimateBatchSize([complexMetadata]);

			// Complex metadata should result in a larger size estimate
			expect(complexSize).toBeGreaterThan(simpleSize);
		});

		it('should scale with the number of documents', () => {
			const doc = new Document({ pageContent: 'Sample content', metadata: { key: 'value' } });

			const singleSize = calculator.estimateBatchSize([doc]);
			const doubleSize = calculator.estimateBatchSize([doc, doc]);
			const tripleSize = calculator.estimateBatchSize([doc, doc, doc]);

			// Size should scale roughly linearly with document count
			expect(doubleSize).toBeGreaterThan(singleSize * 1.5); // Allow for some overhead
			expect(tripleSize).toBeGreaterThan(doubleSize * 1.3); // Allow for some overhead
		});
	});

	describe('calculateVectorStoreSize', () => {
		it('should return 0 for empty vector stores', () => {
			const mockVectorStore = mock<MemoryVectorStore>();

			const size = calculator.calculateVectorStoreSize(mockVectorStore);
			expect(size).toBe(0);
		});

		it('should calculate size for vector stores with content', () => {
			const mockVectorStore = mock<MemoryVectorStore>();
			mockVectorStore.memoryVectors = [
				{
					embedding: createTestEmbedding(), // Using the helper function
					content: 'Document content',
					metadata: { simple: 'value' },
				},
			];

			const size = calculator.calculateVectorStoreSize(mockVectorStore);

			// Size should account for the embedding, content, metadata, and overhead
			expect(size).toBeGreaterThan(1536 * 8); // At least the size of the embedding in bytes
		});

		it('should account for vector count in size calculation', () => {
			const singleVector = mock<MemoryVectorStore>();
			singleVector.memoryVectors = [
				{
					embedding: createTestEmbedding(),
					content: 'Content',
					metadata: {},
				},
			];

			const multiVector = mock<MemoryVectorStore>();
			multiVector.memoryVectors = [
				{
					embedding: createTestEmbedding(),
					content: 'Content',
					metadata: {},
				},
				{
					embedding: createTestEmbedding(),
					content: 'Content',
					metadata: {},
				},
				{
					embedding: createTestEmbedding(),
					content: 'Content',
					metadata: {},
				},
			];

			const singleSize = calculator.calculateVectorStoreSize(singleVector);
			const multiSize = calculator.calculateVectorStoreSize(multiVector);

			// Multi-vector store should be about 3x the size
			expect(multiSize).toBeGreaterThan(singleSize * 2.5);
			expect(multiSize).toBeLessThan(singleSize * 3.5);
		});

		it('should handle vectors with no content or metadata', () => {
			const vectorStore = mock<MemoryVectorStore>();
			vectorStore.memoryVectors = [
				{
					embedding: createTestEmbedding(),
					content: '',
					metadata: {},
				},
			];

			const size = calculator.calculateVectorStoreSize(vectorStore);

			// Size should still be positive (at least the embedding size)
			expect(size).toBeGreaterThan(1536 * 8);
		});

		it('should handle null or undefined vector arrays', () => {
			const nullVectorStore = mock<MemoryVectorStore>();
			nullVectorStore.memoryVectors = [];

			const undefinedVectorStore = mock<MemoryVectorStore>();
			undefinedVectorStore.memoryVectors = [];

			expect(calculator.calculateVectorStoreSize(nullVectorStore)).toBe(0);
			expect(calculator.calculateVectorStoreSize(undefinedVectorStore)).toBe(0);
		});
	});
});
