import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IHttpRequestOptions,
	JsonObject,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { parseString } from 'xml2js';
import { getAwsCredentials } from '../GenericFunctions';

export async function awsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: string,
	body?: string,
	headers?: object,
): Promise<any> {
	const { credentials, credentialsType } = await getAwsCredentials(this);

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
		return await this.helpers.requestWithAuthentication.call(this, credentialsType, requestOptions);
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

export async function awsApiRequestSOAP(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
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
