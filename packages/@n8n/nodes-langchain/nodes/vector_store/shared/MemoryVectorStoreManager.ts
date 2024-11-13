import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

export class MemoryVectorStoreManager {
	private static instance: MemoryVectorStoreManager | null = null;

	private vectorStoreBuffer: Map<string, MemoryVectorStore>;

	private constructor(private embeddings: Embeddings) {
		this.vectorStoreBuffer = new Map();
	}

	public static getInstance(embeddings: Embeddings): MemoryVectorStoreManager {
		if (!MemoryVectorStoreManager.instance) {
			MemoryVectorStoreManager.instance = new MemoryVectorStoreManager(embeddings);
		} else {
			// We need to update the embeddings in the existing instance.
			// This is important as embeddings instance is wrapped in a logWrapper,
			// which relies on supplyDataFunctions context which changes on each workflow run
			MemoryVectorStoreManager.instance.embeddings = embeddings;
			MemoryVectorStoreManager.instance.vectorStoreBuffer.forEach((vectorStoreInstance) => {
				vectorStoreInstance.embeddings = embeddings;
			});
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
