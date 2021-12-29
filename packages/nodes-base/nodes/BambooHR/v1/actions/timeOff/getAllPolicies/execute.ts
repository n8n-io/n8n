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

export async function getAllPolicies(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = 'meta/time_off/policies';

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray(responseData);
}
