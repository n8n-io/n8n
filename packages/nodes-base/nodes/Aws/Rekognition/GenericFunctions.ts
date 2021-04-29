import {
	URL,
} from 'url';

import {
	sign,
} from 'aws4';

import {
	get,
} from 'lodash';

import {
	OptionsWithUri,
} from 'request';

import {
	parseString,
} from 'xml2js';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError,
 } from 'n8n-workflow';

import {
	pascalCase,
} from 'change-case';

export async function awsApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string | Buffer | IDataObject, query: IDataObject = {}, headers?: object, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('aws');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const endpoint = new URL(((credentials.rekognitionEndpoint as string || '').replace('{region}', credentials.region as string) || `https://${service}.${credentials.region}.amazonaws.com`) + path);

	// Sign AWS API request with the user credentials
	const signOpts = {headers: headers || {}, host: endpoint.host, method, path, body};

	sign(signOpts, { accessKeyId: `${credentials.accessKeyId}`.trim(), secretAccessKey: `${credentials.secretAccessKey}`.trim()});

	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method,
		uri: endpoint.href,
		body: signOpts.body,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function awsApiRequestREST(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, service: string, method: string, path: string, body?: string, query: IDataObject = {}, headers?: object, options: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any
	const response = await awsApiRequest.call(this, service, method, path, body, query, headers, options, region);
	try {
		return JSON.parse(response);
	} catch (error) {
		return response;
	}
}

export async function awsApiRequestSOAP(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string | Buffer | IDataObject, query: IDataObject = {}, headers?: object, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any
	const response = await awsApiRequest.call(this, service, method, path, body, query, headers, option, region);
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
		return error;
	}
}

export async function awsApiRequestSOAPAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, propertyName: string, service: string, method: string, path: string, body?: string, query: IDataObject = {}, headers: IDataObject = {},  option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await awsApiRequestSOAP.call(this, service, method, path, body, query, headers, option, region);

		//https://forums.aws.amazon.com/thread.jspa?threadID=55746
		if (get(responseData, `${propertyName.split('.')[0]}.NextContinuationToken`)) {
			query['continuation-token'] = get(responseData, `${propertyName.split('.')[0]}.NextContinuationToken`);
		}
		if (get(responseData, propertyName)) {
			if (Array.isArray(get(responseData, propertyName))) {
				returnData.push.apply(returnData, get(responseData, propertyName));
			} else {
				returnData.push(get(responseData, propertyName));
			}
		}
		if (query.limit && query.limit <= returnData.length) {
			return returnData;
		}
	} while (
		get(responseData, `${propertyName.split('.')[0]}.IsTruncated`) !== undefined &&
		get(responseData, `${propertyName.split('.')[0]}.IsTruncated`) !== 'false'
	);

	return returnData;
}

function queryToString(params: IDataObject) {
	return Object.keys(params).map(key => key + '=' + params[key]).join('&');
}

export function keysTPascalCase(object: IDataObject) {
	const data: IDataObject = {};
	for (const key of Object.keys(object)) {
		data[pascalCase(key as string)] = object[key];
	}
	return data;
}
