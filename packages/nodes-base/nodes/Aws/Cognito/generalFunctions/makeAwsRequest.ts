import type {
	ILoadOptionsFunctions,
	IPollFunctions,
	IHttpRequestOptions,
	IDataObject,
	IExecuteSingleFunctions,
} from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

export async function makeAwsRequest(
	this: ILoadOptionsFunctions | IPollFunctions | IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IDataObject> {
	const region = (await this.getCredentials('aws')).region as string;

	const requestOptions: IHttpRequestOptions = {
		...opts,
		baseURL: `https://cognito-idp.${region}.amazonaws.com`,
		json: true,
		headers: {
			'Content-Type': 'application/x-amz-json-1.1',
			...opts.headers,
		},
	};

	try {
		return (await this.helpers.requestWithAuthentication.call(
			this,
			'aws',
			requestOptions,
		)) as IDataObject;
	} catch (error) {
		const statusCode = error.statusCode || error.cause?.statusCode;
		const errorMessage =
			error.response?.body?.message || error.response?.body?.Message || error.message;

		if (statusCode === 403 && errorMessage.includes('security token')) {
			throw new ApplicationError('The AWS credentials are not valid!', { level: 'error' });
		}

		throw new ApplicationError(`AWS error response [${statusCode}]: ${errorMessage}`, {
			level: 'error',
		});
	}
}
