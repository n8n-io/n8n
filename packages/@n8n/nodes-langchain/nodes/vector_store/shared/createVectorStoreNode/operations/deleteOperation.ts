import type { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { VectorStoreNodeConstructorArgs } from '../types';

/**
 * Handles the 'delete' operation mode
 * Deletes documents from the vector store
 */
export async function handleDeleteOperation<T extends VectorStore = VectorStore>(
	context: IExecuteFunctions,
	args: VectorStoreNodeConstructorArgs<T>,
	embeddings: Embeddings,
): Promise<INodeExecutionData[]> {
	const items = context.getInputData();
	const resultData: INodeExecutionData[] = [];

	const ids: string[] = items.map(({ json }) => json.id as string);

	await args.deleteEmbeddedDocuments?.(context, embeddings, ids, 0);

	// TODO: what (if any analytics) should we use here?
	// Log the AI event for analytics
	// logAiEvent(context, 'ai-vector-store-populated');

	return resultData;
}
