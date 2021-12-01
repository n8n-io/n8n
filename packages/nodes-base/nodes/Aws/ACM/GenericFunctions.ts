import {
	Request,
	sign,
} from 'aws4';

import {
	get,
} from 'lodash';

import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

export async function awsApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string | Buffer, query: IDataObject = {}, headers?: object, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('aws');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const endpoint = `${service}.${credentials.region}.amazonaws.com`;

	// Sign AWS API request with the user credentials
	const signOpts = { headers: headers || {}, host: endpoint, method, path, body } as Request;

	if (Object.keys(query).length > 0) {
		signOpts.path = `${signOpts.path}&${queryToString(query)}`;
	}

	sign(signOpts, { accessKeyId: `${credentials.accessKeyId}`, secretAccessKey: `${credentials.secretAccessKey}` });

	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method,
		uri: `https://${endpoint}${signOpts.path}`,
		body,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

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

export async function awsApiRequestREST(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, service: string, method: string, path: string, body?: string, query: IDataObject = {}, headers?: object, options: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any
	const response = await awsApiRequest.call(this, service, method, path, body, query, headers, options, region);
	try {
		return JSON.parse(response);
	} catch (e) {
		return response;
	}
}

export async function awsApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, service: string, method: string, path: string, body?: string, query: IDataObject = {}, headers: IDataObject = {}, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await awsApiRequestREST.call(this, service, method, path, body, query, headers, option, region);
		if (responseData.NextToken) {
			const data = JSON.parse(body as string);
			data['NextToken'] = responseData.NextToken;
		}
		returnData.push.apply(returnData, get(responseData, propertyName));
	} while (
		responseData.NextToken !== undefined
	);

	return returnData;
}

function queryToString(params: IDataObject) {
	return Object.keys(params).map(key => key + '=' + params[key]).join('&');
}
