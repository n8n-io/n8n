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
	const body = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = 'employees/directory';

	//limit parameters
	const returnAll = this.getNodeParameter('returnAll', 0, false) as boolean;
	const limit = this.getNodeParameter('limit', 0, 0) as number;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	//return limited result
	if (!returnAll && responseData.body.employees.length > limit) {
		return this.helpers.returnJsonArray(responseData.body.employees.slice(0, limit));
	}

	//return all result
	return this.helpers.returnJsonArray(responseData.body.employees);
}
