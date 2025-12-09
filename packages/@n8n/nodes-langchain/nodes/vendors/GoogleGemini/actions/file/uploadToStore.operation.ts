import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import { uploadToFileSearchStore } from '../../helpers/utils';

export const properties: INodeProperties[] = [
	{
		displayName: 'File Search Store Name',
		name: 'fileSearchStoreName',
		type: 'string',
		placeholder: 'e.g. fileSearchStores/123456789',
		description:
			'The name of the File Search store to upload to. Can be the full name (fileSearchStores/...) or just the ID.',
		default: '',
		required: true,
	},
	{
		displayName: 'File Display Name',
		name: 'displayName',
		type: 'string',
		placeholder: 'e.g. My Document',
		description: 'A human-readable name for the file (will be visible in citations)',
		default: '',
		required: true,
	},
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		default: 'url',
		options: [
			{
				name: 'File URL',
				value: 'url',
			},
			{
				name: 'Binary File',
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
		displayName: 'Input Data Field Name',
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
		operation: ['uploadToStore'],
		resource: ['file'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const fileSearchStoreName = this.getNodeParameter('fileSearchStoreName', i, '') as string;
	const displayName = this.getNodeParameter('displayName', i, '') as string;
	const inputType = this.getNodeParameter('inputType', i, 'url') as string;

	// Normalize the store name - if it's just an ID, prepend the prefix
	const normalizedStoreName = fileSearchStoreName.startsWith('fileSearchStores/')
		? fileSearchStoreName
		: `fileSearchStores/${fileSearchStoreName}`;

	let fileUrl: string | undefined;
	if (inputType === 'url') {
		fileUrl = this.getNodeParameter('fileUrl', i, '') as string;
	}

	const response = await uploadToFileSearchStore.call(
		this,
		i,
		normalizedStoreName,
		displayName,
		fileUrl,
		'application/octet-stream',
	);

	return [
		{
			json: response,
			pairedItem: {
				item: i,
			},
		},
	];
}
