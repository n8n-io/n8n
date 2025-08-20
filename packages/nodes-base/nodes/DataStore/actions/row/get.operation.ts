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
	let take = 1000;
	const result: INodeExecutionData[] = [];
	do {
		const response = await dataStoreProxy.getManyRowsAndCount({ skip: result.length, take });
		const data = response.data.map((json) => ({ json }));

		// Optimize common path of <1000 results
		if (response.count === response.data.length) {
			return response.data.map((json) => ({ json }));
		}

		result.push.apply(result, data);
		take = Math.min(response.count - result.length, take);
	} while (take > 0);
	return result;
}
