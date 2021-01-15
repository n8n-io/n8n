import { OptionsWithUri } from 'request';
import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';

export async function clearbitApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, api: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('clearbitApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	let options: OptionsWithUri = {
		headers: { Authorization: `Bearer ${credentials.apiKey}`},
		method,
		qs,
		body,
		uri: uri ||`https://${api}-stream.clearbit.com${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Clearbit credentials are not valid!');
		}

		if (error.response.body && error.response.body.error && error.response.body.error.message) {
			// Try to return the error prettier
			throw new Error(`Clearbit Error [${error.statusCode}]: ${error.response.body.error.message}`);
		}

		// If that data does not exist for some reason return the actual error
		throw new Error('Clearbit Error: ' + error.message);
	}
}
