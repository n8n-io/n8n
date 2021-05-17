import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	NodeApiError,
	NodeOperationError
} from 'n8n-workflow';

export async function erpNextApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('erpNextApi') as ERPNextApiCredentials;
	const baseUrl = getBaseUrl(credentials);

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	let options: OptionsWithUri = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			Authorization: `token ${credentials.apiKey}:${credentials.apiSecret}`,
		},
		method,
		body,
		qs: query,
		uri: uri || `${baseUrl}${resource}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	if (!Object.keys(options.body).length) {
		delete options.body;
	}

	if (!Object.keys(options.qs).length) {
		delete options.qs;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 403) {
			throw new NodeApiError(this.getNode(), { message: 'DocType unavailable.' });
		}

		if (error.statusCode === 307) {
			throw new NodeApiError(this.getNode(), { message: 'Please ensure the subdomain is correct.' });
		}

		throw new NodeApiError(this.getNode(), error);

	}
}

export async function erpNextApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	resource: string,
	body: IDataObject,
	query: IDataObject = {},
) {
	// tslint:disable-next-line: no-any
	const returnData: any[] = [];

	let responseData;
	query!.limit_start = 0;
	query!.limit_page_length = 1000;

	do {
		responseData = await erpNextApiRequest.call(this, method, resource, body, query);
		returnData.push.apply(returnData, responseData[propertyName]);
		query!.limit_start += query!.limit_page_length - 1;
	} while (
		responseData.data.length > 0
	);

	return returnData;
}

/**
 * Return the base API URL based on the user's environment.
 */
const getBaseUrl = ({ environment, domain, subdomain }: ERPNextApiCredentials) =>
	environment === 'cloudHosted'
		? `https://${subdomain}.erpnext.com`
		: domain;

type ERPNextApiCredentials = {
	apiKey: string;
	apiSecret: string;
	environment: 'cloudHosted' | 'selfHosted';
	subdomain?: string;
	domain?: string;
};
