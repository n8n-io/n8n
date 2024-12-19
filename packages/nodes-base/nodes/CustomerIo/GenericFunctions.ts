import get from 'lodash/get';
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
		const region = credentials.region;
		options.url = `https://${region}/api/v1${endpoint}`;
	} else if (baseApi === 'api') {
		const region = credentials.region;
		// Special handling for EU region
		if (region === 'track-eu.customer.io') {
			options.url = `https://api-eu.customer.io/v1/api${endpoint}`;
		} else {
			options.url = `https://api.customer.io/v1/api${endpoint}`;
		}
	} else if (baseApi === 'beta') {
		options.url = `https://beta-api.customer.io/v1/api${endpoint}`;
	}

	return await this.helpers.requestWithAuthentication.call(this, 'customerIoApi', options);
}

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
