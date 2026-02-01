import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { ERROR_MESSAGES } from '../../constants';
import { apiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the file to delete',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['deleteFile'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', index, '') as string;

	if (!fileId) {
		throw new NodeOperationError(
			this.getNode(),
			ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'File ID'),
		);
	}

	await apiRequest.call(this, 'DELETE', `/files/${fileId}`);

	return this.helpers.returnJsonArray({ data: { message: 'File deleted successfully' } });
}
