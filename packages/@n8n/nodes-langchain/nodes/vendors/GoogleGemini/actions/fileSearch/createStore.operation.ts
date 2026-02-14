import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { createFileSearchStore } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		placeholder: 'e.g. My File Search Store',
		description: 'A human-readable name for the File Search store',
		default: '',
		required: true,
	},
];

const displayOptions = {
	show: {
		operation: ['createStore'],
		resource: ['fileSearch'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const displayName = this.getNodeParameter('displayName', i, '') as string;

	const response = await createFileSearchStore.call(this, displayName);
	return [
		{
			json: response,
			pairedItem: {
				item: i,
			},
		},
	];
}
