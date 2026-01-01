import type { Embeddings } from '@langchain/core/embeddings';
import type { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import type { VectorStore } from '@langchain/core/vectorstores';
import {
	assertParamIsBoolean,
	assertParamIsNumber,
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
} from 'n8n-workflow';

import { getMetadataFiltersValues, logAiEvent } from '@utils/helpers';

import type { VectorStoreNodeConstructorArgs } from '../types';

/**
 * Handles the 'retrieve-as-tool' operation mode in execute context
 * Searches the vector store for documents similar to a query and returns execution data
 * This is similar to the load operation but designed to work with the new tool execution pattern
 */
export async function handleRetrieveAsToolExecuteOperation<T extends VectorStore = VectorStore>(
	context: IExecuteFunctions,
	args: VectorStoreNodeConstructorArgs<T>,
	embeddings: Embeddings,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const filter = getMetadataFiltersValues(context, itemIndex);
	const vectorStore = await args.getVectorStoreClient(
		context,
		// We'll pass filter to similaritySearchVectorWithScore instead of getVectorStoreClient
		undefined,
		embeddings,
		itemIndex,
	);

	try {
		// Get the search parameters - query from input data, others from node parameters
		const inputData = context.getInputData();
		const item = inputData[itemIndex];
		const query = typeof item.json.input === 'string' ? item.json.input : undefined;

		if (!query || typeof query !== 'string') {
			throw new Error('Input data must contain a "input" field with the search query');
		}

		const topK = context.getNodeParameter('topK', itemIndex, 4);
		assertParamIsNumber('topK', topK, context.getNode());
		const useReranker = context.getNodeParameter('useReranker', itemIndex, false);
		assertParamIsBoolean('useReranker', useReranker, context.getNode());

		const includeDocumentMetadata = context.getNodeParameter(
			'includeDocumentMetadata',
			itemIndex,
			true,
		);
		assertParamIsBoolean('includeDocumentMetadata', includeDocumentMetadata, context.getNode());

		// Embed the query to prepare for vector similarity search
		const embeddedQuery = await embeddings.embedQuery(query);

		// Get the most similar documents to the embedded query
		let docs = await vectorStore.similaritySearchVectorWithScore(embeddedQuery, topK, filter);

		// If reranker is used, rerank the documents
		if (useReranker && docs.length > 0) {
			const reranker = (await context.getInputConnectionData(
				NodeConnectionTypes.AiReranker,
				0,
			)) as BaseDocumentCompressor;
			const documents = docs.map(([doc]) => doc);

			const rerankedDocuments = await reranker.compressDocuments(documents, query);
			docs = rerankedDocuments.map((doc) => {
				const { relevanceScore, ...metadata } = doc.metadata || {};
				return [{ ...doc, metadata }, relevanceScore ?? 0];
			});
		}

		// Format the documents for the output similar to the original tool format
		const serializedDocs = docs.map(([doc]) => {
			if (includeDocumentMetadata) {
				return {
					type: 'text',
					text: JSON.stringify({ ...doc }),
				};
			} else {
				return {
					type: 'text',
					pageContent: JSON.stringify({ pageContent: doc.pageContent }),
				};
			}
		});

		// Log the AI event for analytics
		logAiEvent(context, 'ai-vector-store-searched', { input: query });

		return [
			{
				json: {
					response: serializedDocs,
				},
				pairedItem: {
					item: itemIndex,
				},
			},
		];
	} finally {
		// Release the vector store client if a release method was provided
		args.releaseVectorStoreClient?.(vectorStore);
	}
}
