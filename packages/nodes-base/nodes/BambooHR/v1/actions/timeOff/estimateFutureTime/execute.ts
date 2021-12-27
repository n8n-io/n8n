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

export async function estimateFutureTime(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const requestMethod = 'GET';

	//meta data
	const employeeId = this.getNodeParameter('employeeId', index) as string;
	const end = this.getNodeParameter('end', index) as string;

	//endpoint
	const endPoint = `employees/${employeeId}/time_off/calculator/?end=${end}`;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

	//return
	return this.helpers.returnJsonArray(responseData);
}
