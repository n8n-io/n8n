import {
	URL,
} from 'url';

import {
	Request,
	sign,
} from 'aws4';

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
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

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

export async function awsApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('aws');
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	// Concatenate path and instantiate URL object so it parses correctly query strings
	const endpoint = new URL(getEndpointForService(service, credentials) + path);

	// Sign AWS API request with the user credentials
	const signOpts = { headers: headers || {}, host: endpoint.host, method, path, body } as Request;
	sign(signOpts, { accessKeyId: `${credentials.accessKeyId}`.trim(), secretAccessKey: `${credentials.secretAccessKey}`.trim() });


	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method,
		uri: endpoint.href,
		body: signOpts.body,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error?.response?.data || error?.response?.body) {
			const errorMessage = error?.response?.data || error?.response?.body;
			if (errorMessage.includes('AccessDeniedException')) {
				const user = JSON.parse(errorMessage).Message.split(' ')[1];
				throw new NodeApiError(this.getNode(), error, { 
					message: 'Unauthorized — please check your AWS policy configuration',
					description: `Make sure an identity-based policy allows user ${user} to perform textract:AnalyzeExpense` });
			}
		}

		throw new NodeApiError(this.getNode(), error); // no XML parsing needed
	}
}

export async function awsApiRequestREST(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, service: string, method: string, path: string, body?: string, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const response = await awsApiRequest.call(this, service, method, path, body, headers);
	try {
		return JSON.parse(response);
	} catch (error) {
		return response;
	}
}

export async function awsApiRequestSOAP(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, service: string, method: string, path: string, body?: string, headers?: object): Promise<any> { // tslint:disable-line:no-any
	const response = await awsApiRequest.call(this, service, method, path, body, headers);
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
					LabelDetection: { Text: string },
					ValueDetection: { Text: string },
					Type: { Text: string }
				}]
		}];
}

export async function validateCrendetials(this: ICredentialTestFunctions, decryptedCredentials: ICredentialDataDecryptedObject, service: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = decryptedCredentials;

	// Concatenate path and instantiate URL object so it parses correctly query strings
	const endpoint = new URL(getEndpointForService(service, credentials) + `?Action=GetCallerIdentity&Version=2011-06-15`);

	// Sign AWS API request with the user credentials
	const signOpts = { host: endpoint.host, method: 'POST', path: '?Action=GetCallerIdentity&Version=2011-06-15' } as Request;
	sign(signOpts, { accessKeyId: `${credentials.accessKeyId}`.trim(), secretAccessKey: `${credentials.secretAccessKey}`.trim() });

	const options: OptionsWithUri = {
		headers: signOpts.headers,
		method: 'POST',
		uri: endpoint.href,
		body: signOpts.body,
	};

	const response = await this.helpers.request!(options);

	return await new Promise((resolve, reject) => {
		parseString(response, { explicitArray: false }, (err, data) => {
			if (err) {
				return reject(err);
			}
			resolve(data);
		});
	});
}
