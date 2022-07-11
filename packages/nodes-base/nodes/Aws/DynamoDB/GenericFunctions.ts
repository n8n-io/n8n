import {
	URL,
} from 'url';

import {
	sign,
} from 'aws4';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';

import {
	IRequestBody,
} from './types';

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
	const credentials = await this.getCredentials('aws');

	// Concatenate path and instantiate URL object so it parses correctly query strings
	const endpoint = new URL(getEndpointForService(service, credentials) + path);
	const securityHeaders = {
		accessKeyId: `${credentials.accessKeyId}`.trim(),
		secretAccessKey: `${credentials.secretAccessKey}`.trim(),
		sessionToken: credentials.temporaryCredentials ? `${credentials.sessionToken}`.trim() : undefined,
	};
	const options = sign({
		// @ts-ignore
		uri: endpoint,
		service,
		region: credentials.region as string,
		method,
		path: '/',
		headers: { ...headers },
		body: JSON.stringify(body),
	}, securityHeaders);

	try {
		return JSON.parse(await this.helpers.request!(options));
	} catch (error) {
		const errorMessage =
		 	(error.response && error.response.body && error.response.body.message) ||
		  (error.response && error.response.body && error.response.body.Message) ||
			error.message;
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


export async function awsApiRequestAllItems(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: IRequestBody, headers?: object): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await awsApiRequest.call(this, service, method, path, body, headers);
		if (responseData.LastEvaluatedKey) {
			body!.ExclusiveStartKey = responseData.LastEvaluatedKey;
		}
		returnData.push(...responseData.Items);
	} while (
		responseData.LastEvaluatedKey !== undefined
	);

	return returnData;
}

export function copyInputItem(item: INodeExecutionData, properties: string[]): IDataObject {
	// Prepare the data to insert and copy it to be returned
	let newItem: IDataObject;
	newItem = {};
	for (const property of properties) {
		if (item.json[property] === undefined) {
			newItem[property] = null;
		} else {
			newItem[property] = JSON.parse(JSON.stringify(item.json[property]));
		}
	}
	return newItem;
}
