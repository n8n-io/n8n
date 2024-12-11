import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { Accumulator, BaserowCredentials, LoadedResource } from './types';

export async function baserowFileUploadRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	jwtToken: string,
	file: Buffer,
	fileName: string,
	mimeType: string,
) {
	const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');

	const options: IHttpRequestOptions = {
		headers: {
			Authorization: `JWT ${jwtToken}`,
			'Content-Type': 'multipart/form-data',
		},
		method: 'POST',
		url: `${credentials.host}/api/user-files/upload-file/`,
		json: false,
		body: {
			file: {
				value: file,
				options: {
					filename: fileName,
					contentType: mimeType,
				},
			},
		},
	};

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Make a request to Baserow API.
 */
export async function baserowApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	jwtToken: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials<BaserowCredentials>('baserowApi');

	const options: IHttpRequestOptions = {
		headers: {
			Authorization: `JWT ${jwtToken}`,
		},
		method,
		body,
		qs,
		url: `${credentials.host}${endpoint}`,
		json: true,
	};

	if (body.formData) {
		options.json = false;
		options.headers = {
			...options.headers,
			'Content-Type': 'multipart/form-data',
		};
		options.returnFullResponse = true;
	}

	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.httpRequest(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Get all results from a paginated query to Baserow API.
 */
export async function baserowApiRequestAllItems(
	this: IExecuteFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	jwtToken: string,
	body: IDataObject,
	qs: IDataObject = {},
	returnAll: boolean = false,
	limit: number = 0,
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let responseData;

	qs.page = 1;
	if (!qs.size) {
		qs.size = 100;
	}

	do {
		responseData = await baserowApiRequest.call(this, method, endpoint, jwtToken, body, qs);
		returnData.push(...(responseData.results as IDataObject[]));

		if (!returnAll && limit > 0 && returnData.length > limit) {
			return returnData.slice(0, limit);
		}

		qs.page += 1;
	} while (responseData.next !== null);

	return returnData;
}

/**
 * Get a JWT token based on Baserow account username and password.
 */
export async function getJwtToken(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	{ username, password, host }: BaserowCredentials,
) {
	const options: IHttpRequestOptions = {
		method: 'POST',
		body: {
			username,
			password,
		},
		url: `${host}/api/user/token-auth/`,
		json: true,
	};

	try {
		const { token } = (await this.helpers.httpRequest(options)) as { token: string };
		return token;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function getFieldNamesAndIds(
	this: IExecuteFunctions,
	tableId: string,
	jwtToken: string,
) {
	const endpoint = `/api/database/fields/table/${tableId}/`;
	const response = (await baserowApiRequest.call(
		this,
		'GET',
		endpoint,
		jwtToken,
	)) as LoadedResource[];

	return {
		names: response.map((field) => field.name),
		ids: response.map((field) => `field_${field.id}`),
	};
}

export async function getTableFields(
	this: IExecuteFunctions | IPollFunctions,
	table: string,
	jwtToken: string,
): Promise<LoadedResource[]> {
	const endpoint = `/api/database/fields/table/${table}/`;
	return await baserowApiRequest.call(this, 'GET', endpoint, jwtToken);
}

export const toOptions = (items: LoadedResource[]) =>
	items.map(({ name, id }) => ({ name, value: id }));

/**
 * Responsible for mapping field IDs `field_n` to names and vice versa.
 */
export class TableFieldMapper {
	nameToIdMapping: Record<string, string> = {};

	idToNameMapping: Record<string, string> = {};

	mapIds = true;

	createMappings(tableFields: LoadedResource[]) {
		this.nameToIdMapping = this.createNameToIdMapping(tableFields);
		this.idToNameMapping = this.createIdToNameMapping(tableFields);
	}

	private createIdToNameMapping(responseData: LoadedResource[]) {
		return responseData.reduce<Accumulator>((acc, cur) => {
			acc[`field_${cur.id}`] = cur.name;
			return acc;
		}, {});
	}

	private createNameToIdMapping(responseData: LoadedResource[]) {
		return responseData.reduce<Accumulator>((acc, cur) => {
			acc[cur.name] = `field_${cur.id}`;
			return acc;
		}, {});
	}

	setField(field: string) {
		return this.mapIds ? field : (this.nameToIdMapping[field] ?? field);
	}

	idsToNames(obj: Record<string, unknown>) {
		Object.entries(obj).forEach(([key, value]) => {
			if (this.idToNameMapping[key] !== undefined) {
				delete obj[key];
				obj[this.idToNameMapping[key]] = value;
			}
		});
	}

	idToName(id: string) {
		return this.idToNameMapping[id] ?? id;
	}

	namesToIds(obj: Record<string, unknown>) {
		Object.entries(obj).forEach(([key, value]) => {
			if (this.nameToIdMapping[key] !== undefined) {
				delete obj[key];
				obj[this.nameToIdMapping[key]] = value;
			}
		});
	}

	nameToId(name: string) {
		return this.nameToIdMapping[name] ?? name;
	}
}
