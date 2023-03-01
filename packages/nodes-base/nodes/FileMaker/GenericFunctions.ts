import type { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import type { IDataObject, INodePropertyOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';

interface ScriptsOptions {
	script?: any;
	'script.param'?: any;
	'script.prerequest'?: any;
	'script.prerequest.param'?: any;
	'script.presort'?: any;
	'script.presort.param'?: any;
}
interface LayoutObject {
	name: string;
	isFolder?: boolean;
	folderLayoutNames?: LayoutObject[];
}

interface ScriptObject {
	name: string;
	isFolder?: boolean;
	folderScriptNames?: LayoutObject[];
}

export async function getToken(
	this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions,
): Promise<any> {
	const credentials = await this.getCredentials('fileMaker');

	const host = credentials.host as string;
	const db = credentials.db as string;
	const login = credentials.login as string;
	const password = credentials.password as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/sessions`;

	// Reset all values
	const requestOptions: OptionsWithUri = {
		uri: url,
		headers: {},
		method: 'POST',
		json: true,
		//rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
	};
	requestOptions.auth = {
		user: login,
		pass: password,
	};
	requestOptions.body = {
		fmDataSource: [
			{
				database: host,
				username: login,
				password,
			},
		],
	};

	try {
		const response = await this.helpers.request(requestOptions);

		if (typeof response === 'string') {
			throw new NodeOperationError(
				this.getNode(),
				'Response body is not valid JSON. Change "Response Format" to "String"',
			);
		}

		return response.response.token;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

function parseLayouts(layouts: LayoutObject[]): INodePropertyOptions[] {
	const returnData: INodePropertyOptions[] = [];
	for (const layout of layouts) {
		if (layout.isFolder!) {
			returnData.push(...parseLayouts(layout.folderLayoutNames!));
		} else {
			returnData.push({
				name: layout.name,
				value: layout.name,
			});
		}
	}
	return returnData;
}

/**
 * Make an API request to ActiveCampaign
 *
 */
export async function layoutsApiRequest(
	this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions,
): Promise<INodePropertyOptions[]> {
	const token = await getToken.call(this);
	const credentials = await this.getCredentials('fileMaker');

	const host = credentials.host as string;
	const db = credentials.db as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/layouts`;
	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'GET',
		uri: url,
		json: true,
	};

	try {
		const responseData = await this.helpers.request(options);
		const items = parseLayouts(responseData.response.layouts as LayoutObject[]);
		items.sort((a, b) => (a.name > b.name ? 0 : 1));
		return items;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make an API request to ActiveCampaign
 *
 */
export async function getFields(this: ILoadOptionsFunctions): Promise<any> {
	const token = await getToken.call(this);
	const credentials = await this.getCredentials('fileMaker');
	const layout = this.getCurrentNodeParameter('layout') as string;

	const host = credentials.host as string;
	const db = credentials.db as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/layouts/${layout}`;
	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'GET',
		uri: url,
		json: true,
	};

	try {
		const responseData = await this.helpers.request(options);
		return responseData.response.fieldMetaData;
	} catch (error) {
		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

/**
 * Make an API request to ActiveCampaign
 *
 */
export async function getPortals(this: ILoadOptionsFunctions): Promise<any> {
	const token = await getToken.call(this);
	const credentials = await this.getCredentials('fileMaker');
	const layout = this.getCurrentNodeParameter('layout') as string;

	const host = credentials.host as string;
	const db = credentials.db as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/layouts/${layout}`;
	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'GET',
		uri: url,
		json: true,
	};

	try {
		const responseData = await this.helpers.request(options);
		return responseData.response.portalMetaData;
	} catch (error) {
		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

function parseScriptsList(scripts: ScriptObject[]): INodePropertyOptions[] {
	const returnData: INodePropertyOptions[] = [];
	for (const script of scripts) {
		if (script.isFolder!) {
			returnData.push(...parseScriptsList(script.folderScriptNames!));
		} else if (script.name !== '-') {
			returnData.push({
				name: script.name,
				value: script.name,
			});
		}
	}
	return returnData;
}

/**
 * Make an API request to ActiveCampaign
 *
 */
export async function getScripts(this: ILoadOptionsFunctions): Promise<any> {
	const token = await getToken.call(this);
	const credentials = await this.getCredentials('fileMaker');

	const host = credentials.host as string;
	const db = credentials.db as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/scripts`;
	const options: OptionsWithUri = {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'GET',
		uri: url,
		json: true,
	};

	try {
		const responseData = await this.helpers.request(options);
		const items = parseScriptsList(responseData.response.scripts as ScriptObject[]);
		items.sort((a, b) => (a.name > b.name ? 0 : 1));
		return items;
	} catch (error) {
		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

export async function logout(
	this: ILoadOptionsFunctions | IExecuteFunctions | IExecuteSingleFunctions,
	token: string,
): Promise<any> {
	const credentials = await this.getCredentials('fileMaker');

	const host = credentials.host as string;
	const db = credentials.db as string;

	const url = `https://${host}/fmi/data/v1/databases/${db}/sessions/${token}`;

	// Reset all values
	const requestOptions: OptionsWithUri = {
		uri: url,
		headers: {},
		method: 'DELETE',
		json: true,
		//rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
	};

	try {
		const response = await this.helpers.request(requestOptions);

		if (typeof response === 'string') {
			throw new NodeOperationError(
				this.getNode(),
				'Response body is not valid JSON. Change "Response Format" to "String"',
			);
		}

		return response;
	} catch (error) {
		const errorMessage = `${error.response.body.messages[0].message}'(' + ${error.response.body.messages[0].message}')'`;

		if (errorMessage !== undefined) {
			throw new Error(errorMessage);
		}
		throw error.response.body;
	}
}

export function parseSort(this: IExecuteFunctions, i: number): object | null {
	let sort;
	const setSort = this.getNodeParameter('setSort', i, false);
	if (!setSort) {
		sort = null;
	} else {
		sort = [];
		const sortParametersUi = this.getNodeParameter('sortParametersUi', i, {}) as IDataObject;
		if (sortParametersUi.rules !== undefined) {
			for (const parameterData of sortParametersUi.rules as IDataObject[]) {
				sort.push({
					fieldName: parameterData.name as string,
					sortOrder: parameterData.value,
				});
			}
		}
	}
	return sort;
}

export function parseScripts(this: IExecuteFunctions, i: number): object | null {
	const setScriptAfter = this.getNodeParameter('setScriptAfter', i, false);
	const setScriptBefore = this.getNodeParameter('setScriptBefore', i, false);
	const setScriptSort = this.getNodeParameter('setScriptSort', i, false);

	if (!setScriptAfter && setScriptBefore && setScriptSort) {
		return {};
	} else {
		const scripts = {} as ScriptsOptions;
		if (setScriptAfter) {
			scripts.script = this.getNodeParameter('scriptAfter', i);
			scripts['script.param'] = this.getNodeParameter('scriptAfter', i);
		}
		if (setScriptBefore) {
			scripts['script.prerequest'] = this.getNodeParameter('scriptBefore', i);
			scripts['script.prerequest.param'] = this.getNodeParameter('scriptBeforeParam', i);
		}
		if (setScriptSort) {
			scripts['script.presort'] = this.getNodeParameter('scriptSort', i);
			scripts['script.presort.param'] = this.getNodeParameter('scriptSortParam', i);
		}
		return scripts;
	}
}

export function parsePortals(this: IExecuteFunctions, i: number): object | null {
	let portals;
	const getPortalsData = this.getNodeParameter('getPortals', i);
	if (!getPortalsData) {
		portals = [];
	} else {
		portals = this.getNodeParameter('portals', i);
	}
	return portals as IDataObject;
}

export function parseQuery(this: IExecuteFunctions, i: number): object | null {
	let queries;
	const queriesParamUi = this.getNodeParameter('queries', i, {}) as IDataObject;
	if (queriesParamUi.query !== undefined) {
		queries = [];
		for (const queryParam of queriesParamUi.query as IDataObject[]) {
			const query: IDataObject = {
				omit: queryParam.omit ? 'true' : 'false',
			};
			for (const field of (queryParam.fields as IDataObject).field as IDataObject[]) {
				query[field.name as string] = field.value;
			}
			queries.push(query);
		}
	} else {
		queries = null;
	}
	return queries;
}

export function parseFields(this: IExecuteFunctions, i: number): object | null {
	let fieldData: IDataObject | null;
	const fieldsParametersUi = this.getNodeParameter('fieldsParametersUi', i, {}) as IDataObject;
	if (fieldsParametersUi.fields !== undefined) {
		fieldData = {};
		for (const field of fieldsParametersUi.fields as IDataObject[]) {
			fieldData[field.name as string] = field.value;
		}
	} else {
		fieldData = null;
	}

	return fieldData;
}
