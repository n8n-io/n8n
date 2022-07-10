import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	JsonObject,
	NodeApiError,
} from 'n8n-workflow';

import {
	ElasticsearchApiCredentials,
} from './types';

export async function elasticsearchApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'PUT' | 'POST' | 'DELETE',
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const {
		baseUrl,
		ignoreSSLIssues,
	} = await this.getCredentials('elasticsearchApi') as ElasticsearchApiCredentials;

	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: `${baseUrl}${endpoint}`,
		json: true,
		rejectUnauthorized: !ignoreSSLIssues,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'elasticsearchApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
