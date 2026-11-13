import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IHttpRequestMethods,
	LegacyRequestOptions,
	RequestPath,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, requestPath, requestUrl } from 'n8n-workflow';

export async function bitlyApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	const options: LegacyRequestOptions = {
		headers: {},
		method,
		qs,
		body,
		...(uri ? { uri } : { uri: requestUrl`https://api-ssl.bitly.com/v4${resource}` }),
		json: true,
	};
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}

	try {
		if (authenticationMethod === 'accessToken') {
			const credentials = await this.getCredentials('bitlyApi');
			options.headers = { Authorization: `Bearer ${credentials.accessToken}` };

			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'bitlyOAuth2Api', options, {
				tokenType: 'Bearer',
			});
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function bitlyApiRequestAllItems(
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
	query.size = 50;

	do {
		responseData = await bitlyApiRequest.call(this, method, resource, body, query, uri);
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
		if (responseData.pagination?.next) {
			uri = responseData.pagination.next;
		}
	} while (responseData.pagination?.next !== undefined);
	return returnData;
}

export function bitlinkPath(
	this: IExecuteFunctions,
	bitlink: string,
	itemIndex: number,
): RequestPath {
	const [domain, hash, ...rest] = bitlink
		.replace(/^https?:\/\//i, '')
		.split(/[?#]/, 1)[0]
		.split('/');
	if (!domain || !hash || rest.length || [domain, hash].some((part) => /^\.{1,2}$/.test(part))) {
		throw new NodeOperationError(this.getNode(), `The Bitlink "${bitlink}" is not valid`, {
			itemIndex,
			description: 'Use the format domain/hash, for example bit.ly/22u3ypK',
		});
	}
	return requestPath`/bitlinks/${domain}/${hash}`;
}
