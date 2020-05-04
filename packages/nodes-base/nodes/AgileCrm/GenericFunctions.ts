import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';


export async function agileCrmApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string,  body: any = {}, query: IDataObject = {}, uri?: string): Promise<any> {

    const credentials = this.getCredentials('agileCrmApi');
	const options: OptionsWithUri = {
		method,
		headers: {
			'Accept': 'application/json',
		},
        auth: {
			username: credentials!.email as string,
			password: credentials!.apiKey as string
		},
		uri: uri || `https://n8nio.agilecrm.com/dev/${endpoint}`,
		json: true
	};

	// Only add Body property if method not GET or DELETE to avoid 400 response
	if(method !== "GET" && method !== "DELETE"){
		options.body = body;
	}
	
	try {
		return await this.helpers.request!(options);
	} catch (error) {

		if (error.response && error.response.body && error.response.body.errors) {
			const errorMessages = error.response.body.errors.map((e: IDataObject) => e.message);
			throw new Error(`AgileCRM error response [${error.statusCode}]: ${errorMessages.join(' | ')}`);
		}

		throw error;
	}
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}

