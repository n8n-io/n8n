import type { OpenAIEmbeddings } from '@langchain/openai';
import { mock } from 'jest-mock-extended';

import { MemoryVectorStoreManager } from './MemoryVectorStoreManager';

describe('MemoryVectorStoreManager', () => {
	it('should create an instance of MemoryVectorStoreManager', () => {
		const embeddings = mock<OpenAIEmbeddings>();

		const instance = MemoryVectorStoreManager.getInstance(embeddings);
		expect(instance).toBeInstanceOf(MemoryVectorStoreManager);
	});

	it('should return existing instance', () => {
		const embeddings = mock<OpenAIEmbeddings>();

		const instance1 = MemoryVectorStoreManager.getInstance(embeddings);
		const instance2 = MemoryVectorStoreManager.getInstance(embeddings);
		expect(instance1).toBe(instance2);
	});

	it('should update embeddings in existing instance', () => {
		const embeddings1 = mock<OpenAIEmbeddings>();
		const embeddings2 = mock<OpenAIEmbeddings>();

		const instance = MemoryVectorStoreManager.getInstance(embeddings1);
		MemoryVectorStoreManager.getInstance(embeddings2);

		expect((instance as any).embeddings).toBe(embeddings2);
	});

	it('should update embeddings in existing vector store instances', async () => {
		const embeddings1 = mock<OpenAIEmbeddings>();
		const embeddings2 = mock<OpenAIEmbeddings>();

		const instance1 = MemoryVectorStoreManager.getInstance(embeddings1);
		await instance1.getVectorStore('test');

		const instance2 = MemoryVectorStoreManager.getInstance(embeddings2);
		const vectorStoreInstance2 = await instance2.getVectorStore('test');

		expect((vectorStoreInstance2 as any).embeddings).toBe(embeddings2);
	});
});
