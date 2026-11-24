import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IRequestOptions,
	IWebhookFunctions,
	JsonObject,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, requestPath, requestUrl } from 'n8n-workflow';

const baseUrl = 'https://www.eventbriteapi.com/';
const OBJECT_URL =
	/^https:\/\/www\.eventbriteapi\.com\/v3\/(events|orders|organizers|venues)\/(\d+)(?:\/(attendees|ticket_classes)\/(\d+))?\/?$/;

export function isValidEventbriteUrl(url: unknown): boolean {
	return typeof url === 'string' && url.startsWith(baseUrl);
}

export function eventbriteObjectPath(apiUrl: unknown): RequestPath | undefined {
	const match = typeof apiUrl === 'string' ? OBJECT_URL.exec(apiUrl) : null;
	if (!match) return undefined;
	const [, type, id, subType, subId] = match;
	if (subType && type !== 'events') return undefined;
	return subType ? requestPath`/${type}/${id}/${subType}/${subId}/` : requestPath`/${type}/${id}/`;
}

export async function eventbriteApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	qs: IDataObject = {},
): Promise<any> {
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {},
		method,
		qs,
		body,
		uri: requestUrl`https://www.eventbriteapi.com/v3${resource}`,
		json: true,
	};
	if (Object.keys(options.body as IDataObject).length === 0) {
		delete options.body;
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0);

	try {
		if (authenticationMethod === 'privateKey') {
			const credentials = await this.getCredentials('eventbriteApi');

			options.headers!.Authorization = `Bearer ${credentials.apiKey}`;
			return await this.helpers.request(options);
		} else {
			return await this.helpers.requestOAuth2.call(this, 'eventbriteOAuth2Api', options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to paginated flow endpoint
 * and return all results
 */
export async function eventbriteApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	resource: RequestPath,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await eventbriteApiRequest.call(this, method, resource, body, query);
		query.continuation = responseData.pagination.continuation;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (
		responseData.pagination?.has_more_items !== undefined &&
		responseData.pagination.has_more_items !== false
	);

	return returnData;
}
