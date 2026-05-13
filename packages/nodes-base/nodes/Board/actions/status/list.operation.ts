import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { getBoardProxyExecute } from '../../common/utils';

export const FIELD = 'list';

export const description: INodeProperties[] = [];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);
	const statuses = await proxy.getStatuses();

	return statuses.map((status, statusIndex) => ({
		json: { status, index: statusIndex },
	}));
}
