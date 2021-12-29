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

export async function createRequest(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	let body: IDataObject = {};
	const requestMethod = 'PUT';

	//meta data
	const employeeId = this.getNodeParameter('employeeId', index) as string;

	//endpoint
	const endpoint = `employees/${employeeId}/time_off/request`;

	const startDate = this.getNodeParameter('start', index) as string;
	const endDate = this.getNodeParameter('end', index) as string;

	//body parameters
	body = this.getNodeParameter('additionalFields', index) as IDataObject;
	body.timeOffTypeId = this.getNodeParameter('timeOffTypeId', index) as string;
	body.status = this.getNodeParameter('status', index) as string;
	body.start = moment(startDate).format('YYYY-MM-DD');
	body.end = moment(endDate).format('YYYY-MM-DD');

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray({ statusCode: responseData.statusCode, statusMessage: responseData.statusMessage });
}
