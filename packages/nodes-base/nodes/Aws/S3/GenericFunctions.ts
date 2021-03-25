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
 } from 'n8n-workflow';

export async function awsApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string | Buffer, query: IDataObject = {}, headers?: object, option: IDataObject = {}, region?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('aws');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const endpoint = new URL(((credentials.s3Endpoint as string || '').replace('{region}', credentials.region as string) || `https://${service}.${credentials.region}.amazonaws.com`) + path);

	// Sign AWS API request with the user credentials
	const signOpts = {headers: headers || {}, host: endpoint.host, method, path: `${endpoint.pathname}?${queryToString(query).replace(/\+/g, '%2B')}`, body};
	

	sign(signOpts, { accessKeyId: `${credentials.accessKeyId}`.trim(), secretAccessKey: `${credentials.secretAccessKey}`.trim()});

	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method,
		qs: query,
		uri: endpoint.href,
		body: signOpts.body,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}
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
