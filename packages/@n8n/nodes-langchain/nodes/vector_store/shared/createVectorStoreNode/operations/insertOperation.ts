import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { logAiEvent } from '@utils/helpers';
import type { N8nBinaryLoader } from '@utils/N8nBinaryLoader';
import type { N8nJsonLoader } from '@utils/N8nJsonLoader';

import { processDocument } from '../../processDocuments';
import type { VectorStoreNodeConstructorArgs } from '../types';

/**
 * Handles the 'insert' operation mode
 * Inserts documents from the input into the vector store
 */
export async function handleInsertOperation<T extends VectorStore = VectorStore>(
	context: IExecuteFunctions,
	args: VectorStoreNodeConstructorArgs<T>,
	embeddings: Embeddings,
): Promise<INodeExecutionData[]> {
	const nodeVersion = context.getNode().typeVersion;
	// Get the input items and document data
	const items = context.getInputData();
	const documentInput = (await context.getInputConnectionData(NodeConnectionTypes.AiDocument, 0)) as
		| N8nJsonLoader
		| N8nBinaryLoader
		| Array<Document<Record<string, unknown>>>;

	const resultData: INodeExecutionData[] = [];
	const documentsForEmbedding: Array<Document<Record<string, unknown>>> = [];

	// Process each input item
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		// Check if execution is being cancelled
		if (context.getExecutionCancelSignal()?.aborted) {
			break;
		}

		const itemData = items[itemIndex];

		// Process the document from the input
		const processedDocuments = await processDocument(documentInput, itemData, itemIndex);

		// Add the serialized documents to the result
		resultData.push(...processedDocuments.serializedDocuments);

		// Add the processed documents to the documents to embedd
		documentsForEmbedding.push(...processedDocuments.processedDocuments);

		// For the version 1, we run the populateVectorStore(embedding and insert) function for each item
		if (nodeVersion === 1) {
			await args.populateVectorStore(
				context,
				embeddings,
				processedDocuments.processedDocuments,
				itemIndex,
			);
		}
		// Log the AI event for analytics
		logAiEvent(context, 'ai-vector-store-populated');
	}

	// For the version 1.1, we run the populateVectorStore in batches
	if (nodeVersion >= 1.1) {
		const embeddingBatchSize =
			(context.getNodeParameter('embeddingBatchSize', 0, 200) as number) ?? 200;

		// Populate the vector store with the processed documents in batches
		for (let i = 0; i < documentsForEmbedding.length; i += embeddingBatchSize) {
			const nextBatch = documentsForEmbedding.slice(i, i + embeddingBatchSize);
			await args.populateVectorStore(context, embeddings, nextBatch, 0);
		}
	}

	return resultData;
}
