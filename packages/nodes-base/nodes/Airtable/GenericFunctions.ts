import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	IPollFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';


interface IAttachment {
	url: string;
	filename: string;
	type: string;
}

export interface IRecord {
	fields: {
		[key: string]: string | IAttachment[],
	};
}

/**
 * Make an API request to Airtable
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions, method: string, endpoint: string, body: object, query?: IDataObject, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('airtableApi');

	query = query || {};

	// For some reason for some endpoints the bearer auth does not work
	// and it returns 404 like for the /meta request. So we always send
	// it as query string.
	query.api_key = credentials.apiKey;

	const options: OptionsWithUri = {
		headers: {
		},
		method,
		body,
		qs: query,
		uri: uri || `https://api.airtable.com/v0/${endpoint}`,
		useQuerystring: false,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}


/**
 * Make an API request to paginated Airtable endpoint
 * and return all results
 *
 * @export
 * @param {(IHookFunctions | IExecuteFunctions)} this
 * @param {string} method
 * @param {string} endpoint
 * @param {IDataObject} body
 * @param {IDataObject} [query]
 * @returns {Promise<any>}
 */
export async function apiRequestAllItems(this: IHookFunctions | IExecuteFunctions | IPollFunctions, method: string, endpoint: string, body: IDataObject, query?: IDataObject): Promise<any> { // tslint:disable-line:no-any

	if (query === undefined) {
		query = {};
	}
	query.pageSize = 100;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData.records);

		query.offset = responseData.offset;
	} while (
		responseData.offset !== undefined
	);

	return {
		records: returnData,
	};
}

export async function downloadRecordAttachments(this: IExecuteFunctions | IPollFunctions, records: IRecord[], fieldNames: string[]): Promise<INodeExecutionData[]> {
	const elements: INodeExecutionData[] = [];
	for (const record of records) {
		const element: INodeExecutionData = { json: {}, binary: {} };
		element.json = record as unknown as IDataObject;
		for (const fieldName of fieldNames) {
			if (record.fields[fieldName] !== undefined) {
				for (const [index, attachment] of (record.fields[fieldName] as IAttachment[]).entries()) {
					const file = await apiRequest.call(this, 'GET', '', {}, {}, attachment.url, { json: false, encoding: null });
					element.binary![`${fieldName}_${index}`] = await this.helpers.prepareBinaryData(Buffer.from(file), attachment.filename, attachment.type);
				}
			}
		}
		if (Object.keys(element.binary as IBinaryKeyData).length === 0) {
			delete element.binary;
		}
		elements.push(element);
	}
	return elements;
}
