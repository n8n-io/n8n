import { sign } from 'aws4';
import { OptionsWithUri } from 'request';
import { parseString } from 'xml2js';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';


export async function awsApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('aws');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const endpoint = `${service}.${credentials.region}.amazonaws.com`;

	// Sign AWS API request with the user credentials
	const signOpts = { headers: headers || {}, host: endpoint, method, path, body };
	sign(signOpts, { accessKeyId: `${credentials.accessKeyId}`, secretAccessKey: `${credentials.secretAccessKey}` });

	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method,
		uri: `https://${endpoint}${signOpts.path}`,
		body: signOpts.body,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorMessage = error.response.body.message || error.response.body.Message || error.message;

		if (error.statusCode === 403) {
			if (errorMessage === 'The security token included in the request is invalid.') {
				throw new Error('The AWS credentials are not valid!');
			} else if (errorMessage.startsWith('The request signature we calculated does not match the signature you provided')) {
				throw new Error('The AWS credentials are not valid!');
			}
		}

		throw new Error(`AWS error response [${error.statusCode}]: ${errorMessage}`);
	}
}

export async function awsApiRequestREST(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, service: string, method: string, path: string, body?: string, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const response = await awsApiRequest.call(this, service, method, path, body, headers);
	try {
		return JSON.parse(response);
	} catch (e) {
		return response;
	}
}

export async function awsApiRequestSOAP(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const response = await awsApiRequest.call(this, service, method, path, body, headers);
	try {
		return await new Promise((resolve, reject) => {
			parseString(response, { explicitArray: false }, (err, data) => {
				if (err) {
					return reject(err);
				}
				resolve(data);
			});
		});
	} catch (e) {
		return response;
	}
}
