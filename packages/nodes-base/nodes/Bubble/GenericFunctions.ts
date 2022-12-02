import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import { IDataObject, ILoadOptionsFunctions, NodeApiError } from 'n8n-workflow';

import { OptionsWithUri } from 'request';

/**
 * Make an authenticated API request to Bubble.
 */
export async function bubbleApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	qs: IDataObject,
) {
	const { apiToken, appName, domain, environment, hosting } = (await this.getCredentials(
		'bubbleApi',
	)) as {
		apiToken: string;
		appName: string;
		domain: string;
		environment: 'development' | 'live';
		hosting: 'bubbleHosted' | 'selfHosted';
	};

	const rootUrl = hosting === 'bubbleHosted' ? `https://${appName}.bubbleapps.io` : domain;
	const urlSegment = environment === 'development' ? '/version-test/api/1.1' : '/api/1.1';

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
			Authorization: `Bearer ${apiToken}`,
		},
		method,
		uri: `${rootUrl}${urlSegment}${endpoint}`,
		qs,
		body,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an authenticated API request to Bubble and return all results.
 */
export async function bubbleApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	qs: IDataObject,
) {
	const returnData: IDataObject[] = [];

	let responseData;
	qs.limit = 100;
	do {
		responseData = await bubbleApiRequest.call(this, method, endpoint, body, qs);
		qs.cursor = responseData.cursor;
		returnData.push.apply(returnData, responseData.response.results);
	} while (responseData.response.remaining !== 0);

	return returnData;
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
