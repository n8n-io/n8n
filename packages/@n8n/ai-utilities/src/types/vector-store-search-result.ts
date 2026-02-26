import type { VectorStoreDocument } from './vector-store-document';

export interface VectorStoreSearchResult {
	/**
	 * The document that was found
	 */
	document: VectorStoreDocument;

	/**
	 * Similarity score (0-1, where 1 is most similar)
	 */
	score: number;
}
