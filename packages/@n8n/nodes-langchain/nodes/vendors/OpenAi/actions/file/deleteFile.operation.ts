import type { INodeProperties, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { apiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'File',
		name: 'fileId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'fileSearch',
					searchable: true,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: 'file-[a-zA-Z0-9]',
							errorMessage: 'Not a valid File ID',
						},
					},
				],
				placeholder: 'e.g. file-1234567890',
			},
		],
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
	const fileId = this.getNodeParameter('fileId', i, '', { extractValue: true });

	const response = await apiRequest.call(this, 'DELETE', `/files/${fileId}`);

	return [
		{
			json: response,
			pairedItem: { item: i },
		},
	];
}
