import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	NodeApiError,
} from 'n8n-workflow';

export async function calendlyApiRequest(this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const apiVersion = this.getNodeParameter('apiVersion', 0) as string;
	let credentialType = '';

	const headers: IDataObject = {
		'Content-Type': 'application/json',
	};

	let endpoint = 'https://api.calendly.com';

	if (apiVersion === 'version1') {
		credentialType = 'calendlyApi';
		endpoint = 'https://calendly.com/api/v1';
	}

	if ( apiVersion === 'version2' ) {
		const authentication = this.getNodeParameter('authentication', 0, 'accessToken') as string;

		if (authentication === 'accessToken') {
			credentialType = 'calendlyAccessTokenApi';
		}
	}

	let options: OptionsWithUri = {
		headers,
		method,
		body,
		qs: query,
		uri: uri || `${endpoint}${resource}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.form;
	}
	if (!Object.keys(query).length) {
		delete options.qs;
	}
	options = Object.assign({}, options, option);

	try {
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
