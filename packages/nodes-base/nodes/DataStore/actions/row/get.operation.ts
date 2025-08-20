import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { getDataStoreProxy } from '../../common/utils';

// const displayOptions = {
// 	show: {
// 		resource: ['row'],
// 		operation: ['get'],
// 	},
// };

export const FIELD: string = 'get';

export const description: INodeProperties[] = [];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const dataStoreProxy = await getDataStoreProxy(this, index);
	// todo: pagination
	const response = await dataStoreProxy.getManyRowsAndCount({});
	return response.data.map((json) => ({ json }));
}
