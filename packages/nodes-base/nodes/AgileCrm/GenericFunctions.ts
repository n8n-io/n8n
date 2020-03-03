import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function agileCrmApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('agileCrmApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const options: OptionsWithUri = {
		method,
		auth: {username: credentials.username as string, password: credentials.password as string},
		qs: query,
		uri: uri || `https://${credentials.domain}.agilecrm.com/dev/api${endpoint}`,
		json: true,
		body: Object.keys(body).length === 0 ? undefined : body
	};

	try {
		const response = await this.helpers.request!(options);
		return response;
	} catch (error) {
		const errorMessage = error.response.body.message || error.response.body.Message;

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}
