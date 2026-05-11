import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { executeSelectMany, getSelectFields } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD: string = 'rowExists';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [...getSelectFields(displayOptions, true, true)];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const dataTableProxy = await getDataTableProxyExecute(this, index);
	const hits = await executeSelectMany(this, index, dataTableProxy, undefined, 1);
	return hits.length > 0 ? [this.getInputData()[index]] : [];
}
