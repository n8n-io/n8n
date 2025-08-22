import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { getSelectFields, getSelectFilter } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD: string = 'get';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [...getSelectFields(displayOptions)];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const dataStoreProxy = await getDataTableProxyExecute(this, index);

	let take = 1000;
	const result: INodeExecutionData[] = [];

	const filter = getSelectFilter(this, index);

	do {
		const response = await dataStoreProxy.getManyRowsAndCount({
			skip: result.length,
			take,
			filter,
		});
		const data = response.data.map((json) => ({ json }));

		// Optimize common path of <1000 results
		if (response.count === response.data.length) {
			return data;
		}

		result.push.apply(result, data);
		take = Math.min(take, response.count - result.length);
	} while (take > 0);
	return result;
}
