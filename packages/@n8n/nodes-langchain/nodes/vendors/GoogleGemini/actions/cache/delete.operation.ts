import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Cached Content Name',
		name: 'cachedContentName',
		type: 'string',
		default: '',
		placeholder: 'cachedContents/1234567890',
		required: true,
		description: 'The resource name of the cached content to delete',
	},
];

const displayOptions = {
	show: {
		operation: ['delete'],
		resource: ['cache'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('cachedContentName', i) as string;

	const response = await apiRequest.call(this, 'DELETE', `/v1beta/${name}`);

	return [
		{
			json: { success: true, ...response },
			pairedItem: { item: i },
		},
	];
}
