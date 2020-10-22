import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { OptionsWithUri } from 'request';
import { IDataObject } from 'n8n-workflow';


/**
 * Make an API request to Airtable
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('airtableApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	query = query || {};

	// For some reason for some endpoints the bearer auth does not work
	// and it returns 404 like for the /meta request. So we always send
	// it as query string.
	query.api_key = credentials.apiKey;

	const options: OptionsWithUri = {
		headers: {
		},
		method,
		body,
		qs: query,
		uri: `https://api.airtable.com/v0/${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Airtable credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.error) {
			// Try to return the error prettier

			const airtableError = error.response.body.error;

			if (airtableError.type && airtableError.message) {
				throw new Error(`Airtable error response [${airtableError.type}]: ${airtableError.message}`);
			}
		}

		// Expected error data did not get returned so rhow the actual error
		throw error;
	}
}


/**
 * Make an API request to paginated Airtable endpoint
 * and return all results
 *
 * @export
 * @param {(IHookFunctions | IExecuteFunctions)} this
 * @param {string} method
 * @param {string} endpoint
 * @param {IDataObject} body
 * @param {IDataObject} [query]
 * @returns {Promise<any>}
 */
export async function apiRequestAllItems(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any

	if (query === undefined) {
		query = {};
	}
	query.pageSize = 100;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData.records);

		query.offset = responseData.offset;
	} while (
		responseData.offset !== undefined
	);

	return {
		records: returnData,
	};
}
