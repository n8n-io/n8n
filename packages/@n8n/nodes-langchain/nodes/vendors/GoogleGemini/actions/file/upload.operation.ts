import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { transferFile } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'Input type',
		name: 'inputType',
		type: 'options',
		default: 'url',
		options: [
			{
				name: 'File URL',
				value: 'url',
			},
			{
				name: 'Binary file',
				value: 'binary',
			},
		],
	},
	{
		displayName: 'URL',
		name: 'fileUrl',
		type: 'string',
		placeholder: 'e.g. https://example.com/file.pdf',
		description: 'URL of the file to upload',
		default: '',
		displayOptions: {
			show: {
				inputType: ['url'],
			},
		},
	},
	{
		displayName: 'Input data field name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input field containing the binary file data to be processed',
		description: 'Name of the binary property which contains the file',
		displayOptions: {
			show: {
				inputType: ['binary'],
			},
		},
	},
];

const displayOptions = {
	show: {
		operation: ['upload'],
		resource: ['file'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const inputType = this.getNodeParameter('inputType', i, 'url') as string;

	let fileUrl: string | undefined;
	if (inputType === 'url') {
		fileUrl = this.getNodeParameter('fileUrl', i, '') as string;
	}

	const response = await transferFile.call(this, i, fileUrl, 'application/octet-stream');
	return [
		{
			json: response,
			pairedItem: {
				item: i,
			},
		},
	];
}
