import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

export async function customerIoApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	baseApi?: string,
	_query?: IDataObject,
) {
	const credentials = await this.getCredentials('customerIoApi');
	const region = credentials.region as string;
	const isEu = region === 'track-eu.customer.io';

	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		url: '',
		json: true,
	};

	if (baseApi === 'tracking') {
		options.url = `https://${region}/api/v1${endpoint}`;
	} else if (baseApi === 'app') {
		const appHost = isEu ? 'api-eu.customer.io' : 'api.customer.io';
		options.url = `https://${appHost}/v1${endpoint}`;
	}

	return await this.helpers.requestWithAuthentication.call(this, 'customerIoApi', options);
}

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
