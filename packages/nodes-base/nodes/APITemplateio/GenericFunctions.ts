import {
	OptionsWithUri,
 } from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';


export async function apitemplateioApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	opt: any): Promise<any> { 
	const credentials = this.getCredentials('apiTemplateioApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	let method = opt.method?opt.method:{};
	let body =  opt.body?opt.body:{};
	let uri =  opt.uri?opt.uri:null;
	let query =  opt.query?opt.query:{};
	let headers =  opt.headers?opt.headers:{};

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			"X-API-KEY": `${credentials.apiKey}`,
		},
		method,
		body,
		followRedirect: true,
		followAllRedirects: true,
		qs: query,
		uri: uri || `https://api.apitemplate.io/v1${opt.resource}`,
		json: true,
	};

	

	if (!Object.keys(body).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options.headers = Object.assign({}, options.headers, headers);
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.response && error.response.body && error.response.body.message) {
			throw new Error(`APITemplate.io error response [${error.statusCode}]: ${error.response.body.message}`);
		}
		throw error;
	}
}
