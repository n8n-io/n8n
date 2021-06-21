import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions
} from 'n8n-core';

import { OptionsWithUri } from 'request';

import {
	IDataObject,
	IPollFunctions,
	NodeApiError,
	NodeOperationError
} from 'n8n-workflow';

interface IAttachment {
	url: string;
	filename: string;
	type: string;
}

export interface IRecord {
	fields: {
		[key: string]: string | IAttachment[];
	};
}

/**
 * Make an API request to Baserow
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>} call result
 */
export async function apiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions
		| IPollFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
// tslint:disable-next-line: no-any
): Promise<any> {
	const credentials = this.getCredentials('baserowApi');
	const host = this.getNodeParameter('host', 0) as string;

	if (credentials === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'No credentials got returned!',
		);
	}

	query = query || {};

	const options: OptionsWithUri = {
		headers: {
			authorization: `Token ${credentials.apiToken}`,
		},
		method,
		body,
		qs: query,
		uri: uri || `${host}${endpoint}`,
		useQuerystring: false,
		json: true,
	};

	// Allow to manually extend options
	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	// Remove an empty body
	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Get all results for the paginated query.
 * @param this
 * @param method
 * @param endpoint
 * @param body
 * @param query
 * @param limit limit the result count.
 * @returns result list.
 */
export async function apiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | IPollFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
	limit = 0,
): Promise<IDataObject[]> {
	if (query === undefined) {
		query = {};
	}
	query.size = query.size || 100;
	query.page = 1;

	let remaining = limit;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);

		if (limit > 0) {
			// We limit the result size
			if (responseData.results.length > remaining) {
				responseData.results = responseData.results.slice(0, remaining);
			}
			remaining -= responseData.results.length;
		}

		returnData.push.apply(returnData, responseData.results);

		query.page += 1;
	} while (responseData.next !== undefined && remaining > 0);

	return returnData;
}
