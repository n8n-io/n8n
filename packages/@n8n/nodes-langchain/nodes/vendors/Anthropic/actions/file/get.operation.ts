import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { File } from '../../helpers/interfaces';
import { getBaseUrl } from '../../helpers/utils';
import { apiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		placeholder: 'e.g. file_123',
		description: 'ID of the file to get metadata for',
		default: '',
	},
];

const displayOptions = {
	show: {
		operation: ['get'],
		resource: ['file'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', i, '') as string;
	const baseUrl = await getBaseUrl.call(this);
	const response = (await apiRequest.call(this, 'GET', `/v1/files/${fileId}`)) as File;
	return [
		{
			json: { ...response, url: `${baseUrl}/v1/files/${response.id}` },
			pairedItem: { item: i },
		},
	];
}
