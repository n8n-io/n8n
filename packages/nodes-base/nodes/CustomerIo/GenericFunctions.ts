import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject, NodeApiError, NodeOperationError,
} from 'n8n-workflow';

import {
	get,
} from 'lodash';

export async function customerIoApiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: object, baseApi?: string, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('customerIoApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	query = query || {};

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		uri: '',
		json: true,
	};

	if (baseApi === 'tracking') {
		options.uri = `https://track.customer.io/api/v1${endpoint}`;
		const basicAuthKey = Buffer.from(`${credentials.trackingSiteId}:${credentials.trackingApiKey}`).toString('base64');
		Object.assign(options.headers, { 'Authorization': `Basic ${basicAuthKey}` });
	} else if (baseApi === 'api') {
		options.uri = `https://api.customer.io/v1/api${endpoint}`;
		const basicAuthKey = Buffer.from(`${credentials.trackingSiteId}:${credentials.trackingApiKey}`).toString('base64');
		Object.assign(options.headers, { 'Authorization': `Basic ${basicAuthKey}` });
	} else if (baseApi === 'beta') {
		options.uri = `https://beta-api.customer.io/v1/api${endpoint}`;
		Object.assign(options.headers, { 'Authorization': `Bearer ${credentials.appApiKey as string}` });
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function eventExists(currentEvents: string[], webhookEvents: IDataObject) {
	for (const currentEvent of currentEvents) {
		if (get(webhookEvents, `${currentEvent.split('.')[0]}.${currentEvent.split('.')[1]}`) !== true) {
			return false;
		}
	}
	return true;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
