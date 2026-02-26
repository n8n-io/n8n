import { BaseVectorStore } from '@n8n/ai-utilities';
import type {
	VectorStoreDocument,
	VectorStoreSearchResult,
	VectorStoreConfig,
} from '@n8n/ai-utilities';
import type { QdrantClient } from '@qdrant/js-client-rest';
import type { Embeddings } from '@langchain/core/embeddings';

export class QdrantVectorStoreCustom extends BaseVectorStore {
	constructor(
		private client: QdrantClient,
		private embeddings: Embeddings,
		collectionName: string,
		private contentKey: string = 'content',
		private metadataKey: string = 'metadata',
	) {
		super('qdrant', collectionName);
	}

	async addDocuments(
		documents: VectorStoreDocument[],
		config?: VectorStoreConfig,
	): Promise<string[]> {
		this.mergeConfig(config);
		const texts = documents.map((d) => d.pageContent);
		const vectors = await this.embeddings.embedDocuments(texts);

		const points = documents.map((doc, i) => ({
			id: doc.id ?? crypto.randomUUID(),
			vector: vectors[i],
			payload: {
				[this.contentKey]: doc.pageContent,
				[this.metadataKey]: doc.metadata ?? {},
			},
		}));

		await this.client.upsert(this.storeId, {
			wait: true,
			points,
		});

		return points.map((p) => String(p.id));
	}

	async similaritySearch(
		_query: string,
		embeddings: number[],
		config?: VectorStoreConfig,
	): Promise<VectorStoreSearchResult[]> {
		const mergedConfig = this.mergeConfig(config);
		const limit = mergedConfig.topK ?? 4;

		const response = await this.client.search(this.storeId, {
			vector: embeddings,
			limit,
			filter: mergedConfig.filter,
			with_payload: true,
		});

		return response.map((result) => ({
			document: {
				id: String(result.id),
				pageContent: result.payload?.[this.contentKey] as string,
				metadata: result.payload?.[this.metadataKey] as Record<string, unknown>,
			},
			score: result.score,
		}));
	}

	async deleteDocuments(ids: string[], _config?: VectorStoreConfig): Promise<void> {
		await this.client.delete(this.storeId, {
			wait: true,
			points: ids,
		});
	}

	async addVectors(
		vectors: number[][],
		documents: VectorStoreDocument[],
		config?: VectorStoreConfig,
	): Promise<string[]> {
		this.mergeConfig(config);

		const points = documents.map((doc, i) => ({
			id: doc.id ?? crypto.randomUUID(),
			vector: vectors[i],
			payload: {
				[this.contentKey]: doc.pageContent,
				[this.metadataKey]: doc.metadata ?? {},
			},
		}));

		await this.client.upsert(this.storeId, {
			wait: true,
			points,
		});

		return points.map((p) => String(p.id));
	}
}
