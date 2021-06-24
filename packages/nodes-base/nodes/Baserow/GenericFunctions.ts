import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError
} from 'n8n-workflow';

import {
	BaserowCredentials,
} from './types';

/**
 * Make a request to Baserow API.
 */
export async function baserowApiRequest(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const host = this.getNodeParameter('host', 0) as string;
	const credentials = this.getCredentials('baserowApi') as BaserowCredentials;

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const authorizationString = credentials.authenticationMethod === 'jwtToken'
		? `JWT ${await getJwtToken.call(this)}`
		: `Token ${credentials.apiToken}`;

	const options: OptionsWithUri = {
		headers: {
			Authorization: authorizationString,
		},
		method,
		body,
		qs,
		uri: `${host}${endpoint}`,
		useQuerystring: false,
		json: true,
	};

	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		console.log(options);
		return await this.helpers.request(options);
	} catch (error) {
		if (error.statusCode === 401) {
			const message = 'Invalid authentication. Please try using JWT authentication for this operation.';
			throw new NodeApiError(this.getNode(), error, { message });
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Get all results from a paginated query to Baserow API.
 */
export async function baserowApiRequestAllItems(
	this: IExecuteFunctions,
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
		responseData = await baserowApiRequest.call(this, method, endpoint, body, query);

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

/**
 * Get a JWT token based on Baserow account username and password.
 */
export async function getJwtToken(this: IExecuteFunctions) {
	const host = this.getNodeParameter('host', 0) as string;
	const credentials = this.getCredentials('baserowApi') as BaserowCredentials;

	if (credentials.authenticationMethod !== 'jwtToken') return;

	const options: OptionsWithUri = {
		method: 'POST',
		body: {
			username: credentials.username,
			password: credentials.password,
		},
		uri: `${host}/api/user/token-auth/`,
		json: true,
	};

	try {
		const { token } = await this.helpers.request(options);
		return token;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
