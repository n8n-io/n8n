import { Embeddings } from '@langchain/core/embeddings';
import type { VectorStore } from '@langchain/core/vectorstores';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse, NodeOperationError, UnexpectedError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { VectorStoreNodeConstructorArgs } from '../types';
import { isDeleteSupported } from '../utils';

/**
 * The 'delete' mode has no embeddings input. Stores need an Embeddings object to
 * start, but a delete never embeds text, so this one throws if a store uses it.
 */
class NoEmbeddings extends Embeddings {
	constructor() {
		super({});
	}

	async embedDocuments(): Promise<number[][]> {
		throw new UnexpectedError('Embeddings are not available in the delete mode');
	}

	async embedQuery(): Promise<number[]> {
		throw new UnexpectedError('Embeddings are not available in the delete mode');
	}
}

/** Reads the IDs from a comma-separated string or from an array expression. */
function getIds(context: IExecuteFunctions, itemIndex: number): string[] {
	const value = context.getNodeParameter('deleteIds', itemIndex, '');
	const ids = (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [])
		.map((id) => (typeof id === 'string' || typeof id === 'number' ? String(id) : ''))
		.map((id) => id.trim())
		.filter((id) => id.length > 0);

	if (ids.length === 0) {
		throw new NodeOperationError(context.getNode(), 'Enter at least one ID to delete', {
			itemIndex,
		});
	}
	return ids;
}

function getFilter(context: IExecuteFunctions, itemIndex: number): Record<string, unknown> {
	const value = context.getNodeParameter('deleteFilter', itemIndex, {});
	const filter: unknown =
		typeof value === 'string'
			? jsonParse(value, { errorMessage: 'The delete filter is not valid JSON' })
			: value;

	if (!isRecord(filter)) {
		throw new NodeOperationError(context.getNode(), 'The delete filter must be a JSON object', {
			itemIndex,
		});
	}
	if (Object.keys(filter).length === 0) {
		// An empty filter can match all documents, so it is not allowed
		throw new NodeOperationError(context.getNode(), 'Enter a filter to delete documents', {
			itemIndex,
		});
	}
	return filter;
}

/**
 * Handles the 'delete' operation mode.
 * Deletes documents through `VectorStore.delete`, so each LangChain store that
 * implements it works without store-specific code.
 */
export async function handleDeleteOperation<T extends VectorStore = VectorStore>(
	context: IExecuteFunctions,
	args: VectorStoreNodeConstructorArgs<T>,
): Promise<INodeExecutionData[]> {
	if (!isDeleteSupported(args)) {
		throw new NodeOperationError(
			context.getNode(),
			'Delete operation is not implemented for this Vector Store',
		);
	}

	const embeddings = new NoEmbeddings();
	const items = context.getInputData();
	const resultData: INodeExecutionData[] = [];

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const deleteBy = context.getNodeParameter('deleteBy', itemIndex, 'ids') as string;
		const vectorStore = await args.getVectorStoreClient(context, undefined, embeddings, itemIndex);

		try {
			const custom = await args.deleteDocuments?.(context, vectorStore, itemIndex);
			if (custom) {
				resultData.push({ json: custom, pairedItem: { item: itemIndex } });
				continue;
			}

			if (deleteBy === 'ids') {
				const ids = getIds(context, itemIndex);
				await vectorStore.delete({ ids });
				resultData.push({
					json: { deleted: true, deleteBy, ids },
					pairedItem: { item: itemIndex },
				});
			} else if (deleteBy === 'filter' && args.parseDeleteFilter) {
				const filter = getFilter(context, itemIndex);
				await vectorStore.delete({ filter: args.parseDeleteFilter(filter, context, itemIndex) });
				resultData.push({ json: { deleted: true, deleteBy }, pairedItem: { item: itemIndex } });
			} else {
				throw new NodeOperationError(
					context.getNode(),
					`Delete by "${deleteBy}" is not supported for this Vector Store`,
					{ itemIndex },
				);
			}
		} finally {
			args.releaseVectorStoreClient?.(vectorStore);
		}
	}

	return resultData;
}
