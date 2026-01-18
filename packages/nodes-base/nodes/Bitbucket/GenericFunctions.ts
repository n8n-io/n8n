import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function bitbucketApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
): Promise<any> {
	try {
		const authentication = this.getNodeParameter('authentication', 0) as 'password' | 'accessToken';

		if (authentication === 'accessToken') {
			const httpRequestOptions: IHttpRequestOptions = {
				method,
				qs,
				body,
				url: uri || `https://api.bitbucket.org/2.0${resource}`,
				json: true,
			};

			if (Object.keys(httpRequestOptions.body as IDataObject).length === 0) {
				delete httpRequestOptions.body;
			}

			return await this.helpers.httpRequestWithAuthentication.call(
				this,
				'bitbucketAccessTokenApi',
				httpRequestOptions,
			);
		}

		const credentials = await this.getCredentials('bitbucketApi');
		const options: IRequestOptions = {
			method,
			auth: {
				user: credentials.username as string,
				password: credentials.appPassword as string,
			},
			qs,
			body,
			uri: uri || `https://api.bitbucket.org/2.0${resource}`,
			json: true,
		};

		if (Object.keys(options.body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function bitbucketApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	let uri: string | undefined;

	do {
		responseData = await bitbucketApiRequest.call(this, method, resource, body, query, uri);
		uri = responseData.next;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.next !== undefined);

	return returnData;
}
