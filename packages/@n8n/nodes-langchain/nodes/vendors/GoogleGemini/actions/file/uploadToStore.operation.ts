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
		displayName: 'File URL',
		name: 'fileUrl',
		type: 'string',
		placeholder: 'e.g. https://example.com/file.pdf',
		description: 'URL of the file to upload',
		default: '',
		required: true,
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
	const fileUrl = this.getNodeParameter('fileUrl', i, '') as string;

	// Normalize the store name - if it's just an ID, prepend the prefix
	const normalizedStoreName = fileSearchStoreName.startsWith('fileSearchStores/')
		? fileSearchStoreName
		: `fileSearchStores/${fileSearchStoreName}`;

	const response = await uploadToFileSearchStore.call(
		this,
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
