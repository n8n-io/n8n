import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		placeholder: 'e.g. file_123',
		description: 'ID of the file to delete',
		default: '',
	},
];

const displayOptions = {
	show: {
		operation: ['deleteFile'],
		resource: ['file'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', i, '') as string;
	const response = (await apiRequest.call(this, 'DELETE', `/v1/files/${fileId}`)) as {
		id: string;
	};
	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
