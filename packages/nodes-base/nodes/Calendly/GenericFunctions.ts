import type { OptionsWithUri } from 'request';

import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import type {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

export function getAuthenticationType(data: string): 'accessToken' | 'apiKey' {
	// The access token is a JWT, so it will always include dots to separate
	// header, payoload and signature.
	return data.includes('.') ? 'accessToken' : 'apiKey';
}

export async function calendlyApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,

	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
): Promise<any> {
	const { apiKey } = (await this.getCredentials('calendlyApi')) as { apiKey: string };

	const authenticationType = getAuthenticationType(apiKey);

	const headers: IDataObject = {
		'Content-Type': 'application/json',
	};

	let endpoint = 'https://api.calendly.com';

	// remove once API key is deprecated
	if (authenticationType === 'apiKey') {
		endpoint = 'https://calendly.com/api/v1';
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
	return this.helpers.requestWithAuthentication.call(this, 'calendlyApi', options);
}

export async function validateCredentials(
	this: ICredentialTestFunctions,
	decryptedCredentials: ICredentialDataDecryptedObject,
): Promise<any> {
	const credentials = decryptedCredentials;

	const { apiKey } = credentials as {
		apiKey: string;
	};

	const authenticationType = getAuthenticationType(apiKey);

	const options: OptionsWithUri = {
		method: 'GET',
		uri: '',
		json: true,
	};

	if (authenticationType === 'accessToken') {
		Object.assign(options, {
			headers: { Authorization: `Bearer ${apiKey}` },
			uri: 'https://api.calendly.com/users/me',
		});
	} else {
		Object.assign(options, {
			headers: { 'X-TOKEN': apiKey },
			uri: 'https://calendly.com/api/v1/users/me',
		});
	}
	return this.helpers.request(options);
}
