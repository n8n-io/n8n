import { URL } from 'url';

import { Request, sign } from 'aws4';

import { parseString } from 'xml2js';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { ICredentialDataDecryptedObject, NodeApiError, NodeOperationError } from 'n8n-workflow';

function getEndpointForService(
	service: string,
	credentials: ICredentialDataDecryptedObject,
): string {
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

export async function awsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string,
	headers?: object,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('aws');

	const requestOptions = {
		qs: {
			service,
			path,
		},
		method,
		body,
		url: '',
		headers,
		region: credentials?.region as string,
	} as IHttpRequestOptions;
	try {
		return await this.helpers.requestWithAuthentication.call(this, 'aws', requestOptions);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error); // no XML parsing needed
	}
}

export async function awsApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string,
	headers?: object,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const response = await awsApiRequest.call(this, service, method, path, body, headers);
	try {
		return JSON.parse(response);
	} catch (error) {
		return response;
	}
}

export async function awsApiRequestSOAP(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string,
	headers?: object,
	// tslint:disable-next-line:no-any
): Promise<any> {
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
	} catch (error) {
		return response;
	}
}
