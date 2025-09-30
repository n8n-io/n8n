import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { ApplicationError, deepCopy } from 'n8n-workflow';

import type { IRequestBody } from './types';

export async function awsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: object | IRequestBody,
	headers?: object,
): Promise<any> {
	const credentials = await this.getCredentials('aws');
	const requestOptions = {
		qs: {
			service,
			path,
		},
		method,
		body: JSON.stringify(body),
		url: '',
		headers,
		region: credentials?.region as string,
	} as IHttpRequestOptions;

	try {
		return JSON.parse(
			(await this.helpers.requestWithAuthentication.call(this, 'aws', requestOptions)) as string,
		);
	} catch (error) {
		const statusCode = (error.statusCode || error.cause?.statusCode) as number;
		let errorMessage =
			error.response?.body?.message || error.response?.body?.Message || error.message;

		if (statusCode === 403) {
			if (errorMessage === 'The security token included in the request is invalid.') {
				throw new ApplicationError('The AWS credentials are not valid!', { level: 'warning' });
			} else if (
				errorMessage.startsWith(
					'The request signature we calculated does not match the signature you provided',
				)
			) {
				throw new ApplicationError('The AWS credentials are not valid!', { level: 'warning' });
			}
		}

		if (error.cause?.error) {
			try {
				errorMessage = JSON.parse(error.cause?.error).message;
			} catch (ex) {}
		}

		throw new ApplicationError(`AWS error response [${statusCode}]: ${errorMessage}`, {
			level: 'warning',
		});
	}
}

export async function awsApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: IRequestBody,
	headers?: object,
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		const originalHeaders = Object.assign({}, headers); //The awsapirequest function adds the hmac signature to the headers, if we pass the modified headers back in on the next call it will fail with invalid signature
		responseData = await awsApiRequest.call(this, service, method, path, body, originalHeaders);
		if (responseData.LastEvaluatedKey) {
			body!.ExclusiveStartKey = responseData.LastEvaluatedKey;
		}
		returnData.push(...(responseData.Items as IDataObject[]));
	} while (responseData.LastEvaluatedKey !== undefined);

	return returnData;
}

export function copyInputItem(item: INodeExecutionData, properties: string[]): IDataObject {
	// Prepare the data to insert and copy it to be returned
	const newItem: IDataObject = {};
	for (const property of properties) {
		if (item.json[property] === undefined) {
			newItem[property] = null;
		} else {
			newItem[property] = deepCopy(item.json[property]);
		}
	}
	return newItem;
}
