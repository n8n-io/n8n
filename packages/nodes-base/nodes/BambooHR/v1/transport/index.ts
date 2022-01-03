import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

/**
 * Make an API request to Mattermost
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE',
	endpoint: string,
	body: string[] | IDataObject = {},
	query: IDataObject = {},
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('bambooHRApi');

	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'No credentials returned!');
	}

	//set-up credentials
	const apiKey = credentials.apiKey;
	const subdomain = credentials.subdomain;

	//set-up uri
	const uri = `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/${endpoint}`;

	const options: IHttpRequestOptions = {
		method,
		body,
		headers: {
			'content-type': 'application/json',
		},
		qs: query,
		url: uri,
		auth: {
			username: apiKey as string,
			password: 'x',
		},
		returnFullResponse: true,
		json: true,
	};

	if (Object.keys(option).length) {
		Object.assign(options, option);
	}

	if (!Object.keys(body).length) {
		delete options.body;
	}

	//console.log(options);


	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
