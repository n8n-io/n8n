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

export async function getRequests(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const requestMethod = 'GET';

	//meta data
	const start = this.getNodeParameter('start', index) as string;
	const end = this.getNodeParameter('end', index) as string;

	//endpoint
	const endPoint = `time_off/requests/?start=${start}&end=${end}`;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

	//return
	return this.helpers.returnJsonArray(responseData);
}
