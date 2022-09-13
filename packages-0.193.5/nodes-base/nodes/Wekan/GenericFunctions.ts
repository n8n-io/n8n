import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { OptionsWithUri } from 'request';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function getAuthorization(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	credentials?: ICredentialDataDecryptedObject,
): Promise<IDataObject> {
	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const { password, username } = credentials;
	const options: OptionsWithUri = {
		method: 'POST',
		form: {
			username,
			password,
		},
		uri: `${credentials.url}/users/login`,
		json: true,
	};

	try {
		const response = await this.helpers.request!(options);

		return { token: response.token, userId: response.id };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: object,
	query?: IDataObject,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('wekanApi');

	query = query || {};

	const { token } = await getAuthorization.call(this, credentials);

	const options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
		method,
		body,
		qs: query,
		uri: `${credentials.url}/api/${endpoint}`,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.statusCode === 401) {
			throw new NodeOperationError(this.getNode(), 'The Wekan credentials are not valid!');
		}

		throw error;
	}
}
