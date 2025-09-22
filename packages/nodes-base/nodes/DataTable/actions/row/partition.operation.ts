import type {
	IDisplayOptions,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { executeSelectMany, getSelectFields } from '../../common/selectMany';
import { getDataTableProxyExecute } from '../../common/utils';

export const FIELD: string = 'partition';

const displayOptions: IDisplayOptions = {
	show: {
		resource: ['row'],
		operation: [FIELD],
	},
};

export const description: INodeProperties[] = [
	...getSelectFields(displayOptions, true, true),
	{
		displayName: 'Keep Matches',
		name: 'keepMatches',
		description: 'Whether to return matching items, rather than missing items',
		type: 'boolean',
		default: false,
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const keepMatches = this.getNodeParameter('keepMatches', index, false);

	const dataStoreProxy = await getDataTableProxyExecute(this, index);
	const hits = await executeSelectMany(this, index, dataStoreProxy, undefined, 1);
	const hasHit = hits.length > 0;
	return keepMatches === hasHit ? [this.getInputData()[index]] : [];
}
