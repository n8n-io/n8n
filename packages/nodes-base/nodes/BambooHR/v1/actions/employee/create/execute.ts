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

export async function create(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	let body: IDataObject = {};
	const requestMethod = 'POST';
	const endpoint = 'employees';

	//body parameters
	body = this.getNodeParameter('additionalFields', index) as IDataObject;
	body.firstName = this.getNodeParameter('firstName', index) as string;
	body.lastName = this.getNodeParameter('lastName', index) as string;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	//obtain employeeID
	const rawEmployeeId = responseData.headers.location.lastIndexOf('/');
	const employeeId = responseData.headers.location.substring(rawEmployeeId + 1);

	//return
	return this.helpers.returnJsonArray({ id: employeeId });
}
