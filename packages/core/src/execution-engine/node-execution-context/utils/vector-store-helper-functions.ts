import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';

/**
 * Vector Store helper functions for accessing persistent vector storage
 */
export interface VectorStoreHelperFunctions {
	/**
	 * Get the VectorStoreDataService instance for database-backed vector storage
	 */
	getVectorStoreService: () => unknown;
}

/**
 * Create vector store helper functions for the execution context
 */
export function getVectorStoreHelperFunctions(
	additionalData: IWorkflowExecuteAdditionalData,
): Partial<VectorStoreHelperFunctions> {
	const vectorStoreService = additionalData['vector-store']?.vectorStoreService;
	if (!vectorStoreService) return {};

	return {
		getVectorStoreService: () => vectorStoreService,
	};
}
