import type { VectorStoreDocument } from './vector-store-document';
import type { VectorStoreSearchResult } from './vector-store-search-result';

export interface VectorStoreConfig {
	/**
	 * Maximum number of results to return
	 */
	topK?: number;

	/**
	 * Similarity score threshold (0-1)
	 */
	scoreThreshold?: number;

	/**
	 * Metadata filters to apply to the search
	 */
	filter?: Record<string, unknown>;

	/**
	 * Namespace/partition for multi-tenant stores
	 */
	namespace?: string;
}

export interface VectorStore<TConfig extends VectorStoreConfig = VectorStoreConfig> {
	/**
	 * Provider identifier (e.g., 'pinecone', 'qdrant', 'memory', 'redis')
	 */
	provider: string;

	/**
	 * Store identifier/name
	 */
	storeId: string;

	/**
	 * Default configuration for the vector store
	 */
	defaultConfig?: TConfig;

	/**
	 * Add documents to the vector store
	 */
	addDocuments(documents: VectorStoreDocument[], config?: TConfig): Promise<string[]>;

	/**
	 * Add documents with pre-computed embeddings (optional optimization)
	 */
	addVectors?(
		vectors: number[][],
		documents: VectorStoreDocument[],
		config?: TConfig,
	): Promise<string[]>;

	/**
	 * Search for similar documents using embeddings
	 */
	similaritySearch(
		query: string,
		embeddings: number[],
		config?: TConfig,
	): Promise<VectorStoreSearchResult[]>;

	/**
	 * Delete documents by ID
	 */
	deleteDocuments(ids: string[], config?: TConfig): Promise<void>;

	/**
	 * Update existing documents
	 */
	updateDocuments?(documents: VectorStoreDocument[], config?: TConfig): Promise<void>;

	/**
	 * Clear all documents from the store
	 */
	clear?(config?: TConfig): Promise<void>;
}

export type { VectorStoreDocument, VectorStoreSearchResult };
