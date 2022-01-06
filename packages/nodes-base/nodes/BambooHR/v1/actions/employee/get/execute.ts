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

export async function get(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body: IDataObject = {};
	const requestMethod = 'GET';

	//meta data
	const id = this.getNodeParameter('id', index) as string;

	//query parameters
	let fields = this.getNodeParameter('options.fields', index, []) as string[];

	if (fields.includes('all')) {
		fields = getAllFields();
	}

	//endpoint
	const endpoint = `employees/${id}?fields=${fields}`;

	//response
	const responseData = await apiRequest.call(this, requestMethod, endpoint, body);

	//return
	return this.helpers.returnJsonArray(responseData.body);
}

const getAllFields = () => {
	return [
		'displayName',
		'firstName',
		'lastName',
		'preferredName',
		'jobTitle',
		'workPhone',
		'mobilePhone',
		'workEmail',
		'department',
		'location',
		'division',
		'facebook',
		'linkedIn',
		'twitterFeed',
		'pronouns',
		'workPhoneExtension',
		'supervisor',
		'photoUrl',
	];
};
