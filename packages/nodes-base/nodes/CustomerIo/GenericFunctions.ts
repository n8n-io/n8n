import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	RequestPath,
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

	const options: WithRequestTarget<IHttpRequestOptions> = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		url:
			baseApi === 'tracking'
				? requestUrl`https://${isEu ? 'track-eu' : 'track'}.customer.io/api/v1${endpoint}`
				: requestUrl`https://${isEu ? 'api-eu' : 'api'}.customer.io/v1${endpoint}`,
		json: true,
	};

	return await this.helpers.requestWithAuthentication.call(this, 'customerIoApi', options);
}

export const toPathValue = (version: number, value: string) =>
	version < 1.1 ? decodePathValue(value) : value;

/** Convert dot-separated event names to underscore-separated API format */
export function toApiEventName(event: string): string {
	return event.replaceAll('.', '_');
}

/** Check if all current events exist in the webhook's event list */
export function eventExists(currentEvents: string[], webhookEvents: string[]) {
	const webhookEventSet = new Set(webhookEvents);
	return currentEvents.every((event) => webhookEventSet.has(toApiEventName(event)));
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
