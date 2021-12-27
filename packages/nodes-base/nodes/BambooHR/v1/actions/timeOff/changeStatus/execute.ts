import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	apiRequest,
} from '../../../transport';

export async function changeStatus(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	let body = {} as IDataObject;
	const requestMethod = 'PUT';

	//meta data
	const requestId = this.getNodeParameter('requestId', index) as string;

	//endpoint
	const endPoint = `time_off/requests/${requestId}/status`;

	//body parameters
	body = this.getNodeParameter('additionalFields', index) as IDataObject;
	body.status = this.getNodeParameter('status', index) as string;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

	//return
	return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}
