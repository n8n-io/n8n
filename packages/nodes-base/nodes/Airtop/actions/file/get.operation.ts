import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { ERROR_MESSAGES } from '../../constants';
import { apiRequest } from '../../transport';
import type { IAirtopResponseWithFiles } from '../../transport/types';

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['get'],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the file to retrieve',
		displayOptions,
	},
	{
		displayName: 'Output Binary File',
		name: 'outputBinaryFile',
		type: 'boolean',
		default: false,
		description: 'Whether to output the file in binary format if the file is ready for download',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', index, '') as string;
	const outputBinaryFile = this.getNodeParameter('outputBinaryFile', index, false);

	if (!fileId) {
		throw new NodeOperationError(
			this.getNode(),
			ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'File ID'),
		);
	}

	const response = (await apiRequest.call(
		this,
		'GET',
		`/files/${fileId}`,
	)) as IAirtopResponseWithFiles;

	const { fileName = '', downloadUrl = '', status = '' } = response?.data ?? {};

	// Handle binary file output
	if (outputBinaryFile && downloadUrl && status === 'available') {
		const buffer = (await this.helpers.httpRequest({
			url: downloadUrl,
			json: false,
			encoding: 'arraybuffer',
		})) as Buffer;
		const file = await this.helpers.prepareBinaryData(buffer, fileName);
		return [
			{
				json: {
					...response,
				},
				binary: { data: file },
			},
		];
	}

	return this.helpers.returnJsonArray({ ...response });
}
