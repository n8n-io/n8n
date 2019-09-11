import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';


/**
 * Make an API request to ActiveCampaign
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function activeCampaignApiRequest(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject, dataKeys?: string[]): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('activeCampaignApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	if (query === undefined) {
		query = {};
	}

	query.api_key = credentials.apiKey;
	query.api_output = 'json';

	const options: OptionsWithUri = {
		method,
		qs: query,
		uri: `${credentials.apiUrl}${endpoint}`,
		json: true
	};

	if (Object.keys(body).length !== 0) {
		options.form = body;
	}

	const returnData: IDataObject = {};
	try {
		const responseData = await this.helpers.request(options);

		if (responseData.result_code === 0) {
			throw new Error(`ActiveCampaign error response: ${responseData.result_message}`);
		}

		if (dataKeys === undefined) {
			return responseData;
		}

		for (const dataKey of dataKeys) {
			returnData[dataKey] = responseData[dataKey];
		}

		return returnData;

	} catch (error) {
		if (error.statusCode === 403) {
			// Return a clear error
			throw new Error('The ActiveCampaign credentials are not valid!');
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}



/**
 * Make an API request to paginated ActiveCampaign endpoint
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
export async function activeCampaignApiRequestAllItems(this: IHookFunctions | IExecuteFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject, dataKeys?: string[]): Promise<any> { // tslint:disable-line:no-any

	if (query === undefined) {
		query = {};
	}
	query.limit = 100;
	query.offset = 0;

	const returnData: IDataObject[] = [];

	let responseData;

	let itemsReceived = 0;
	do {
		responseData = await activeCampaignApiRequest.call(this, method, endpoint, body, query, dataKeys);

		returnData.push.apply(returnData, responseData);
		itemsReceived += returnData.length;

		query.offset = itemsReceived;
	} while (
		responseData.meta !== undefined &&
		responseData.meta.total !== undefined &&
		responseData.meta.total > itemsReceived
	);

	return returnData;
}
