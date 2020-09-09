import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	get,
} from 'lodash';

/**
 * Make an API request to Asana
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function asanaApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: object, uri?: string | undefined): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('asanaApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${credentials.accessToken}`,
		},
		method,
		body: { data: body },
		qs: query,
		uri: uri || `https://app.asana.com/api/1.0${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Asana credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.errors) {
			// Try to return the error prettier
			const errorMessages = error.response.body.errors.map((errorData: { message: string }) => {
				return errorData.message;
			});
			throw new Error(`Asana error response [${error.statusCode}]: ${errorMessages.join(' | ')}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

export async function asanaApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions ,method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;
	query.limit = 100;

	do {
		responseData = await asanaApiRequest.call(this, method, endpoint, body, query, uri);
		uri = get(responseData, 'next_page.uri');
		returnData.push.apply(returnData, responseData['data']);
	} while (
		responseData['next_page'] !== null
	);

	return returnData;
}
