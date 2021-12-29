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

import * as moment from 'moment';

export async function adjustTime(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body: IDataObject = {};
	const requestMethod = 'PUT';

	//meta data
	const employeeId = this.getNodeParameter('employeeId', index) as string;

	//endpoint
	const endpoint = `employees/${employeeId}/time_off/balance_adjustment/`;

	const date = this.getNodeParameter('date', index) as string;

	//body parameters
	body.timeOffTypeId = this.getNodeParameter('timeOffTypeId', index) as string;
	body.date = moment(date).format('YYYY-MM-DD');
	body.amount = this.getNodeParameter('amount', index) as string;
	body.note = this.getNodeParameter('note', index) as string;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}
