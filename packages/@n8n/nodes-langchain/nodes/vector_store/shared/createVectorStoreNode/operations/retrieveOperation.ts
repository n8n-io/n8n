import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { ISupplyDataFunctions, SupplyData } from 'n8n-workflow';

import { getMetadataFiltersValues } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';

import type { VectorStoreNodeConstructorArgs } from '../types';

/**
 * Handles the 'retrieve' operation mode
 * Returns the vector store to be used with AI nodes
 */
export async function handleRetrieveOperation<T extends VectorStore = VectorStore>(
	context: ISupplyDataFunctions,
	args: VectorStoreNodeConstructorArgs<T>,
	embeddings: Embeddings,
	itemIndex: number,
): Promise<SupplyData> {
	// Get metadata filters
	const filter = getMetadataFiltersValues(context, itemIndex);

	// Get the vector store client
	const vectorStore = await args.getVectorStoreClient(context, filter, embeddings, itemIndex);

	// Return the vector store with logging wrapper and cleanup function
	return {
		response: logWrapper(vectorStore, context),
		closeFunction: async () => {
			// Release the vector store client if a release method was provided
			args.releaseVectorStoreClient?.(vectorStore);
		},
	};
}
