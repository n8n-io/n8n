import type { Embeddings } from '@langchain/core/embeddings';
import type { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import type { VectorStore } from '@langchain/core/vectorstores';
import { NodeConnectionTypes, type ISupplyDataFunctions, type SupplyData } from 'n8n-workflow';

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
	const useReranker = context.getNodeParameter('useReranker', itemIndex, false) as boolean;

	// Get the vector store client
	const vectorStore = await args.getVectorStoreClient(context, filter, embeddings, itemIndex);
	let response: VectorStore | { reranker: BaseDocumentCompressor; vectorStore: VectorStore } =
		vectorStore;

	if (useReranker) {
		const reranker = (await context.getInputConnectionData(
			NodeConnectionTypes.AiReranker,
			0,
		)) as BaseDocumentCompressor;

		// Return reranker and vector store with log wrapper
		response = {
			reranker,
			vectorStore: logWrapper(vectorStore, context),
		};
	} else {
		// Return the vector store with logging wrapper
		response = logWrapper(vectorStore, context);
	}

	return {
		response,
		closeFunction: async () => {
			// Release the vector store client if a release method was provided
			args.releaseVectorStoreClient?.(vectorStore);
		},
	};
}
