import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';
import { IDataObject } from 'n8n-workflow';
import { OptionsWithUri } from 'request';

export async function cockpitApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('cockpitApi');

	if (credentials === undefined) {
		throw new Error('No credentials available.');
	}

	let options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		qs: {
			token: credentials!.accessToken
		},
		body,
		uri: uri || `${credentials!.url}/api${resource}`,
		json: true
	};

	options = Object.assign({}, options, option);

	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorMessage = error.error.message || error.error.error;

		throw new Error('Cockpit error: ' + errorMessage);
	}
}
