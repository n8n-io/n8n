import { URL } from 'url';

import type { Request } from 'aws4';
import { sign } from 'aws4';

import type { OptionsWithUri } from 'request';

import { parseString } from 'xml2js';

import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'aws', requestOptions);
	} catch (error) {
		if (error?.response?.data || error?.response?.body) {
			const errorMessage = error?.response?.data || error?.response?.body;
			if (errorMessage.includes('AccessDeniedException')) {
				const user = JSON.parse(errorMessage as string).Message.split(' ')[1];
				throw new NodeApiError(this.getNode(), error as JsonObject, {
					message: 'Unauthorized — please check your AWS policy configuration',
					description: `Make sure an identity-based policy allows user ${user} to perform textract:AnalyzeExpense`,
				});
			}
		}

		throw new NodeApiError(this.getNode(), error as JsonObject); // no XML parsing needed
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
	body?: string,
	headers?: object,
): Promise<any> {
	const response = await awsApiRequest.call(this, service, method, path, body, headers);
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
		return response;
	}
}

export function simplify(data: IExpenseDocument) {
	const result: { [key: string]: string } = {};
	for (const document of data.ExpenseDocuments) {
		for (const field of document.SummaryFields) {
			result[field?.Type?.Text || field?.LabelDetection?.Text] = field.ValueDetection.Text;
		}
	}
	return result;
}

export interface IExpenseDocument {
	ExpenseDocuments: [
		{
			SummaryFields: [
				{
					LabelDetection: { Text: string };
					ValueDetection: { Text: string };
					Type: { Text: string };
				},
			];
		},
	];
}

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
	service: string,
): Promise<any> {
	const credentials = decryptedCredentials;

	// Concatenate path and instantiate URL object so it parses correctly query strings
	const endpoint = new URL(
		getEndpointForService(service, credentials) + '?Action=GetCallerIdentity&Version=2011-06-15',
	);

	// Sign AWS API request with the user credentials
	const signOpts = {
		host: endpoint.host,
		method: 'POST',
		path: '?Action=GetCallerIdentity&Version=2011-06-15',
	} as Request;
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
		method: 'POST',
		uri: endpoint.href,
		body: signOpts.body,
	};

	const response = await this.helpers.request(options);

	return new Promise((resolve, reject) => {
		parseString(response as string, { explicitArray: false }, (err, data) => {
			if (err) {
				return reject(err);
			}
			resolve(data);
		});
	});
}
