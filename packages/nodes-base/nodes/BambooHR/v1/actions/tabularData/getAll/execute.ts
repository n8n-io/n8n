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

export async function getAll(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body: IDataObject = {};
	const requestMethod = 'GET';

	//meta data
	const tableName = this.getNodeParameter('table', index) as string;

	//query parameter
	const since = this.getNodeParameter('since', index) as string;
	const encodedSince = encodeURIComponent(since);

	//endpoint
	const endpoint = `employees/changed/tables/${tableName}/?since=${encodedSince}`;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray(responseData);
}
