import type { OptionsWithUri } from 'request';

import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IPollFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import type { IAttachment, IRecord } from '../helpers/interfaces';

/**
 * Make an API request to Airtable
 *
 */
export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
) {
	query = query || {};

	const options: OptionsWithUri = {
		headers: {},
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

	return this.helpers.requestWithAuthentication.call(this, 'airtableTokenApi', options);
}

/**
 * Make an API request to paginated Airtable endpoint
 * and return all results
 *
 * @param {(IExecuteFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	endpoint: string,
	body?: IDataObject,
	query?: IDataObject,
) {
	if (query === undefined) {
		query = {};
	}
	query.pageSize = 100;

	const returnData: IDataObject[] = [];

	let responseData;

	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query);
		returnData.push.apply(returnData, responseData.records as IDataObject[]);

		query.offset = responseData.offset;
	} while (responseData.offset !== undefined);

	return {
		records: returnData,
	};
}

export async function downloadRecordAttachments(
	this: IExecuteFunctions | IPollFunctions,
	records: IRecord[],
	fieldNames: string[],
): Promise<INodeExecutionData[]> {
	const elements: INodeExecutionData[] = [];
	for (const record of records) {
		const element: INodeExecutionData = { json: {}, binary: {} };
		element.json = record as unknown as IDataObject;
		for (const fieldName of fieldNames) {
			if (record.fields[fieldName] !== undefined) {
				for (const [index, attachment] of (record.fields[fieldName] as IAttachment[]).entries()) {
					const file = await apiRequest.call(this, 'GET', '', {}, {}, attachment.url, {
						json: false,
						encoding: null,
					});
					element.binary![`${fieldName}_${index}`] = await this.helpers.prepareBinaryData(
						Buffer.from(file as string),
						attachment.filename,
						attachment.type,
					);
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
