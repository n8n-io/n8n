import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { config } from 'aws-sdk';
import { OptionsWithUri } from 'request';
import { sign } from 'aws4';

export async function awsConfigCredentials(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions): Promise<void> {
	const credentials = this.getCredentials('aws');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	config.update({
		region: `${credentials.region}`,
		accessKeyId: `${credentials.accessKeyId}`,
		secretAccessKey: `${credentials.secretAccessKey}`,
	});
}

export async function awsApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, service: string, method: string, path: string, body?: string, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('aws');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const endpoint = `${service}.${credentials.region}.amazonaws.com`

	// Sign AWS API request with the user credentials
	const signOpts = {headers: headers || {}, host: endpoint, method: method, path: path, body: body}
	sign(signOpts, {accessKeyId: `${credentials.accessKeyId}`, secretAccessKey: `${credentials.secretAccessKey}`})

	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method: method,
		uri: `https://${endpoint}${signOpts.path}`,
		body: signOpts.body,
	};

	let response: string
	try {
		response = await this.helpers.request!(options);
	} catch (error) {
		console.error(error);

		const errorMessage = error.response.body.message || error.response.body.Message;
		if (error.statusCode === 403) {
			if (errorMessage == 'The security token included in the request is invalid.') {
				throw new Error('The AWS credentials are not valid!');
			} else if (errorMessage.startsWith('The request signature we calculated does not match the signature you provided')) {
				throw new Error('The AWS credentials are not valid!');
			}
		}

		throw errorMessage;
	}

	try {
		return JSON.parse(response);
	} catch (e) {
		return response
	}
}
