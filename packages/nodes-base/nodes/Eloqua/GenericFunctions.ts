import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

export interface IProduct {
	fields: {
		item?: object[];
	};
}

async function getBaseUrl(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	authMethod: string,
	base64Creds?: string,
): Promise<string> {
	const options: OptionsWithUri = {
		headers: {},
		method: 'GET',
		uri: 'https://login.eloqua.com/id',
		json: true,
	};
	if (authMethod === 'httpBasicAuth') {
		options.headers!['Authorization'] = `Basic ${base64Creds}`;
		try {
			const responseData = await this.helpers.request!.call(this, options);
			return responseData.urls.base;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	} else {
		try {
			const responseData = await this.helpers.requestOAuth2!.call(this, 'eloquaOAuth2Api', options);
			return responseData.urls.base;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}
}

/**
 * Make an API request to Eloqua
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function eloquaApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject,
	staticData: IDataObject = {},
	query: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

	if (authenticationMethod === 'httpBasicAuth') {
		//tslint:disable-line:no-any
		const credentials = await this.getCredentials('eloquaApi');

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

		const base64Creds = Buffer.from(
			`${credentials.companyName}\\${credentials.userName}:${credentials.password}`,
		).toString('base64');

		if (!staticData.baseUrl) {
			staticData.baseUrl = await getBaseUrl.call(this, authenticationMethod, base64Creds);
		}

		const options: OptionsWithUri = {
			headers: { Authorization: `Basic ${base64Creds}` },
			method,
			qs: query,
			uri: `${staticData.baseUrl}${endpoint}`,
			json: true,
		};
		if (Object.keys(body).length !== 0) {
			options.body = body;
		}
		try {
			const responseData = await this.helpers.request!(options);
			if (responseData && responseData.success === false) {
				throw new NodeApiError(this.getNode(), responseData);
			}
			if (!responseData) {
				return { success: true };
			}
			return responseData;
		} catch (error) {
			const newBaseUrl = await getBaseUrl.call(this, authenticationMethod, base64Creds);
			if (newBaseUrl && newBaseUrl !== staticData.baseUrl) {
				staticData.baseUrl = newBaseUrl;
				return await eloquaApiRequest.call(this, method, endpoint, body, staticData, query);
			}
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	} else {
		if (!staticData.baseUrl) {
			staticData.baseUrl = await getBaseUrl.call(this, authenticationMethod);
		}

		const options: OptionsWithUri = {
			method,
			qs: query,
			uri: `${staticData.baseUrl}${endpoint}`,
			json: true,
		};
		if (Object.keys(body).length !== 0) {
			options.body = body;
		}
		try {
			const responseData = await this.helpers.requestOAuth2!.call(this, 'eloquaOAuth2Api', options);
			if (responseData && responseData.success === false) {
				throw new NodeApiError(this.getNode(), responseData);
			}
			if (!responseData) {
				return { success: true };
			}
			return responseData;
		} catch (error) {
			const newBaseUrl = await getBaseUrl.call(this, authenticationMethod);
			if (newBaseUrl && newBaseUrl !== staticData.baseUrl) {
				staticData.baseUrl = newBaseUrl;
				return await eloquaApiRequest.call(this, method, endpoint, body, staticData, query);
			}
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}
}
