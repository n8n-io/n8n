import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { DynamicTool } from 'langchain/tools';
import type { ISupplyDataFunctions, SupplyData } from 'n8n-workflow';

import { getMetadataFiltersValues } from '@utils/helpers';
import { logWrapper } from '@utils/logWrapper';

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
	const toolName = context.getNodeParameter('toolName', itemIndex) as string;
	const topK = context.getNodeParameter('topK', itemIndex, 4) as number;
	const includeDocumentMetadata = context.getNodeParameter(
		'includeDocumentMetadata',
		itemIndex,
		true,
	) as boolean;

	// Get metadata filters
	const filter = getMetadataFiltersValues(context, itemIndex);

	// Create a Dynamic Tool that wraps vector store search functionality
	const vectorStoreTool = new DynamicTool({
		name: toolName,
		description: toolDescription,
		func: async (input) => {
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
				const embeddedPrompt = await embeddings.embedQuery(input);

				// Search for similar documents
				const documents = await vectorStore.similaritySearchVectorWithScore(
					embeddedPrompt,
					topK,
					filter,
				);

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
