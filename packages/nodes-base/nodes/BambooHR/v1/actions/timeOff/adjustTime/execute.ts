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

export async function adjustTime(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const requestMethod = 'PUT';

	//meta data
	const employeeId = this.getNodeParameter('employeeId', index) as string;

	//endpoint
	const endPoint = `employees/${employeeId}/time_off/balance_adjustment/`;

	//body parameters
	body.timeOffTypeId = this.getNodeParameter('timeOffTypeId', index) as string;
	body.date = this.getNodeParameter('date', index) as string;
	body.amount = this.getNodeParameter('amount', index) as string;
	body.note = this.getNodeParameter('note', index) as string;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endPoint, body);

	//return
	return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}
