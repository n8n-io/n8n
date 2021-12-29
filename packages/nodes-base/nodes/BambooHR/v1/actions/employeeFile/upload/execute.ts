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
	const body: IDataObject = {};
	const requestMethod = 'POST';
	const endpoint = 'employees';
	const companyName = this.getNodeParameter('companyName', index) as string;

	body.firstName = this.getNodeParameter('firstName', index) as string;
	body.lastName = this.getNodeParameter('lastName', index) as string;

	const uri = `https://api.bamboohr.com/api/gateway.php/${companyName}/v1/${endpoint}/`;
	const responseData = await apiRequest.call(this, requestMethod, uri, body);

	return this.helpers.returnJsonArray(responseData);
}
