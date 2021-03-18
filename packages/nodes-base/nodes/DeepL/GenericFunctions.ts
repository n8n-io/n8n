import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function deepLApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: IDataObject = {}, qs: IDataObject = {}, uri?: string, headers: IDataObject = {}) {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'apiKey') as string;
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://api.deepl.com/v2${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (authenticationMethod === 'apiKey') {
			const credentials = this.getCredentials('deepLApi');

			if (credentials === undefined) {
				throw new Error('No credentials got returned!');
			}
			options.qs!.auth_key = credentials.apiKey;
			//@ts-ignore
			return await this.helpers.request(options);
		} else {
			throw new Error('Authentication method not supported.');
		}
	} catch (error) {
		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			throw new Error(`Google Translate error response [${error.statusCode}]: ${error.response.body.message}`);
		}
		throw error;
	}
}
