import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';


/**
 * Make an API request to ActiveCampaign
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @returns {Promise<any>}
 */
export async function layoutsApiRequest(this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions): Promise<any> { // tslint:disable-line:no-any
	const token = await getToken.call(this);
	const credentials = this.getCredentials('FileMaker');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const host = credentials.host as string;
	const db = credentials.db as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/layouts`;
	const options: OptionsWithUri = {
		headers: {
			'Authorization': `Bearer ${token}`,
		},
		method: 'GET',
		uri: url,
		json: true
	};

	try {
		const responseData = await this.helpers.request!(options);
		return responseData.response.layouts;

	} catch (error) {
		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

/**
 * Make an API request to ActiveCampaign
 *
 * @returns {Promise<any>}
 * @param layout
 */
export async function getFields(this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions): Promise<any> { // tslint:disable-line:no-any
	const token = await getToken.call(this);
	const credentials = this.getCredentials('FileMaker');
	const layout = this.getCurrentNodeParameter('layout') as string;

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const host = credentials.host as string;
	const db = credentials.db as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/layouts/${layout}`;
	const options: OptionsWithUri = {
		headers: {
			'Authorization': `Bearer ${token}`,
		},
		method: 'GET',
		uri: url,
		json: true
	};

	try {
		const responseData = await this.helpers.request!(options);
		return responseData.response.fieldMetaData;

	} catch (error) {
		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

export async function getToken(this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('FileMaker');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const host = credentials.host as string;
	const db = credentials.db as string;
	const login = credentials.login as string;
	const password = credentials.password as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/sessions`;

	let requestOptions: OptionsWithUri;
	// Reset all values
	requestOptions = {
		uri: url,
		headers: {},
		method: 'POST',
		json: true
		//rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
	};
	requestOptions.auth = {
		user: login as string,
		pass: password as string,
	};
	requestOptions.body = {
		"fmDataSource": [
			{
				"database": host,
				"username": login as string,
				"password": password as string
			}
		]
	};

	try {
		const response = await this.helpers.request!(requestOptions);

		if (typeof response === 'string') {
			throw new Error('Response body is not valid JSON. Change "Response Format" to "String"');
		}

		return response.response.token;
	} catch (error) {
		console.error(error);

		const errorMessage = error.response.body.messages[0].message + '(' + error.response.body.messages[0].message + ')';

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}

export async function logout(this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions, token: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('FileMaker');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const host = credentials.host as string;
	const db = credentials.db as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/sessions/${token}`;

	let requestOptions: OptionsWithUri;
	// Reset all values
	requestOptions = {
		uri: url,
		headers: {},
		method: 'DELETE',
		json: true
		//rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
	};

	try {
		const response = await this.helpers.request!(requestOptions);

		if (typeof response === 'string') {
			throw new Error('Response body is not valid JSON. Change "Response Format" to "String"');
		}

		return response;
	} catch (error) {
		console.error(error);

		const errorMessage = error.response.body.messages[0].message + '(' + error.response.body.messages[0].message + ')';

		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.response.body;
	}
}

