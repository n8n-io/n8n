import type { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import { VectorStore } from '@langchain/core/vectorstores';
import type { IVectorStoreDataService } from 'n8n-workflow';

/**
 * DatabaseVectorStore - A VectorStore implementation that persists vectors in the n8n instance database
 *
 * This class bridges LangChain's VectorStore interface with n8n's database backend,
 * providing persistent vector storage using either:
 * - PostgreSQL with pgvector extension
 * - SQLite with sqlite-vec extension
 */
export class DatabaseVectorStore extends VectorStore {
	constructor(
		embeddings: Embeddings,
		private readonly service: IVectorStoreDataService,
		private readonly memoryKey: string,
	) {
		super(embeddings, {});
	}

	/**
	 * Add documents to the vector store
	 */
	async addDocuments(documents: Document[]): Promise<string[]> {
		const texts = documents.map((doc) => doc.pageContent);
		const embeddings = await this.embeddings.embedDocuments(texts);

		return await this.addVectors(embeddings, documents);
	}

	/**
	 * Add vectors to the store
	 */
	async addVectors(vectors: number[][], documents: Document[]): Promise<string[]> {
		const vectorDocuments = documents.map((doc) => ({
			content: doc.pageContent,
			metadata: doc.metadata,
		}));

		await this.service.addVectors(this.memoryKey, vectorDocuments, vectors, false);

		// Return empty array of IDs since our implementation doesn't use specific IDs
		return Array.from({ length: documents.length }, () => '');
	}

	/**
	 * Perform similarity search and return documents with scores
	 */
	async similaritySearchVectorWithScore(
		query: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<Array<[Document, number]>> {
		const results = await this.service.similaritySearch(this.memoryKey, query, k, filter);

		return results.map((result) => {
			const doc = new Document({
				pageContent: result.document.content,
				metadata: result.document.metadata,
			});
			return [doc, result.score];
		});
	}

	/**
	 * Return documents selected using the maximal marginal relevance
	 * Not implemented for database vector store
	 */
	async maxMarginalRelevanceSearch(
		_query: string,
		_options: { k: number; fetchK?: number; lambda?: number; filter?: Record<string, unknown> },
	): Promise<Document[]> {
		throw new Error('maxMarginalRelevanceSearch is not supported for DatabaseVectorStore');
	}

	/**
	 * Get type identifier
	 */
	_vectorstoreType(): string {
		return 'database';
	}

	/**
	 * Clear all vectors for this memory key
	 */
	async clearStore(): Promise<void> {
		await this.service.clearStore(this.memoryKey);
	}

	/**
	 * Get count of vectors in the store
	 */
	async getVectorCount(): Promise<number> {
		return await this.service.getVectorCount(this.memoryKey);
	}
}
