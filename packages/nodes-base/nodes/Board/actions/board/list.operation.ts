import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { getBoardAggregateProxy } from '../../common/utils';

export const FIELD = 'list';

export const description: INodeProperties[] = [];

export async function execute(
	this: IExecuteFunctions,
	_index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardAggregateProxy(this);
	const result = await proxy.listBoards();

	return result.data.map((board) => ({
		json: { ...board },
	}));
}
