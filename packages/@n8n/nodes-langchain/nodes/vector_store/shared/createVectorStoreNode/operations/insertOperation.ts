import type { Document } from '@langchain/core/documents';
import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

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
	// Get the input items and document data
	const items = context.getInputData();
	const documentInput = (await context.getInputConnectionData(NodeConnectionType.AiDocument, 0)) as
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

		// Log the AI event for analytics
		logAiEvent(context, 'ai-vector-store-populated');
	}
	// Populate the vector store with the processed documents
	await args.populateVectorStore(context, embeddings, documentsForEmbedding, 0);

	return resultData;
}
