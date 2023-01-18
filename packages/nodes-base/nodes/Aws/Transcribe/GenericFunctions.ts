import { URL } from 'url';

import { Request, sign } from 'aws4';

import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { ICredentialDataDecryptedObject, IDataObject, NodeApiError } from 'n8n-workflow';

import { get } from 'lodash';

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
	method: string,
	path: string,
	body?: string,
	headers?: object,
): Promise<any> {
	const credentials = await this.getCredentials('aws');

	// Concatenate path and instantiate URL object so it parses correctly query strings
	const endpoint = new URL(getEndpointForService(service, credentials) + path);

	// Sign AWS API request with the user credentials
	const signOpts = { headers: headers ?? {}, host: endpoint.host, method, path, body } as Request;
	const securityHeaders = {
		accessKeyId: `${credentials.accessKeyId}`.trim(),
		secretAccessKey: `${credentials.secretAccessKey}`.trim(),
		sessionToken: credentials.temporaryCredentials
			? `${credentials.sessionToken}`.trim()
			: undefined,
	};

	sign(signOpts, securityHeaders);

	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method,
		uri: endpoint.href,
		body: signOpts.body,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error); // no XML parsing needed
	}
}

export async function awsApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	service: string,
	method: string,
	path: string,
	body?: string,
	headers?: object,
): Promise<any> {
	const response = await awsApiRequest.call(this, service, method, path, body, headers);
	try {
		return JSON.parse(response);
	} catch (error) {
		return response;
	}
}

export async function awsApiRequestRESTAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	service: string,
	method: string,
	path: string,
	body?: string,
	query: IDataObject = {},
	_headers: IDataObject = {},
	_option: IDataObject = {},
	_region?: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	const propertyNameArray = propertyName.split('.');

	do {
		responseData = await awsApiRequestREST.call(this, service, method, path, body, query);

		if (get(responseData, `${propertyNameArray[0]}.${propertyNameArray[1]}.NextToken`)) {
			query.NextToken = get(
				responseData,
				`${propertyNameArray[0]}.${propertyNameArray[1]}.NextToken`,
			);
		}
		if (get(responseData, propertyName)) {
			if (Array.isArray(get(responseData, propertyName))) {
				returnData.push.apply(returnData, get(responseData, propertyName));
			} else {
				returnData.push(get(responseData, propertyName));
			}
		}
	} while (
		get(responseData, `${propertyNameArray[0]}.${propertyNameArray[1]}.NextToken`) !== undefined
	);

	return returnData;
}
