import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { getBoardProxyExecute } from '../../common/utils';

export const FIELD = 'delete';

export const description: INodeProperties[] = [];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const proxy = await getBoardProxyExecute(this, index);
	await proxy.deleteBoard();

	return [{ json: { success: true } }];
}
