import { IExecuteFunctions } from 'n8n-core';

import { OptionsWithUri } from 'request';

import { IDataObject, ILoadOptionsFunctions, NodeApiError } from 'n8n-workflow';

import { Accumulator, BaserowCredentials, LoadedResource } from './types';

/**
 * Make a request to Baserow API.
 */
export async function baserowApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	jwtToken: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = (await this.getCredentials('baserowApi')) as BaserowCredentials;

	const options: OptionsWithUri = {
		headers: {
			Authorization: `JWT ${jwtToken}`,
		},
		method,
		body,
		qs,
		uri: `${credentials.host}${endpoint}`,
		json: true,
	};

	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Get all results from a paginated query to Baserow API.
 */
export async function baserowApiRequestAllItems(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	jwtToken: string,
	body: IDataObject,
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnData: IDataObject[] = [];
	let responseData;

	qs.page = 1;
	qs.size = 100;

	const returnAll = this.getNodeParameter('returnAll', 0, false);
	const limit = this.getNodeParameter('limit', 0, 0);

	do {
		responseData = await baserowApiRequest.call(this, method, endpoint, jwtToken, body, qs);
		returnData.push(...responseData.results);

		if (!returnAll && returnData.length > limit) {
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
	this: IExecuteFunctions | ILoadOptionsFunctions,
	{ username, password, host }: BaserowCredentials,
) {
	const options: OptionsWithUri = {
		method: 'POST',
		body: {
			username,
			password,
		},
		uri: `${host}/api/user/token-auth/`,
		json: true,
	};

	try {
		const { token } = (await this.helpers.request!(options)) as { token: string };
		return token;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
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

export const toOptions = (items: LoadedResource[]) =>
	items.map(({ name, id }) => ({ name, value: id }));

/**
 * Responsible for mapping field IDs `field_n` to names and vice versa.
 */
export class TableFieldMapper {
	nameToIdMapping: Record<string, string> = {};

	idToNameMapping: Record<string, string> = {};

	mapIds = true;

	async getTableFields(
		this: IExecuteFunctions,
		table: string,
		jwtToken: string,
	): Promise<LoadedResource[]> {
		const endpoint = `/api/database/fields/table/${table}/`;
		return baserowApiRequest.call(this, 'GET', endpoint, jwtToken);
	}

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
		return this.mapIds ? field : this.nameToIdMapping[field] ?? field;
	}

	idsToNames(obj: Record<string, unknown>) {
		Object.entries(obj).forEach(([key, value]) => {
			if (this.idToNameMapping[key] !== undefined) {
				delete obj[key];
				obj[this.idToNameMapping[key]] = value;
			}
		});
	}

	namesToIds(obj: Record<string, unknown>) {
		Object.entries(obj).forEach(([key, value]) => {
			if (this.nameToIdMapping[key] !== undefined) {
				delete obj[key];
				obj[this.nameToIdMapping[key]] = value;
			}
		});
	}
}
