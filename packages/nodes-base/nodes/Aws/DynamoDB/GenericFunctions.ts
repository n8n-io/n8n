import { URL } from 'url';
import { sign } from 'aws4';
import { OptionsWithUri } from 'request';
import { parseString } from 'xml2js';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject, IDataObject,
} from 'n8n-workflow';
import { IRequestBody } from './types';

function getEndpointForService(service: string, credentials: ICredentialDataDecryptedObject): string {
	let endpoint;
	if (service === 'lambda' && credentials.lambdaEndpoint) {
		endpoint = credentials.lambdaEndpoint;
	} else if (service === 'sns' && credentials.snsEndpoint) {
		endpoint = credentials.snsEndpoint;
	} else {
		endpoint = `https://${service}.${credentials.region}.amazonaws.com`;
	}
	return (endpoint as string).replace('{region}', credentials.region as string);
}

export async function awsApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: object | IRequestBody, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('aws');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	// Concatenate path and instantiate URL object so it parses correctly query strings
	const endpoint = new URL(getEndpointForService(service, credentials) + path);

	// Sign AWS API request with the user credentials
	const signOpts = {
		headers: headers || {}, host: endpoint.host, method, path, body: JSON.stringify(body) };
	sign(signOpts, { accessKeyId: `${credentials.accessKeyId}`.trim(), secretAccessKey: `${credentials.secretAccessKey}`.trim() });


	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method,
		uri: endpoint.href,
		body: signOpts.body,
	};

	console.log(options);

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorMessage = (error.response && error.response.body.message) || (error.response && error.response.body.Message) || error.message;
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

export async function awsApiRequestREST(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, service: string, method: string, path: string, body?: object, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const response = await awsApiRequest.call(this, service, method, path, body, headers);
	try {
		return JSON.parse(response);
	} catch (e) {
		return response;
	}
}

export async function awsApiRequestSOAPAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: IRequestBody, headers?: object): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	console.log('primer request body requesg')
	console.log(body);
	do {
		//@ts-ignore
		responseData = await awsApiRequestREST.call(this, service, method, path, body, headers);
		console.log('esta es la respuesta')
		console.log(responseData);
		if (responseData.LastEvaluatedKey) {
			console.log('Se agrega el exclusivestartkey');
			//@ts-ignore
			body!.ExclusiveStartKey = responseData.LastEvaluatedKey;
			console.log(body);

		}
		returnData.push(...responseData.Items);
	} while (
		responseData.LastEvaluatedKey !== undefined
	);

	return returnData;
}




