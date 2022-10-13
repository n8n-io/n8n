import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function update(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const body: IDataObject = {};
	const requestMethod = 'POST';

	//meta data
	const fileId: string = this.getNodeParameter('fileId', index) as string;

	//endpoint
	const endpoint = `files/${fileId}`;

	//body parameters
	const shareWithEmployee = this.getNodeParameter(
		'updateFields.shareWithEmployee',
		index,
		true,
	) as boolean;

	body.shareWithEmployee = shareWithEmployee ? 'yes' : 'no';

	//response
	await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray({ success: true });
}
