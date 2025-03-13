import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { getMetadataFiltersValues, logAiEvent } from '@utils/helpers';

import type { VectorStoreNodeConstructorArgs } from '../types';

/**
 * Handles the 'load' operation mode
 * Searches the vector store for documents similar to a query
 */
export async function handleLoadOperation<T extends VectorStore = VectorStore>(
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
		// Get the search parameters from the node
		const prompt = context.getNodeParameter('prompt', itemIndex) as string;
		const topK = context.getNodeParameter('topK', itemIndex, 4) as number;
		const includeDocumentMetadata = context.getNodeParameter(
			'includeDocumentMetadata',
			itemIndex,
			true,
		) as boolean;

		// Embed the prompt to prepare for vector similarity search
		const embeddedPrompt = await embeddings.embedQuery(prompt);

		// Get the most similar documents to the embedded prompt
		const docs = await vectorStore.similaritySearchVectorWithScore(embeddedPrompt, topK, filter);

		// Format the documents for the output
		const serializedDocs = docs.map(([doc, score]) => {
			const document = {
				pageContent: doc.pageContent,
				...(includeDocumentMetadata ? { metadata: doc.metadata } : {}),
			};

			return {
				json: { document, score },
				pairedItem: {
					item: itemIndex,
				},
			};
		});

		// Log the AI event for analytics
		logAiEvent(context, 'ai-vector-store-searched', { query: prompt });

		return serializedDocs;
	} finally {
		// Release the vector store client if a release method was provided
		args.releaseVectorStoreClient?.(vectorStore);
	}
}
