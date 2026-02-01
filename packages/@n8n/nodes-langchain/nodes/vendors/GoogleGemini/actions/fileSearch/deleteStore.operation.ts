import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { deleteFileSearchStore } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'File Search Store Name',
		name: 'fileSearchStoreName',
		type: 'string',
		placeholder: 'e.g. fileSearchStores/abc123',
		description: 'The full name of the File Search store to delete (format: fileSearchStores/...)',
		default: '',
		required: true,
	},
	{
		displayName: 'Force Delete',
		name: 'force',
		type: 'boolean',
		description:
			'Whether to delete related Documents and objects. If false, deletion will fail if the store contains any Documents.',
		default: false,
	},
];

const displayOptions = {
	show: {
		operation: ['deleteStore'],
		resource: ['fileSearch'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const fileSearchStoreName = this.getNodeParameter('fileSearchStoreName', i, '') as string;
	const force = this.getNodeParameter('force', i, false) as boolean | undefined;

	const response = await deleteFileSearchStore.call(this, fileSearchStoreName, force);
	return [
		{
			json: response,
			pairedItem: {
				item: i,
			},
		},
	];
}
