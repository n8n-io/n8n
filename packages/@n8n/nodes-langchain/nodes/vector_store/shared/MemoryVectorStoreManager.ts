import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

export class MemoryVectorStoreManager {
	private static instance: MemoryVectorStoreManager | null = null;

	private vectorStoreBuffer: Map<string, MemoryVectorStore>;

	private embeddings: Embeddings;

	private constructor(embeddings: Embeddings) {
		this.vectorStoreBuffer = new Map();
		this.embeddings = embeddings;
	}

	public static getInstance(embeddings: Embeddings): MemoryVectorStoreManager {
		if (!MemoryVectorStoreManager.instance) {
			MemoryVectorStoreManager.instance = new MemoryVectorStoreManager(embeddings);
		}
		return MemoryVectorStoreManager.instance;
	}

	public async getVectorStore(memoryKey: string): Promise<MemoryVectorStore> {
		let vectorStoreInstance = this.vectorStoreBuffer.get(memoryKey);

		if (!vectorStoreInstance) {
			vectorStoreInstance = await MemoryVectorStore.fromExistingIndex(this.embeddings);
			this.vectorStoreBuffer.set(memoryKey, vectorStoreInstance);
		}

		return vectorStoreInstance;
	}

	public async addDocuments(
		memoryKey: string,
		documents: Document[],
		clearStore?: boolean,
	): Promise<void> {
		if (clearStore) {
			this.vectorStoreBuffer.delete(memoryKey);
		}
		const vectorStoreInstance = await this.getVectorStore(memoryKey);
		await vectorStoreInstance.addDocuments(documents);
	}
}
