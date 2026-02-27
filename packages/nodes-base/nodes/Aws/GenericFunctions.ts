import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	ISupplyDataFunctions,
	IHttpRequestOptions,
	JsonObject,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { parseString as parseXml } from 'xml2js';
import { Aws } from '../../credentials/Aws.credentials';
import { AwsAssumeRole } from '../../credentials/AwsAssumeRole.credentials';
import { AwsSystem } from '../../credentials/AwsSystem.credentials';
import type {
	AwsCredentials,
	AwsCredentialsType,
	AwsSecurityHeaders,
} from '../../credentials/common/aws/types';

const CredentialNameByAuthType = {
	'iam' : 'aws',
	'assumeRole' : 'awsAssumeRole',
	'system' : 'awsSystem',
}

const ClassByCredentialType = {
	'aws' : Aws,
	'awsAssumeRole' : AwsAssumeRole,
	'awsSystem' : AwsSystem,
}

export async function getAwsCredentialSecurityHeaders(credentials: AwsCredentials, credentialsType: AwsCredentialsType) : Promise<AwsSecurityHeaders> {
	return await ClassByCredentialType[credentialsType].getSecurityHeaders(credentials as any)
}
export function getAwsCredentialProvider(credentials: AwsCredentials, credentialsType: AwsCredentialsType) : () => Promise<AwsSecurityHeaders> {
	return ClassByCredentialType[credentialsType].getCredentialProvider(credentials as any)
}

export async function getAwsCredentials(
	context: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions | ISupplyDataFunctions,
) : Promise<{credentials: AwsCredentials, credentialsType: AwsCredentialsType}> {
	let credentialsType: string = 'aws';

	try {
		const authentication = context.getNodeParameter('authentication', 0) as 'iam' | 'assumeRole' | 'system';

		credentialsType = CredentialNameByAuthType[authentication];
	} catch (error) {
		context.logger.warn('Could not get authentication type');
	}

	const credentials: AwsCredentials = await context.getCredentials(credentialsType);

	return { credentials, credentialsType: credentialsType as AwsCredentialsType };
}

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
			parseXml(response as string, { explicitArray: false }, (err, data) => {
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
