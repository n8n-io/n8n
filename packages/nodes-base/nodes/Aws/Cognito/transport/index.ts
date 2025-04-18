import type {
	ILoadOptionsFunctions,
	IPollFunctions,
	IHttpRequestOptions,
	IExecuteSingleFunctions,
} from 'n8n-workflow';

import type { AwsCredentialsType } from '../../../../credentials/Aws.credentials';

export async function awsApiRequest(
	this: ILoadOptionsFunctions | IPollFunctions | IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<any> {
	const credentialsType = 'aws';
	const credentials = await this.getCredentials<AwsCredentialsType>(credentialsType);

	const requestOptions: IHttpRequestOptions = {
		...opts,
		baseURL: `https://cognito-idp.${credentials.region}.amazonaws.com`,
		json: true,
		headers: {
			'Content-Type': 'application/x-amz-json-1.1',
			...opts.headers,
		},
	};

	return await this.helpers.httpRequestWithAuthentication.call(
		this,
		credentialsType,
		requestOptions,
	);
}
