import get from 'lodash.get';

import { parseString } from 'xml2js';

import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IHttpRequestOptions,
} from 'n8n-workflow';

import { pascalCase } from 'change-case';

export async function awsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: string,
	path: string,
	body?: string | Buffer | IDataObject,
	_query: IDataObject = {},
	headers?: object,
	option: IDataObject = {},
	_region?: string,
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

	if (Object.keys(option).length !== 0) {
		Object.assign(requestOptions, option);
	}
	return this.helpers.requestWithAuthentication.call(this, 'aws', requestOptions);
}

export async function awsApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	service: string,
	method: string,
	path: string,
	body?: string,
	query: IDataObject = {},
	headers?: object,
	options: IDataObject = {},
	region?: string,
): Promise<any> {
	const response = await awsApiRequest.call(
		this,
		service,
		method,
		path,
		body,
		query,
		headers,
		options,
		region,
	);
	try {
		return JSON.parse(response as string);
	} catch (error) {
		return response;
	}
}

export async function awsApiRequestSOAP(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: string,
	path: string,
	body?: string | Buffer | IDataObject,
	query: IDataObject = {},
	headers?: object,
	option: IDataObject = {},
	region?: string,
): Promise<any> {
	const response = await awsApiRequest.call(
		this,
		service,
		method,
		path,
		body,
		query,
		headers,
		option,
		region,
	);
	try {
		return await new Promise((resolve, reject) => {
			parseString(response as string, { explicitArray: false }, (err, data) => {
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

export async function awsApiRequestSOAPAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	propertyName: string,
	service: string,
	method: string,
	path: string,
	body?: string,
	query: IDataObject = {},
	headers: IDataObject = {},
	option: IDataObject = {},
	region?: string,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await awsApiRequestSOAP.call(
			this,
			service,
			method,
			path,
			body,
			query,
			headers,
			option,
			region,
		);

		//https://forums.aws.amazon.com/thread.jspa?threadID=55746
		if (get(responseData, `${propertyName.split('.')[0]}.NextContinuationToken`)) {
			query['continuation-token'] = get(
				responseData,
				`${propertyName.split('.')[0]}.NextContinuationToken`,
			);
		}
		if (get(responseData, propertyName)) {
			if (Array.isArray(get(responseData, propertyName))) {
				returnData.push.apply(returnData, get(responseData, propertyName) as IDataObject[]);
			} else {
				returnData.push(get(responseData, propertyName) as IDataObject);
			}
		}
		const limit = query.limit as number | undefined;
		if (limit && limit <= returnData.length) {
			return returnData;
		}
	} while (
		get(responseData, `${propertyName.split('.')[0]}.IsTruncated`) !== undefined &&
		get(responseData, `${propertyName.split('.')[0]}.IsTruncated`) !== 'false'
	);

	return returnData;
}

export function keysTPascalCase(object: IDataObject) {
	const data: IDataObject = {};
	for (const key of Object.keys(object)) {
		data[pascalCase(key)] = object[key];
	}
	return data;
}
