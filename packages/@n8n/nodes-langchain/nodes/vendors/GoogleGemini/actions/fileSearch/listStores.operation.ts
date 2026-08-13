import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { listFileSearchStores } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		description: 'Maximum number of File Search stores to return per page (max 20)',
		default: 10,
		typeOptions: {
			minValue: 1,
			maxValue: 20,
		},
	},
	{
		displayName: 'Page Token',
		name: 'pageToken',
		// eslint-disable-next-line -- pageToken is a pagination token, not a password
		type: 'string',
		description: 'Token from a previous page to retrieve the next page of results',
		default: '',
	},
];

const displayOptions = {
	show: {
		operation: ['listStores'],
		resource: ['fileSearch'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const pageSize = this.getNodeParameter('pageSize', i) as number | undefined;
	const pageToken = this.getNodeParameter('pageToken', i, '') as string | undefined;

	const response = await listFileSearchStores.call(this, pageSize, pageToken);
	return [
		{
			json: response,
			pairedItem: {
				item: i,
			},
		},
	];
}
