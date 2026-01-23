import type { Embeddings } from '@langchain/core/embeddings';
import type { BaseDocumentCompressor } from '@langchain/core/retrievers/document_compressors';
import type { VectorStore } from '@langchain/core/vectorstores';
import { createToolFromNode } from '@utils/fromAIToolFactory';
import { getMetadataFiltersValues } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';
import type { ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
import { assert, NodeConnectionTypes, nodeNameToToolName } from 'n8n-workflow';

import type { VectorStoreNodeConstructorArgs } from '../types';

/**
 * Handles the 'retrieve-as-tool' operation mode
 * Returns a tool that can be used with AI Agent nodes
 */
export async function handleRetrieveAsToolOperation<T extends VectorStore = VectorStore>(
	context: ISupplyDataFunctions,
	args: VectorStoreNodeConstructorArgs<T>,
	embeddings: Embeddings,
	itemIndex: number,
): Promise<SupplyData> {
	// Get the tool configuration parameters
	const toolDescription = context.getNodeParameter('toolDescription', itemIndex) as string;

	const node = context.getNode();
	const { typeVersion } = node;
	const toolName =
		typeVersion < 1.3
			? (context.getNodeParameter('toolName', itemIndex) as string)
			: nodeNameToToolName(node);

	// Create a Dynamic Tool that wraps vector store search functionality
	const vectorStoreTool = createToolFromNode(node, {
		name: toolName,
		description: toolDescription,
		extraArgs: [{ key: 'input', description: 'Query to search for. Required' }],
		func: async (query) => {
			const topK = context.getNodeParameter('topK', itemIndex, 4) as number;
			const useReranker = context.getNodeParameter('useReranker', itemIndex, false) as boolean;
			const includeDocumentMetadata = context.getNodeParameter(
				'includeDocumentMetadata',
				itemIndex,
				true,
			) as boolean;

			// Get metadata filters
			const filter = getMetadataFiltersValues(context, itemIndex);

			// Extract the query string - it can be either a string (DynamicTool) or an object with 'input' key (DynamicStructuredTool)
			const queryString = typeof query === 'string' ? query : query.input;
			assert(typeof queryString === 'string', 'Query must be of type string');

			// For each tool use, get a fresh vector store client.
			// We don't pass in a filter here only later in the similaritySearchVectorWithScore
			// method to avoid an exception with some vector stores like Supabase or Pinecone(#AI-740)
			const vectorStore = await args.getVectorStoreClient(
				context,
				undefined,
				embeddings,
				itemIndex,
			);

			try {
				// Embed the input query
				const embeddedPrompt = await embeddings.embedQuery(queryString);

				// Search for similar documents
				let documents = await vectorStore.similaritySearchVectorWithScore(
					embeddedPrompt,
					topK,
					filter,
				);

				// If reranker is used, rerank the documents
				if (useReranker && documents.length > 0) {
					const reranker = (await context.getInputConnectionData(
						NodeConnectionTypes.AiReranker,
						0,
					)) as BaseDocumentCompressor;

					const docs = documents.map(([doc]) => doc);
					const rerankedDocuments = await reranker.compressDocuments(docs, queryString);
					documents = rerankedDocuments.map((doc) => {
						const { relevanceScore, ...metadata } = doc.metadata;
						return [{ ...doc, metadata }, relevanceScore];
					});
				}

				// Format the documents for the tool output
				return documents
					.map((document) => {
						if (includeDocumentMetadata) {
							return { type: 'text', text: JSON.stringify(document[0]) };
						}
						return {
							type: 'text',
							text: JSON.stringify({ pageContent: document[0].pageContent }),
						};
					})
					.filter((document) => !!document);
			} finally {
				// Release the vector store client if a release method was provided
				args.releaseVectorStoreClient?.(vectorStore);
			}
		},
	});

	// Return the vector store tool with logging wrapper
	return {
		response: logWrapper(vectorStoreTool, context),
	};
}
