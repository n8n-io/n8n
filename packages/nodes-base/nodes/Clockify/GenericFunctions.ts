import type { OptionsWithUri } from 'request';

import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	IDataObject,
} from 'n8n-workflow';

export async function clockifyApiRequest(
	this: ILoadOptionsFunctions | IPollFunctions | IExecuteFunctions,
	method: string,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
): Promise<any> {
	const BASE_URL = 'https://api.clockify.me/api/v1';

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: `${BASE_URL}/${resource}`,
		json: true,
		useQuerystring: true,
	};
	return this.helpers.requestWithAuthentication.call(this, 'clockifyApi', options);
}

export async function clockifyApiRequestAllItems(
	this: IExecuteFunctions | IPollFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query['page-size'] = 50;

	query.page = 1;

	do {
		responseData = await clockifyApiRequest.call(this, method, endpoint, body, query);

		returnData.push.apply(returnData, responseData as IDataObject[]);

		const limit = query.limit as number | undefined;
		if (limit && returnData.length >= limit) {
			return returnData;
		}

		query.page++;
	} while (responseData.length !== 0);

	return returnData;
}
