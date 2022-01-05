import {
	IExecuteFunctions,
	IHookFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	NodeApiError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

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

	const { apiKey } = await this.getCredentials('dropcontactApi') as {
		apiKey: string,
	};

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
			'X-Access-Token': apiKey,
		},
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

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function validateCrendetials(this: ICredentialTestFunctions, decryptedCredentials: ICredentialDataDecryptedObject): Promise<any> { // tslint:disable-line:no-any
	const credentials = decryptedCredentials;

	const { apiKey } = credentials as {
		apiKey: string,
	};

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
			'X-Access-Token': apiKey,
		},
		method: 'POST',
		body: {
			data: [{ email: '' }],
		},
		uri: `https://api.dropcontact.io/batch`,
		json: true,
	};

	return this.helpers.request!(options);
}

