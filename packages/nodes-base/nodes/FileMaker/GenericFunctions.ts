import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	INodePropertyOptions,
	JsonObject,
	IRequestOptions,
	RequestUrl,
	WithRequestTarget,
} from 'n8n-workflow';
import {
	ApplicationError,
	decodePathValue,
	NodeApiError,
	NodeOperationError,
	requestPath,
	requestUrl,
} from 'n8n-workflow';

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

export function toPathValue(version: number, value: string) {
	return version < 1.1 ? decodePathValue(value) : value;
}

export function getApiUrl(host: string): RequestUrl {
	const [, hostname = host, port, prefix = ''] =
		/^([^/]+?)(?::(\d+))?(\/[^?#]*)?$/.exec(host) ?? [];
	const prefixPath = prefix
		.split('/')
		.slice(1)
		.reduce(
			(path, part) => (part ? requestPath`${path}/${part}` : requestPath`${path}/`),
			requestPath``,
		);
	const apiPath = requestPath`${prefixPath}/fmi/data/v1`;
	return port
		? requestUrl`https://${hostname}:${port}${apiPath}`
		: requestUrl`https://${hostname}${apiPath}`;
}

export async function getToken(this: ILoadOptionsFunctions | IExecuteFunctions): Promise<any> {
	const credentials = await this.getCredentials('fileMaker');

	const host = credentials.host as string;
	const db = credentials.db as string;
	const login = credentials.login as string;
	const password = credentials.password as string;

	// Reset all values
	const requestOptions: Omit<IRequestOptions, 'uri' | 'url' | 'baseURL'> = {
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
		const response = await this.helpers.request({
			...requestOptions,
			uri: requestUrl`${getApiUrl(host)}/databases/${db}/sessions`,
		});

		if (typeof response === 'string') {
			throw new NodeOperationError(
				this.getNode(),
				'DataAPI response body is not valid JSON. Is the DataAPI enabled?',
			);
		}

		return response.response.token;
	} catch (error) {
		let message;
		if (error.statusCode === 502) {
			message = 'The server is not responding. Is the DataAPI enabled?';
		} else if (error.error) {
			message = error.error.messages[0].code + ' - ' + error.error.messages[0].message;
		} else {
			message = error.message;
		}
		throw new ApplicationError(message, { level: 'warning' });
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
	this: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<INodePropertyOptions[]> {
	const token = await getToken.call(this);
	const credentials = await this.getCredentials('fileMaker');

	const apiUrl = getApiUrl(credentials.host as string);
	const db = credentials.db as string;

	const url = requestUrl`${apiUrl}/databases/${db}/layouts`;
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
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
	const layout = toPathValue(
		this.getNode().typeVersion,
		this.getCurrentNodeParameter('layout') as string,
	);

	const apiUrl = getApiUrl(credentials.host as string);
	const db = credentials.db as string;

	const url = requestUrl`${apiUrl}/databases/${db}/layouts/${layout}`;
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'GET',
		uri: url,
		json: true,
	};

	const responseData = await this.helpers.request(options);
	return responseData.response.fieldMetaData;
}

/**
 * Make an API request to ActiveCampaign
 *
 */
export async function getPortals(this: ILoadOptionsFunctions): Promise<any> {
	const token = await getToken.call(this);
	const credentials = await this.getCredentials('fileMaker');
	const layout = toPathValue(
		this.getNode().typeVersion,
		this.getCurrentNodeParameter('layout') as string,
	);

	const apiUrl = getApiUrl(credentials.host as string);
	const db = credentials.db as string;

	const url = requestUrl`${apiUrl}/databases/${db}/layouts/${layout}`;
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'GET',
		uri: url,
		json: true,
	};

	const responseData = await this.helpers.request(options);
	return responseData.response.portalMetaData;
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

	const apiUrl = getApiUrl(credentials.host as string);
	const db = credentials.db as string;

	const url = requestUrl`${apiUrl}/databases/${db}/scripts`;
	const options: WithRequestTarget<IRequestOptions, 'uri'> = {
		headers: {
			Authorization: `Bearer ${token}`,
		},
		method: 'GET',
		uri: url,
		json: true,
	};

	const responseData = await this.helpers.request(options);
	const items = parseScriptsList(responseData.response.scripts as ScriptObject[]);
	items.sort((a, b) => (a.name > b.name ? 0 : 1));
	return items;
}

export async function logout(
	this: ILoadOptionsFunctions | IExecuteFunctions,
	token: string,
): Promise<any> {
	const credentials = await this.getCredentials('fileMaker');

	const apiUrl = getApiUrl(credentials.host as string);
	const db = credentials.db as string;

	const url = requestUrl`${apiUrl}/databases/${db}/sessions/${token}`;

	// Reset all values
	const requestOptions: WithRequestTarget<IRequestOptions, 'uri'> = {
		uri: url,
		headers: {},
		method: 'DELETE',
		json: true,
		//rejectUnauthorized: !this.getNodeParameter('allowUnauthorizedCerts', itemIndex, false) as boolean,
	};

	const response = await this.helpers.request(requestOptions);
	return response;
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
