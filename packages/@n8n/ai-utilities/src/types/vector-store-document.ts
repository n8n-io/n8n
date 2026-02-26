export interface VectorStoreDocument {
	/**
	 * Document content/text
	 */
	pageContent: string;

	/**
	 * Document metadata
	 */
	metadata: Record<string, unknown>;

	/**
	 * Optional document ID
	 */
	id?: string;
}
