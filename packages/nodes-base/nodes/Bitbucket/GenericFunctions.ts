import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	IHttpRequestOptions,
	RequestPath,
} from 'n8n-workflow';
import { NodeApiError, requestUrl } from 'n8n-workflow';

export async function bitbucketApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
): Promise<any> {
	try {
		const authentication = this.getNodeParameter('authentication', 0) as 'password' | 'accessToken';
		const url = requestUrl`https://api.bitbucket.org/2.0${resource}`;

		if (authentication === 'accessToken') {
			const httpRequestOptions: Omit<IHttpRequestOptions, 'url' | 'baseURL'> = {
				method,
				qs,
				body,
				json: true,
			};

			if (Object.keys(httpRequestOptions.body as IDataObject).length === 0) {
				delete httpRequestOptions.body;
			}

			return await this.helpers.httpRequestWithAuthentication.call(
				this,
				'bitbucketAccessTokenApi',
				uri ? { ...httpRequestOptions, url: uri } : { ...httpRequestOptions, url },
			);
		}

		const credentials = await this.getCredentials('bitbucketApi');
		const options: Omit<IRequestOptions, 'uri' | 'url' | 'baseURL'> = {
			method,
			auth: {
				user: credentials.username as string,
				password: credentials.appPassword as string,
			},
			qs,
			body,
			json: true,
		};

		if (Object.keys(options.body as IDataObject).length === 0) {
			delete options.body;
		}

		return await this.helpers.request(uri ? { ...options, uri } : { ...options, uri: url });
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
	resource: RequestPath,

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
