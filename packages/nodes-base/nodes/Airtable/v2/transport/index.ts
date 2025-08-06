import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IPollFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IPairedItemData,
	IHttpRequestMethods,
	IRequestOptions,
} from 'n8n-workflow';
import { ApplicationError } from '@n8n/errors';

import type { IAttachment, IRecord } from '../helpers/interfaces';
import { flattenOutput } from '../helpers/utils';

/**
 * Make an API request to Airtable
 *
 */
export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
) {
	query = query || {};

	const options: IRequestOptions = {
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

	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
	return await this.helpers.requestWithAuthentication.call(this, authenticationMethod, options);
}

/**
 * Make an API request to paginated Airtable endpoint
 * and return all results
 *
 * @param {(IExecuteFunctions | IExecuteFunctions)} this
 */
export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
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
	fieldNames: string | string[],
	pairedItem?: IPairedItemData[],
): Promise<INodeExecutionData[]> {
	if (typeof fieldNames === 'string') {
		fieldNames = fieldNames.split(',').map((item) => item.trim());
	}
	if (!fieldNames.length) {
		throw new ApplicationError("Specify field to download in 'Download Attachments' option", {
			level: 'warning',
		});
	}
	const elements: INodeExecutionData[] = [];
	for (const record of records) {
		const element: INodeExecutionData = { json: {}, binary: {} };
		if (pairedItem) {
			element.pairedItem = pairedItem;
		}
		element.json = flattenOutput(record as unknown as IDataObject);
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

export async function batchUpdate(
	this: IExecuteFunctions | IPollFunctions,
	endpoint: string,
	body: IDataObject,
	updateRecords: IDataObject[],
) {
	if (!updateRecords.length) {
		return { records: [] };
	}

	let responseData: IDataObject;

	if (updateRecords.length && updateRecords.length <= 10) {
		const updateBody = {
			...body,
			records: updateRecords,
		};

		responseData = await apiRequest.call(this, 'PATCH', endpoint, updateBody);
		return responseData;
	}

	const batchSize = 10;
	const batches = Math.ceil(updateRecords.length / batchSize);
	const updatedRecords: IDataObject[] = [];

	for (let j = 0; j < batches; j++) {
		const batch = updateRecords.slice(j * batchSize, (j + 1) * batchSize);

		const updateBody = {
			...body,
			records: batch,
		};

		const updateResponse = await apiRequest.call(this, 'PATCH', endpoint, updateBody);
		updatedRecords.push(...((updateResponse.records as IDataObject[]) || []));
	}

	responseData = { records: updatedRecords };

	return responseData;
}
