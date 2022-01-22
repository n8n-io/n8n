import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUrl,
} from 'request';

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
	const credentials = await this.getCredentials('bambooHrApi');

	if (!credentials) {
		throw new NodeOperationError(this.getNode(), 'No credentials returned!');
	}

	//set-up credentials
	const apiKey = credentials.apiKey;
	const subdomain = credentials.subdomain;

	//set-up uri
	const uri = `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1/${endpoint}`;

	const options: OptionsWithUrl = {
		method,
		body,
		qs: query,
		url: uri,
		auth: {
			username: apiKey as string,
			password: 'x',
		},
		json: true,
	};

	if (Object.keys(option).length) {
		Object.assign(options, option);
	}

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(query).length) {
		delete options.qs;
	}

	try {
		//@ts-ignore
		return await this.helpers.request(options);
	} catch (error) {
		const description = error?.response?.headers['x-bamboohr-error-messsage'] || '';
		const message = error?.message || '';
		throw new NodeApiError(this.getNode(), error, { message, description });
	}
}
