import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { OptionsWithUri } from 'request';


/**
 * Make an API request to Asana
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function asanaApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, query?: object): Promise<any> { // tslint:disable-line:no-any
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
		uri: `https://app.asana.com/api/1.0/${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Asana credentials are not valid!');
		}
		console.log(error);
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
