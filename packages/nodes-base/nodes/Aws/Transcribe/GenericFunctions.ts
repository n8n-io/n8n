import type { Request } from 'aws4';
import { sign } from 'aws4';
import get from 'lodash/get';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { URL } from 'url';

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
): Promise<any> {
	const credentials = await this.getCredentials('aws');

	// Concatenate path and instantiate URL object so it parses correctly query strings
	const endpoint = new URL(getEndpointForService(service, credentials) + path);

	// Sign AWS API request with the user credentials
	const signOpts = { headers: headers || {}, host: endpoint.host, method, path, body } as Request;
	const securityHeaders = {
		accessKeyId: `${credentials.accessKeyId}`.trim(),
		secretAccessKey: `${credentials.secretAccessKey}`.trim(),
		sessionToken: credentials.temporaryCredentials
			? `${credentials.sessionToken}`.trim()
			: undefined,
	};

	sign(signOpts, securityHeaders);

	const options: IRequestOptions = {
		headers: signOpts.headers,
		method,
		uri: endpoint.href,
		body: signOpts.body,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject); // no XML parsing needed
	}
}

export async function awsApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string,
	headers?: object,
): Promise<any> {
	const response = await awsApiRequest.call(this, service, method, path, body, headers);
	try {
		return JSON.parse(response as string);
	} catch (error) {
		return response;
	}
}

export async function awsApiRequestRESTAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	service: string,
	method: IHttpRequestMethods,
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

		if (get(responseData, [propertyNameArray[0], propertyNameArray[1], 'NextToken'])) {
			query.NextToken = get(responseData, [
				propertyNameArray[0],
				propertyNameArray[1],
				'NextToken',
			]);
		}
		if (get(responseData, propertyName)) {
			if (Array.isArray(get(responseData, propertyName))) {
				returnData.push.apply(returnData, get(responseData, propertyName) as IDataObject[]);
			} else {
				returnData.push(get(responseData, propertyName) as IDataObject);
			}
		}
	} while (
		get(responseData, [propertyNameArray[0], propertyNameArray[1], 'NextToken']) !== undefined
	);

	return returnData;
}
