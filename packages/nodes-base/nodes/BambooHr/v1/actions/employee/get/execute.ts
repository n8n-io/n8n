import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { apiRequest } from '../../../transport';

export async function get(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body: IDataObject = {};
	const requestMethod = 'GET';

	//meta data
	const id = this.getNodeParameter('employeeId', index) as string;

	//query parameters
	const fieldsParameter = this.getNodeParameter('options.fields', index, ['all']) as
		| string[]
		| string;
	let fields = Array.isArray(fieldsParameter)
		? fieldsParameter
		: fieldsParameter.split(',').map((field) => field.trim());

	if (fields.includes('all')) {
		const { fields: allFields } = await apiRequest.call(
			this,
			requestMethod,
			requestPath`employees/directory`,
			body,
		);
		fields = allFields.map((field: IDataObject) => field.id);
	}

	//endpoint
	const endpoint = requestPath`employees/${id}`;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, {
		fields: fields.join(','),
	});

	//return
	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
