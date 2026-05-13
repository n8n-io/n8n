import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import * as board from './board/Board.resource';
import * as item from './item/Item.resource';
import * as status from './status/Status.resource';

type BoardResource = 'board' | 'item' | 'status';

const OPERATIONS: Record<
	string,
	Record<
		string,
		{ execute: (this: IExecuteFunctions, index: number) => Promise<INodeExecutionData[]> }
	>
> = {
	board: {
		create: board.create,
		delete: board.deleteBoard,
		get: board.get,
		list: board.list,
	},
	item: {
		create: item.create,
		deleteItem: item.deleteItem,
		get: item.get,
		update: item.update,
	},
	status: {
		add: status.add,
		deleteStatus: status.deleteStatus,
		list: status.list,
		rename: status.rename,
		reorder: status.reorder,
	},
};

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let operationResult: INodeExecutionData[] = [];

	const items = this.getInputData();
	const resource = this.getNodeParameter('resource', 0) as BoardResource;
	const operation = this.getNodeParameter('operation', 0) as string;

	const handler = OPERATIONS[resource]?.[operation];
	if (!handler) {
		throw new NodeOperationError(this.getNode(), `Unknown operation: ${resource}.${operation}`);
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const responseData = await handler.execute.call(this, i);
			const executionData = this.helpers.constructExecutionMetaData(responseData, {
				itemData: { item: i },
			});
			operationResult = operationResult.concat(executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const inputData = this.getInputData(i)[0].json;
				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					operationResult.push({ json: inputData, error });
				} else {
					operationResult.push({
						json: inputData,
						error: new NodeOperationError(this.getNode(), error as Error),
					});
				}
			} else {
				throw error;
			}
		}
	}

	return [operationResult];
}
