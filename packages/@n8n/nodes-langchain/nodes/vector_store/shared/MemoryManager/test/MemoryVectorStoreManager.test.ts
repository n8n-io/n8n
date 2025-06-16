/* eslint-disable @typescript-eslint/dot-notation */
import { Document } from '@langchain/core/documents';
import type { OpenAIEmbeddings } from '@langchain/openai';
import { mock } from 'jest-mock-extended';
import type { MemoryVectorStore } from 'langchain/vectorstores/memory';
import type { Logger } from 'n8n-workflow';

import * as configModule from '../config';
import { MemoryVectorStoreManager } from '../MemoryVectorStoreManager';

function createTestEmbedding(dimensions = 1536, initialValue = 0.1, multiplier = 1): number[] {
	return new Array(dimensions).fill(initialValue).map((value) => value * multiplier);
}

jest.mock('langchain/vectorstores/memory', () => {
	return {
		MemoryVectorStore: {
			fromExistingIndex: jest.fn().mockImplementation(() => {
				return {
					embeddings: null,
					addDocuments: jest.fn(),
					memoryVectors: [],
				};
			}),
		},
	};
});

describe('MemoryVectorStoreManager', () => {
	let logger: Logger;
	// Reset the singleton instance before each test
	beforeEach(() => {
		jest.clearAllMocks();
		logger = mock<Logger>();
		MemoryVectorStoreManager['instance'] = null;

		jest.useFakeTimers();

		// Mock the config
		jest.spyOn(configModule, 'getConfig').mockReturnValue({
			maxMemoryMB: 100,
			ttlHours: 168,
		});
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});

	it('should create an instance of MemoryVectorStoreManager', () => {
		const embeddings = mock<OpenAIEmbeddings>();

		const instance = MemoryVectorStoreManager.getInstance(embeddings, logger);
		expect(instance).toBeInstanceOf(MemoryVectorStoreManager);
	});

	it('should return existing instance', () => {
		const embeddings = mock<OpenAIEmbeddings>();

		const instance1 = MemoryVectorStoreManager.getInstance(embeddings, logger);
		const instance2 = MemoryVectorStoreManager.getInstance(embeddings, logger);
		expect(instance1).toBe(instance2);
	});

	it('should update embeddings in existing instance', () => {
		const embeddings1 = mock<OpenAIEmbeddings>();
		const embeddings2 = mock<OpenAIEmbeddings>();

		const instance = MemoryVectorStoreManager.getInstance(embeddings1, logger);
		MemoryVectorStoreManager.getInstance(embeddings2, logger);

		expect(instance['embeddings']).toBe(embeddings2);
	});

	it('should update embeddings in existing vector store instances', async () => {
		const embeddings1 = mock<OpenAIEmbeddings>();
		const embeddings2 = mock<OpenAIEmbeddings>();

		const instance1 = MemoryVectorStoreManager.getInstance(embeddings1, logger);
		await instance1.getVectorStore('test');

		const instance2 = MemoryVectorStoreManager.getInstance(embeddings2, logger);
		const vectorStoreInstance2 = await instance2.getVectorStore('test');

		expect(vectorStoreInstance2.embeddings).toBe(embeddings2);
	});

	it('should set up the TTL cleanup interval', () => {
		jest.spyOn(global, 'setInterval');
		const embeddings = mock<OpenAIEmbeddings>();

		MemoryVectorStoreManager.getInstance(embeddings, logger);

		expect(setInterval).toHaveBeenCalled();
	});

	it('should not set up the TTL cleanup interval when TTL is disabled', () => {
		jest.spyOn(configModule, 'getConfig').mockReturnValue({
			maxMemoryMB: 100,
			ttlHours: -1, // TTL disabled
		});

		jest.spyOn(global, 'setInterval');
		const embeddings = mock<OpenAIEmbeddings>();

		MemoryVectorStoreManager.getInstance(embeddings, logger);

		expect(setInterval).not.toHaveBeenCalled();
	});

	it('should track memory usage when adding documents', async () => {
		const embeddings = mock<OpenAIEmbeddings>();
		const instance = MemoryVectorStoreManager.getInstance(embeddings, logger);

		const calculatorSpy = jest
			.spyOn(instance['memoryCalculator'], 'estimateBatchSize')
			.mockReturnValue(1024 * 1024); // Mock 1MB size

		const documents = [new Document({ pageContent: 'test document', metadata: { test: 'value' } })];

		await instance.addDocuments('test-key', documents);

		expect(calculatorSpy).toHaveBeenCalledWith(documents);
		expect(instance.getMemoryUsage()).toBe(1024 * 1024); // Should be 1MB
	});

	it('should clear store metadata when clearing store', async () => {
		const embeddings = mock<OpenAIEmbeddings>();
		const instance = MemoryVectorStoreManager.getInstance(embeddings, logger);

		// Directly set memory usage to 0 to start with a clean state
		instance['memoryUsageBytes'] = 0;

		// Add documents to create a store
		const docs = [new Document({ pageContent: 'test', metadata: {} })];
		jest.spyOn(instance['memoryCalculator'], 'estimateBatchSize').mockReturnValue(1000);

		await instance.addDocuments('test-key', docs);
		expect(instance.getMemoryUsage()).toBe(1000);

		// Directly access the metadata to verify clearing works
		const metadataSizeBefore = instance['storeMetadata'].get('test-key')?.size;
		expect(metadataSizeBefore).toBe(1000);

		// Now clear the store by calling the private method directly
		instance['clearStoreMetadata']('test-key');

		// Verify metadata was reset
		const metadataSizeAfter = instance['storeMetadata'].get('test-key')?.size;
		expect(metadataSizeAfter).toBe(0);

		// The memory usage should be reduced
		expect(instance.getMemoryUsage()).toBe(0);
	});

	it('should request cleanup when adding documents that would exceed memory limit', async () => {
		const embeddings = mock<OpenAIEmbeddings>();
		const instance = MemoryVectorStoreManager.getInstance(embeddings, logger);

		// Spy on the cleanup service
		const cleanupSpy = jest.spyOn(instance['cleanupService'], 'cleanupOldestStores');

		// Set up a large document batch
		const documents = [new Document({ pageContent: 'test', metadata: {} })];
		jest.spyOn(instance['memoryCalculator'], 'estimateBatchSize').mockReturnValue(50 * 1024 * 1024); // 50MB

		await instance.addDocuments('test-key', documents);

		expect(cleanupSpy).toHaveBeenCalledWith(50 * 1024 * 1024);
	});

	it('should recalculate memory usage periodically', async () => {
		const embeddings = mock<OpenAIEmbeddings>();
		const instance = MemoryVectorStoreManager.getInstance(embeddings, logger);

		// Mock methods and spies
		const recalcSpy = jest.spyOn(instance, 'recalculateMemoryUsage');
		const mockVectorStore = mock<MemoryVectorStore>();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		mockVectorStore.memoryVectors = new Array(100).fill({
			embedding: createTestEmbedding(),
			content: 'test',
			metadata: {},
		});

		// Mock the getVectorStore to return our mock
		jest.spyOn(instance, 'getVectorStore').mockResolvedValue(mockVectorStore);
		jest.spyOn(instance['memoryCalculator'], 'estimateBatchSize').mockReturnValue(1000);

		// Add a large batch of documents
		const documents = new Array(21).fill(new Document({ pageContent: 'test', metadata: {} }));
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		await instance.addDocuments('test-key', documents);

		expect(recalcSpy).toHaveBeenCalled();
	});

	it('should provide accurate stats about vector stores', async () => {
		const embeddings = mock<OpenAIEmbeddings>();
		const instance = MemoryVectorStoreManager.getInstance(embeddings, logger);

		// Create mock vector stores
		const mockVectorStore1 = mock<MemoryVectorStore>();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		mockVectorStore1.memoryVectors = new Array(50).fill({
			embedding: createTestEmbedding(),
			content: 'test1',
			metadata: {},
		});

		const mockVectorStore2 = mock<MemoryVectorStore>();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		mockVectorStore2.memoryVectors = new Array(30).fill({
			embedding: createTestEmbedding(),
			content: 'test2',
			metadata: {},
		});

		// Mock internal state
		instance['vectorStoreBuffer'].set('store1', mockVectorStore1);
		instance['vectorStoreBuffer'].set('store2', mockVectorStore2);

		// Set metadata for the stores
		instance['storeMetadata'].set('store1', {
			size: 1024 * 1024, // 1MB
			createdAt: new Date(Date.now() - 3600000), // 1 hour ago
			lastAccessed: new Date(Date.now() - 1800000), // 30 minutes ago
		});

		instance['storeMetadata'].set('store2', {
			size: 512 * 1024, // 0.5MB
			createdAt: new Date(Date.now() - 7200000), // 2 hours ago
			lastAccessed: new Date(Date.now() - 3600000), // 1 hour ago
		});

		// Set memory usage
		instance['memoryUsageBytes'] = 1024 * 1024 + 512 * 1024;

		const stats = instance.getStats();

		expect(stats.storeCount).toBe(2);
		expect(stats.totalSizeBytes).toBeGreaterThan(0);
		expect(Object.keys(stats.stores)).toContain('store1');
		expect(Object.keys(stats.stores)).toContain('store2');
		expect(stats.stores.store1.vectors).toBe(50);
		expect(stats.stores.store2.vectors).toBe(30);
	});

	it('should list all vector stores', async () => {
		const embeddings = mock<OpenAIEmbeddings>();
		const instance = MemoryVectorStoreManager.getInstance(embeddings, logger);

		const mockVectorStore1 = mock<MemoryVectorStore>();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		mockVectorStore1.memoryVectors = new Array(50).fill({
			embedding: createTestEmbedding(),
			content: 'test1',
			metadata: {},
		});

		const mockVectorStore2 = mock<MemoryVectorStore>();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		mockVectorStore2.memoryVectors = new Array(30).fill({
			embedding: createTestEmbedding(),
			content: 'test2',
			metadata: {},
		});

		// Mock internal state
		instance['vectorStoreBuffer'].set('store1', mockVectorStore1);
		instance['vectorStoreBuffer'].set('store2', mockVectorStore2);

		const list = instance.getMemoryKeysList();
		expect(list).toHaveLength(2);
		expect(list[0]).toBe('store1');
		expect(list[1]).toBe('store2');
	});
});
