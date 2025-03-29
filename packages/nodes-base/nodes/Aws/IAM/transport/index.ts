import {
	ApplicationError,
	type IExecuteSingleFunctions,
	type IDataObject,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type IPollFunctions,
} from 'n8n-workflow';

export async function makeAwsRequest(
	this: ILoadOptionsFunctions | IPollFunctions | IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IDataObject> {
	const requestOptions: IHttpRequestOptions = {
		...opts,
		baseURL: 'https://iam.amazonaws.com',
		json: true,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	};

	const errorMapping: IDataObject = {
		403: 'The AWS credentials are not valid!',
	};

	try {
		return (await this.helpers.requestWithAuthentication.call(
			this,
			'aws',
			requestOptions,
		)) as IDataObject;
	} catch (error) {
		const statusCode = error.statusCode || error.cause?.statusCode;
		let errorMessage =
			error.response?.body?.message || error.response?.body?.Message || error.message;

		if (statusCode && errorMapping[statusCode]) {
			throw new ApplicationError(errorMapping[statusCode] as string, { level: 'error' });
		}

		if (error.cause?.error) {
			try {
				errorMessage = error.cause.error.message || errorMessage;
			} catch (ex) {
				throw new ApplicationError(
					`Failed to extract error details: ${ex instanceof Error ? ex.message : 'Unknown error'}`,
					{
						level: 'error',
					},
				);
			}
		}

		throw new ApplicationError(`AWS error response [${statusCode}]: ${errorMessage}`, {
			level: 'error',
		});
	}
}
