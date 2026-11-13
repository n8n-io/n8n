import get from 'lodash/get';
import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	RequestPath,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import { decodePathValue, requestUrl } from 'n8n-workflow';

export async function customerIoApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: RequestPath,
	body: object,
	baseApi?: string,
	_query?: IDataObject,
) {
	const credentials = await this.getCredentials('customerIoApi');
	const isEu = credentials.region === 'track-eu.customer.io';

	let url: RequestUrl;
	if (baseApi === 'tracking') {
		url = requestUrl`https://${isEu ? 'track-eu' : 'track'}.customer.io/api/v1${endpoint}`;
	} else if (baseApi === 'api') {
		// Special handling for EU region
		url = requestUrl`https://${isEu ? 'api-eu' : 'api'}.customer.io/v1/api${endpoint}`;
	} else {
		url = requestUrl`https://beta-api.customer.io/v1/api${endpoint}`;
	}

	const options: WithRequestTarget<IHttpRequestOptions> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		url,
		json: true,
	};

	return await this.helpers.requestWithAuthentication.call(this, 'customerIoApi', options);
}

export const toPathValue = (version: number, value: string) =>
	version < 1.1 ? decodePathValue(value) : value;

export function eventExists(currentEvents: string[], webhookEvents: IDataObject) {
	for (const currentEvent of currentEvents) {
		if (get(webhookEvents, [currentEvent.split('.')[0], currentEvent.split('.')[1]]) !== true) {
			return false;
		}
	}
	return true;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
