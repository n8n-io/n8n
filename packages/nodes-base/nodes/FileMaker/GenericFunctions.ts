import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {OptionsWithUri} from 'request';
import {Url} from "url";

interface ScriptsOptions {
	script?: any; //tslint:disable-line:no-any
	'script.param'?: any; //tslint:disable-line:no-any
	'script.prerequest'?: any; //tslint:disable-line:no-any
	'script.prerequest.param'?: any; //tslint:disable-line:no-any
	'script.presort'?: any; //tslint:disable-line:no-any
	'script.presort.param'?: any; //tslint:disable-line:no-any
}

/**
 * Make an API request to ActiveCampaign
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @returns {Promise<any>}
 */
export async function layoutsApiRequest(this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions): Promise<any> { // tslint:disable-line:no-any
	const token = await getToken.call(this);
	const credentials = this.getCredentials('fileMaker');

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
 */
export async function getFields(this: ILoadOptionsFunctions): Promise<any> { // tslint:disable-line:no-any
	const token = await getToken.call(this);
	const credentials = this.getCredentials('fileMaker');
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


/**
 * Make an API request to ActiveCampaign
 *
 * @returns {Promise<any>}
 */
export async function getPortals(this: ILoadOptionsFunctions): Promise<any> { // tslint:disable-line:no-any
	const token = await getToken.call(this);
	const credentials = this.getCredentials('fileMaker');
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
		return responseData.response.portalMetaData;

	} catch (error) {
		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

/**
 * Make an API request to ActiveCampaign
 *
 * @returns {Promise<any>}
 */
export async function getScripts(this: ILoadOptionsFunctions): Promise<any> { // tslint:disable-line:no-any
	const token = await getToken.call(this);
	const credentials = this.getCredentials('fileMaker');
	const layout = this.getCurrentNodeParameter('layout') as string;

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	const host = credentials.host as string;
	const db = credentials.db as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/scripts`;
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
		return responseData.response.scripts;

	} catch (error) {
		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

export async function getToken(this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('fileMaker');
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

		let errorMessage;
		if (error.response) {
			errorMessage = error.response.body.messages[0].message + '(' + error.response.body.messages[0].message + ')';
		} else {
			errorMessage = `${error.message} (${error.name})`;
		}
		if (errorMessage !== undefined) {
			throw errorMessage;
		}
		throw error.message;
	}
}

export async function logout(this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions, token: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('fileMaker');
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

export function parseSort(this: IExecuteFunctions): object | null {
	let sort;
	const setSort = this.getNodeParameter('setSort', 0, false);
	if (!setSort) {
		sort = null;
	} else {
		sort = [];
		const sortParametersUi = this.getNodeParameter('sortParametersUi', 0, {}) as IDataObject;
		if (sortParametersUi.rules !== undefined) {
			// @ts-ignore
			for (const parameterData of sortParametersUi!.rules as IDataObject[]) {
				// @ts-ignore
				sort.push({
					'fieldName': parameterData!.name as string,
					'sortOrder': parameterData!.value
				});
			}
		}
	}
	return sort;
}


export function parseScripts(this: IExecuteFunctions): object | null {
	const setScriptAfter = this.getNodeParameter('setScriptAfter', 0, false);
	const setScriptBefore = this.getNodeParameter('setScriptBefore', 0, false);
	const setScriptSort = this.getNodeParameter('setScriptSort', 0, false);

	if (!setScriptAfter && setScriptBefore && setScriptSort) {
		return {};
	} else {
		const scripts = {} as ScriptsOptions;
		if (setScriptAfter) {
			scripts.script = this.getNodeParameter('scriptAfter', 0);
			scripts!['script.param'] = this.getNodeParameter('scriptAfter', 0);
		}
		if (setScriptBefore) {
			scripts['script.prerequest'] = this.getNodeParameter('scriptBefore', 0);
			scripts['script.prerequest.param'] = this.getNodeParameter('scriptBeforeParam', 0);
		}
		if (setScriptSort) {
			scripts['script.presort'] = this.getNodeParameter('scriptSort', 0);
			scripts['script.presort.param'] = this.getNodeParameter('scriptSortParam', 0);
		}
		return scripts;
	}
}

export function parsePortals(this: IExecuteFunctions): object | null {
	let portals;
	const getPortals = this.getNodeParameter('getPortals', 0);
	if (!getPortals) {
		portals = [];
	} else {
		portals = this.getNodeParameter('portals', 0);
	}
	// @ts-ignore
	return portals;
}


export function parseQuery(this: IExecuteFunctions): object | null {
	let queries;
	const queriesParamUi = this.getNodeParameter('queries', 0, {}) as IDataObject;
	if (queriesParamUi.query !== undefined) {
		// @ts-ignore
		queries = [];
		for (const queryParam of queriesParamUi!.query as IDataObject[]) {
			const query = {
				'omit': queryParam.omit ? 'true' : 'false',
			};
			// @ts-ignore
			for (const field of queryParam!.fields!.field as IDataObject[]) {
				// @ts-ignore
				query[field.name] = field!.value;
			}
			queries.push(query);
		}
	} else {
		queries = null;
	}
	// @ts-ignore
	return queries;
}

export function parseFields(this: IExecuteFunctions): object | null {
	let fieldData;
	const fieldsParametersUi = this.getNodeParameter('fieldsParametersUi', 0, {}) as IDataObject;
	if (fieldsParametersUi.fields !== undefined) {
		// @ts-ignore
		fieldData = {};
		for (const field of fieldsParametersUi!.fields as IDataObject[]) {
			// @ts-ignore
			fieldData[field.name] = field!.value;
		}
	} else {
		fieldData = null;
	}
	// @ts-ignore
	return fieldData;
}
