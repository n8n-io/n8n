import type { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import { VectorStore } from '@langchain/core/vectorstores';

// Type definition for the VectorStoreDataService interface
// The actual service is injected at runtime from the execution context
interface VectorStoreDataService {
	addVectors(
		memoryKey: string,
		documents: Array<{ content: string; metadata: Record<string, unknown> }>,
		embeddings: number[][],
		clearStore?: boolean,
	): Promise<void>;
	similaritySearch(
		memoryKey: string,
		queryEmbedding: number[],
		k: number,
		filter?: Record<string, unknown>,
	): Promise<
		Array<{ document: { content: string; metadata: Record<string, unknown> }; score: number }>
	>;
	clearStore(memoryKey: string): Promise<void>;
	getVectorCount(memoryKey: string): Promise<number>;
}

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
		private readonly service: VectorStoreDataService,
		private readonly memoryKey: string,
	) {
		super(embeddings, {});
	}

	/**
	 * Add documents to the vector store
	 */
	async addDocuments(documents: Document[]): Promise<string[]> {
		console.log('[DatabaseVectorStore] Adding documents:', {
			memoryKey: this.memoryKey,
			documentCount: documents.length,
			sampleContent: documents[0]?.pageContent.substring(0, 100),
		});

		const texts = documents.map((doc) => doc.pageContent);
		const embeddings = await this.embeddings.embedDocuments(texts);

		console.log('[DatabaseVectorStore] Generated embeddings:', {
			embeddingCount: embeddings.length,
			embeddingDimension: embeddings[0]?.length,
		});

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
	): Promise<[Document, number][]> {
		console.log('[DatabaseVectorStore] Similarity search:', {
			memoryKey: this.memoryKey,
			queryLength: query.length,
			k,
			filter,
		});

		const results = await this.service.similaritySearch(this.memoryKey, query, k, filter);

		console.log('[DatabaseVectorStore] Search results:', {
			resultCount: results.length,
			scores: results.map((r) => r.score),
			sampleContent: results[0]?.document.content.substring(0, 100),
		});

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

	/**
	 * Static method to create a DatabaseVectorStore from texts
	 */
	static async fromTexts(
		texts: string[],
		metadatas: Record<string, unknown> | Record<string, unknown>[],
		embeddings: Embeddings,
		service: VectorStoreDataService,
		memoryKey: string,
	): Promise<DatabaseVectorStore> {
		const docs: Document[] = [];
		for (let i = 0; i < texts.length; i++) {
			const metadata = Array.isArray(metadatas) ? metadatas[i] : metadatas;
			docs.push(new Document({ pageContent: texts[i], metadata }));
		}

		const instance = new DatabaseVectorStore(embeddings, service, memoryKey);
		await instance.addDocuments(docs);
		return instance;
	}

	/**
	 * Static method to create a DatabaseVectorStore from documents
	 */
	static async fromDocuments(
		docs: Document[],
		embeddings: Embeddings,
		service: VectorStoreDataService,
		memoryKey: string,
	): Promise<DatabaseVectorStore> {
		const instance = new DatabaseVectorStore(embeddings, service, memoryKey);
		await instance.addDocuments(docs);
		return instance;
	}
}
