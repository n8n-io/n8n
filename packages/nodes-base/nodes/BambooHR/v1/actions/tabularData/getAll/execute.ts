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

export async function getAll(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body: IDataObject = {};
	const requestMethod = 'GET';

	//meta data
	const tableName = this.getNodeParameter('table', index) as string;

	//query parameter
	const since = this.getNodeParameter('since', index) as string;
	const date = moment(since).format('YYYY-MM-DDTHH:mm:ss') + 'Z';
	const encodedDate = encodeURIComponent(date);

	//endpoint
	const endpoint = `employees/changed/tables/${tableName}/?since=${encodedDate}`;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray(responseData);
}
