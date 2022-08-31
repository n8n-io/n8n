import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { OptionsWithUri } from 'request';

import {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { get } from 'lodash';

export async function customerIoApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	baseApi?: string,
	query?: IDataObject,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('customerIoApi');
	query = query || {};
	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method: method as IHttpRequestMethods,
		body,
		url: '',
		json: true,
	};

	if (baseApi === 'tracking') {
		const region = credentials.region;
		options.url = `https://${region}/api/v1${endpoint}`;
	} else if (baseApi === 'api') {
		options.url = `https://api.customer.io/v1/api${endpoint}`;
	} else if (baseApi === 'beta') {
		options.url = `https://beta-api.customer.io/v1/api${endpoint}`;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'customerIoApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export function eventExists(currentEvents: string[], webhookEvents: IDataObject) {
	for (const currentEvent of currentEvents) {
		if (
			get(webhookEvents, `${currentEvent.split('.')[0]}.${currentEvent.split('.')[1]}`) !== true
		) {
			return false;
		}
	}
	return true;
}

// tslint:disable-next-line:no-any
export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
