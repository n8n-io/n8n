import type {
	ILoadOptionsFunctions,
	IPollFunctions,
	IHttpRequestOptions,
	IExecuteSingleFunctions,
	IDataObject,
	IHttpRequestMethods,
} from 'n8n-workflow';

import type { AwsCredentialsType } from '../../../../credentials/Aws.credentials';

export async function awsApiRequest(
	this: ILoadOptionsFunctions | IPollFunctions | IExecuteSingleFunctions,
	method: IHttpRequestMethods,
	action: string,
	body: string,
): Promise<any> {
	const credentialsType = 'aws';
	const credentials = await this.getCredentials<AwsCredentialsType>(credentialsType);

	const requestOptions: IHttpRequestOptions = {
		url: '',
		method,
		body,
		headers: {
			'Content-Type': 'application/x-amz-json-1.1',
			'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
		},
		qs: {
			service: 'cognito-idp',
			_region: credentials.region,
		},
	};

	return await this.helpers.httpRequestWithAuthentication.call(
		this,
		credentialsType,
		requestOptions,
	);
}

export async function awsApiRequestAllItems(
	this: ILoadOptionsFunctions | IPollFunctions | IExecuteSingleFunctions,
	method: IHttpRequestMethods,
	action: string,
	body: IDataObject,
	propertyName: string,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let nextToken: string | undefined;

	do {
		const requestBody: IDataObject = {
			...body,
			...(nextToken ? { NextToken: nextToken } : {}),
		};

		const response = (await awsApiRequest.call(
			this,
			method,
			action,
			JSON.stringify(requestBody),
		)) as IDataObject;

		const items = (response[propertyName] ?? []) as IDataObject[];
		returnData.push(...items);

		nextToken = response.NextToken as string | undefined;
	} while (nextToken);

	return returnData;
}
