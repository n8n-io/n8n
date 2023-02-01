import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function get(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body: IDataObject = {};
	const requestMethod = 'GET';

	//meta data
	const id = this.getNodeParameter('employeeId', index) as string;

	//query parameters
	let fields = this.getNodeParameter('options.fields', index, ['all']) as string[];

	if (fields.includes('all')) {
		const { fields: allFields } = await apiRequest.call(
			this,
			requestMethod,
			'employees/directory',
			body,
		);
		fields = allFields.map((field: IDataObject) => field.id);
	}

	//endpoint
	const endpoint = `employees/${id}?fields=${fields}`;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray(responseData);
}
