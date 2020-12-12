import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function brandfetchApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	try {
		const credentials = this.getCredentials('brandfetchApi');
		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}
		let options: OptionsWithUri = {
			headers: {
				'x-api-key': credentials.apiKey,
				'Content-Type': 'application/json',
			},
			method,
			qs,
			body,
			uri: uri || `https://api.brandfetch.io/v1${resource}`,
			json: true,
		};

		options = Object.assign({}, options, option);

		const response = await this.helpers.request!(options);

		if (response.statusCode !== 200) {
			throw new Error(`Brandfetch error response [${response.statusCode}]: ${response.response}`);
		}
		return response;

	} catch (error) {

		if (error.response && error.response.body && error.response.body.message) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`Brandfetch error response [${error.statusCode}]: ${errorBody.message}`);
		}

		// Expected error data did not get returned so throw the actual error
		throw error;
	}
}
