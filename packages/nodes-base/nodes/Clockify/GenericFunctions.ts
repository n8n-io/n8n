import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-core';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

export async function clockifyApiRequest(this: ILoadOptionsFunctions | IPollFunctions | IExecuteFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('clockifyApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');

	}
	const BASE_URL = 'https://api.clockify.me/api/v1';

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'X-Api-Key': credentials.apiKey as string,
		},
		method,
		qs,
		body,
		uri: `${BASE_URL}/${resource}`,
		json: true,
		useQuerystring: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function clockifyApiRequestAllItems(this: IExecuteFunctions | IPollFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	query['page-size'] = 50;

	query.page = 1;

	do {
		responseData = await clockifyApiRequest.call(this, method, endpoint, body, query);

		returnData.push.apply(returnData, responseData);

		if (query.limit && (returnData.length >= query.limit)) {

			return returnData;
		}

		query.page++;

	} while (
		responseData.length !== 0
	);

	return returnData;
}
