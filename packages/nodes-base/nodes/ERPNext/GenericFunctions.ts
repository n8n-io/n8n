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
	IWebhookFunctions
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

	const credentials = this.getCredentials('erpNextApi');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
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
		uri: uri || `https://${credentials.subdomain}.erpnext.com${resource}`,
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
			throw new Error(
				`ERPNext error response [${error.statusCode}]: DocType unavailable.`,
			);
		}

		if (error.statusCode === 307) {
			throw new Error(
				`ERPNext error response [${error.statusCode}]: Please ensure the subdomain is correct.`,
			);
		}

		let errorMessages;
		if (error?.response?.body?._server_messages) {
			const errors = JSON.parse(error.response.body._server_messages);
			errorMessages = errors.map((e: string) => JSON.parse(e).message);
			throw new Error(
				`ARPNext error response [${error.statusCode}]: ${errorMessages.join('|')}`,
			);
		}

		throw error;
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
