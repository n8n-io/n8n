import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type { Connector, ElasticSecurityApiCredentials } from './types';

export function tolerateTrailingSlash(baseUrl: string) {
	return baseUrl.endsWith('/') ? baseUrl.substr(0, baseUrl.length - 1) : baseUrl;
}

export async function elasticSecurityApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const { baseUrl: rawBaseUrl } =
		await this.getCredentials<ElasticSecurityApiCredentials>('elasticSecurityApi');

	const baseUrl = tolerateTrailingSlash(rawBaseUrl);

	const options: IRequestOptions = {
		method,
		body,
		qs,
		uri: `${baseUrl}/api${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'elasticSecurityApi', options);
	} catch (error) {
		if (error?.error?.error === 'Not Acceptable' && error?.error?.message) {
			error.error.error = `${error.error.error}: ${error.error.message}`;
		}

		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function elasticSecurityApiRequestAllItems(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	let _page = 1;
	const returnData: IDataObject[] = [];
	let responseData: any;

	const resource = this.getNodeParameter('resource', 0) as 'case' | 'caseComment';

	do {
		responseData = await elasticSecurityApiRequest.call(this, method, endpoint, body, qs);
		_page++;

		const items = resource === 'case' ? responseData.cases : responseData;

		returnData.push(...(items as IDataObject[]));
	} while (returnData.length < responseData.total);

	return returnData;
}

export async function handleListing(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const returnAll = this.getNodeParameter('returnAll', 0);

	if (returnAll) {
		return await elasticSecurityApiRequestAllItems.call(this, method, endpoint, body, qs);
	}

	const responseData = await elasticSecurityApiRequestAllItems.call(
		this,
		method,
		endpoint,
		body,
		qs,
	);
	const limit = this.getNodeParameter('limit', 0);

	return responseData.slice(0, limit);
}

/**
 * Retrieve a connector name and type from a connector ID.
 *
 * https://www.elastic.co/guide/en/kibana/master/get-connector-api.html
 */
export async function getConnector(this: IExecuteFunctions, connectorId: string) {
	const endpoint = `/actions/connector/${connectorId}`;
	const {
		id,
		name,
		connector_type_id: type,
	} = (await elasticSecurityApiRequest.call(this, 'GET', endpoint)) as Connector;

	return { id, name, type };
}

export function throwOnEmptyUpdate(this: IExecuteFunctions, resource: string) {
	throw new NodeOperationError(
		this.getNode(),
		`Please enter at least one field to update for the ${resource}`,
	);
}

export async function getVersion(this: IExecuteFunctions, endpoint: string) {
	const { version } = (await elasticSecurityApiRequest.call(this, 'GET', endpoint)) as {
		version?: string;
	};

	if (!version) {
		throw new NodeOperationError(this.getNode(), 'Cannot retrieve version for resource');
	}

	return version;
}
