import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import { IDataObject, ILoadOptionsFunctions, NodeApiError } from 'n8n-workflow';

import { OptionsWithUri } from 'request';

/**
 * Make an authenticated API request to Bubble.
 */
export async function dropcontactApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	qs: IDataObject,
) {
	const options: OptionsWithUri = {
		method,
		uri: `https://api.dropcontact.io${endpoint}`,
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

	return await this.helpers.requestWithAuthentication.call(this, 'dropcontactApi', options);
}
