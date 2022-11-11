import { OptionsWithUri } from 'request';

import { IExecuteFunctions, ILoadOptionsFunctions, IPollFunctions } from 'n8n-core';

import { IDataObject } from 'n8n-workflow';

export async function clockifyApiRequest(
	this: ILoadOptionsFunctions | IPollFunctions | IExecuteFunctions,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	_option: IDataObject = {},
	// tslint:disable-next-line:no-any
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
	return await this.helpers.requestWithAuthentication.call(this, 'clockifyApi', options);
}

export async function clockifyApiRequestAllItems(
	this: IExecuteFunctions | IPollFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	query['page-size'] = 50;

	query.page = 1;

	do {
		responseData = await clockifyApiRequest.call(this, method, endpoint, body, query);

		returnData.push.apply(returnData, responseData);

		if (query.limit && returnData.length >= query.limit) {
			return returnData;
		}

		query.page++;
	} while (responseData.length !== 0);

	return returnData;
}
