import { IExecuteFunctions } from 'n8n-core';

import { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function update(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let body: IDataObject = {};
	const requestMethod = 'POST';

	//meta data
	const id = this.getNodeParameter('employeeId', index) as string;
	const fileId = this.getNodeParameter('fileId', index) as string;

	//endpoint
	const endpoint = `employees/${id}/files/${fileId}`;

	//body parameters
	body = this.getNodeParameter('updateFields', index) as IDataObject;
	body.shareWithEmployee ? (body.shareWithEmployee = 'yes') : (body.shareWithEmployee = 'no');

	//response
	await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray({ success: true });
}
