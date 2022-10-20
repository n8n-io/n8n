import {
	get,
} from 'lodash';

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
	IDataObject, IHttpRequestOptions, JsonObject, NodeApiError,
} from 'n8n-workflow';

export async function awsApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string | Buffer, query: IDataObject = {}, headers?: object, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any

	const credentials = await this.getCredentials('aws');

	const requestOptions = {
		qs: {
			...query,
			service,
			path,
		},
		headers,
		method,
		url: '',
		body,
		region: credentials?.region as string,
	} as IHttpRequestOptions;

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'aws', requestOptions);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
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

export async function awsApiRequestSOAP(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string | Buffer, query: IDataObject = {}, headers?: object, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any
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
	} catch (e) {
		return e;
	}
}

export async function awsApiRequestSOAPAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, propertyName: string, service: string, method: string, path: string, body?: string, query: IDataObject = {}, headers: IDataObject = {}, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	const propertyNameArray = propertyName.split('.');

	do {
		responseData = await awsApiRequestSOAP.call(this, service, method, path, body, query, headers, option, region);

		if (get(responseData, `${propertyNameArray[0]}.${propertyNameArray[1]}.NextMarker`)) {
			query['Marker'] = get(responseData, `${propertyNameArray[0]}.${propertyNameArray[1]}.NextMarker`);
		}
		if (get(responseData, propertyName)) {
			if (Array.isArray(get(responseData, propertyName))) {
				returnData.push.apply(returnData, get(responseData, propertyName));
			} else {
				returnData.push(get(responseData, propertyName));
			}
		}
	} while (
		get(responseData, `${propertyNameArray[0]}.${propertyNameArray[1]}.NextMarker`) !== undefined
	);

	return returnData;
}
