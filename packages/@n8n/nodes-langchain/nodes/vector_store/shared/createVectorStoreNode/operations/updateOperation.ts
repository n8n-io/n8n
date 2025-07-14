import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { logAiEvent } from '@utils/helpers';
import { N8nJsonLoader } from '@utils/N8nJsonLoader';

import { processDocument } from '../../processDocuments';
import type { VectorStoreNodeConstructorArgs } from '../types';
import { isUpdateSupported } from '../utils';

/**
 * Handles the 'update' operation mode
 * Updates existing documents in the vector store by ID
 */
export async function handleUpdateOperation<T extends VectorStore = VectorStore>(
	context: IExecuteFunctions,
	args: VectorStoreNodeConstructorArgs<T>,
	embeddings: Embeddings,
): Promise<INodeExecutionData[]> {
	// First check if update operation is supported by this vector store
	if (!isUpdateSupported(args)) {
		throw new NodeOperationError(
			context.getNode(),
			'Update operation is not implemented for this Vector Store',
		);
	}

	// Get input items
	const items = context.getInputData();
	// Create a loader for processing document data
	const loader = new N8nJsonLoader(context);

	const resultData: INodeExecutionData[] = [];

	// Process each input item
	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const itemData = items[itemIndex];

		// Get the document ID to update
		const documentId = context.getNodeParameter('id', itemIndex, '', {
			extractValue: true,
		}) as string;

		// Get the vector store client
		const vectorStore = await args.getVectorStoreClient(context, undefined, embeddings, itemIndex);

		try {
			// Process the document from the input
			const { processedDocuments, serializedDocuments } = await processDocument(
				loader,
				itemData,
				itemIndex,
			);

			// Validate that we have exactly one document to update
			if (processedDocuments?.length !== 1) {
				throw new NodeOperationError(context.getNode(), 'Single document per item expected');
			}

			// Add the serialized document to the result
			resultData.push(...serializedDocuments);

			// Use document ID to update the existing document
			await vectorStore.addDocuments(processedDocuments, {
				ids: [documentId],
			});

			// Log the AI event for analytics
			logAiEvent(context, 'ai-vector-store-updated');
		} finally {
			// Release the vector store client if a release method was provided
			args.releaseVectorStoreClient?.(vectorStore);
		}
	}

	return resultData;
}
