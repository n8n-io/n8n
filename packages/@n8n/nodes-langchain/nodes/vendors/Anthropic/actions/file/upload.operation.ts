import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import type { File } from '../../helpers/interfaces';
import { downloadFile, getBaseUrl, uploadFile } from '../../helpers/utils';

export const properties: INodeProperties[] = [
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
		description: 'Name of the binary field which contains the file',
		displayOptions: {
			show: {
				inputType: ['binary'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				description: 'The file name to use for the uploaded file',
				default: '',
			},
		],
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
	const fileName = this.getNodeParameter('options.fileName', i, 'file') as string;
	const baseUrl = await getBaseUrl.call(this);

	let response: File;
	if (inputType === 'url') {
		const fileUrl = this.getNodeParameter('fileUrl', i, '') as string;
		const { fileContent, mimeType } = await downloadFile.call(this, fileUrl);
		response = await uploadFile.call(this, fileContent, mimeType, fileName);
	} else {
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
		const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
		const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
		response = await uploadFile.call(this, buffer, binaryData.mimeType, fileName);
	}

	return [
		{
			json: { ...response, url: `${baseUrl}/v1/files/${response.id}` },
			pairedItem: {
				item: i,
			},
		},
	];
}
