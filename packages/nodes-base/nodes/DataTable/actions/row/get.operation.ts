import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { executeSelectMany, getSelectFields } from '../../common/selectMany';
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

	return await executeSelectMany(this, index, dataStoreProxy);
}
