import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeProperties,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';
const fs = require('fs');

export interface IProduct {
	fields: {
		item?: object[];
	};
}

async function requestBaseUrlFromServer(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions
) {
	const credentials = await this.getCredentials('eloqua');

	if (credentials === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'No credentials got returned!'
		);
	}

	const base64Creds = Buffer.from(
		`${credentials.companyName}\\${credentials.userName}:${credentials.password}`
	).toString('base64');

	const options: OptionsWithUri = {
		headers: { Authorization: `Basic ${base64Creds}` },
		method: 'GET',
		uri: 'https://login.eloqua.com/id',
		json: true,
	};
	try {
		const responseData = await this.helpers.request!.call(this, options);
		const baseUrl = responseData.urls.base;
		fs.writeFileSync('./eloquaBaseUrl.txt', baseUrl);

		return baseUrl;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

async function getBaseUrl(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	skipCache: boolean = false
): Promise<string> {
	let baseUrl = '';
	if (!skipCache) {
		try {
			baseUrl = fs.readFileSync('./eloquaBaseUrl.txt').toString();
		} catch (err) {
			baseUrl = await requestBaseUrlFromServer.call(this);
		}
	} else {
		baseUrl = await requestBaseUrlFromServer.call(this);
	}
	return baseUrl;
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
	query?: IDataObject
): Promise<any> {
	const baseUrl = await getBaseUrl.call(this);
	//tslint:disable-line:no-any
	const credentials = await this.getCredentials('eloqua');

	if (credentials === undefined) {
		throw new NodeOperationError(
			this.getNode(),
			'No credentials got returned!'
		);
	}

	const base64Creds = Buffer.from(
		`${credentials.companyName}\\${credentials.userName}:${credentials.password}`
	).toString('base64');

	if (query === undefined) {
		query = {};
	}
	const options: OptionsWithUri = {
		headers: { Authorization: `Basic ${base64Creds}` },
		method,
		qs: query,
		uri: `${baseUrl}${endpoint}`,
		json: true,
	};
	if (Object.keys(body).length !== 0) {
		options.body = body;
	}
	try {
		const responseData = await this.helpers.request!(options);
		if (responseData.success === false) {
			throw new NodeApiError(this.getNode(), responseData);
		}
		return responseData;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
