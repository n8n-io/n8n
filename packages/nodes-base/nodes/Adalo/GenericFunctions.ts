import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
	ILoadOptionsFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	AdaloCredentials,
} from './types';

/**
 * Make a request to Adalo API.
 */
export async function adaloApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('adaloApi') as AdaloCredentials;

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const uri = `https://api.adalo.com/v0/apps/${credentials.appId}${endpoint}`;
	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/json',
		},
		method,
		uri,
		json: true,
	};

	if (Object.keys(qs).length !== 0) {
		options.qs = qs;
	}

	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
