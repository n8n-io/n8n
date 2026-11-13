import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	IHttpRequestOptions,
	JsonObject,
	IHttpRequestMethods,
	IDataObject,
	RequestPath,
} from 'n8n-workflow';
import { NodeApiError, sanitizeXmlName } from 'n8n-workflow';
import { parseString as parseXml } from 'xml2js';
import type {
	AwsAssumeRoleCredentialsType,
	AwsIamCredentialsType,
} from '../../credentials/common/aws/types';

export async function getAwsCredentials(
	context: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
) {
	let credentialsType: 'aws' | 'awsAssumeRole' = 'aws';

	try {
		const authentication = context.getNodeParameter('authentication', 0) as 'iam' | 'assumeRole';

		if (authentication === 'assumeRole') {
			credentialsType = 'awsAssumeRole';
		}
	} catch (error) {
		context.logger.warn('Could not get authentication type');
	}

	const credentials: AwsIamCredentialsType | AwsAssumeRoleCredentialsType =
		await context.getCredentials(credentialsType);

	return { credentials, credentialsType };
}

export function awsRequestPath(path: RequestPath, query: IDataObject = {}): string {
	const search = Object.entries(query)
		.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
		.join('&');
	return search ? `${path.value}?${search}` : path.value;
}

export async function awsApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: RequestPath,
	body?: string,
	headers?: object,
	query?: IDataObject,
): Promise<any> {
	const { credentials, credentialsType } = await getAwsCredentials(this);
	const requestOptions = {
		qs: {
			service,
			path: awsRequestPath(path, query),
		},
		method,
		body: service === 'lambda' ? body : JSON.stringify(body),
		url: '',
		headers,
		region: credentials?.region as string,
	} as IHttpRequestOptions;

	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialsType, requestOptions);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, { parseXml: true });
	}
}

export async function awsApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	service: string,
	method: IHttpRequestMethods,
	path: RequestPath,
	body?: string,
	headers?: object,
	query?: IDataObject,
): Promise<any> {
	const response = await awsApiRequest.call(this, service, method, path, body, headers, query);
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
	path: RequestPath,
	body?: string,
	headers?: object,
	query?: IDataObject,
): Promise<any> {
	const response = await awsApiRequest.call(this, service, method, path, body, headers, query);
	try {
		return await new Promise((resolve, reject) => {
			parseXml(
				response as string,
				{
					explicitArray: false,
					tagNameProcessors: [sanitizeXmlName],
					attrNameProcessors: [sanitizeXmlName],
				},
				(err, data) => {
					if (err) {
						return reject(err);
					}
					resolve(data);
				},
			);
		});
	} catch (error) {
		return response;
	}
}
