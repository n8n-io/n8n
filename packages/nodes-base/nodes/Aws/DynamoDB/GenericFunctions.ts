import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import { OperationalError, UserError } from 'n8n-workflow';

import { getAwsCredentials } from '../GenericFunctions';
import type { IRequestBody } from './types';

export async function awsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: object | IRequestBody,
	headers?: object,
): Promise<any> {
	const { credentials, credentialsType } = await getAwsCredentials(this);
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
			(await this.helpers.requestWithAuthentication.call(
				this,
				credentialsType,
				requestOptions,
			)) as string,
		);
	} catch (error) {
		const statusCode = (error.statusCode || error.cause?.statusCode) as number;
		let errorMessage =
			error.response?.body?.message || error.response?.body?.Message || error.message;

		if (statusCode === 403) {
			if (errorMessage === 'The security token included in the request is invalid.') {
				throw new UserError('The AWS credentials are not valid!', { level: 'warning' });
			} else if (
				errorMessage.startsWith(
					'The request signature we calculated does not match the signature you provided',
				)
			) {
				throw new UserError('The AWS credentials are not valid!', { level: 'warning' });
			}
		}

		if (error.cause?.error) {
			try {
				errorMessage = JSON.parse(error.cause?.error).message;
			} catch (ex) {}
		}

		throw new OperationalError(`AWS error response [${statusCode}]: ${errorMessage}`, {
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
