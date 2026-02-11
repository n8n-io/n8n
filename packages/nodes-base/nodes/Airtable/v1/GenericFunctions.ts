import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	IPollFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IPairedItemData,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { httpClient } from 'n8n-core';

interface IAttachment {
	url: string;
	filename: string;
	type: string;
}

export interface IRecord {
	fields: {
		[key: string]: string | IAttachment[];
	};
}

/**
 * Make an API request to Airtable
 */
export async function apiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: object,
	query?: IDataObject,
	uri?: string,
	option: IDataObject = {},
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	// Fall back to legacy request for custom URIs or special options
	// (e.g. downloadRecordAttachments uses { json: false, encoding: null })
	if (uri || Object.keys(option).length > 0) {
		const options: IRequestOptions = {
			headers: {},
			method,
			body,
			qs: query || {},
			uri: uri || `https://api.airtable.com/v0/${endpoint}`,
			useQuerystring: false,
			json: true,
		};
		Object.assign(options, option);
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		const authenticationMethod = this.getNodeParameter('authentication', 0) as string;
		return await this.helpers.requestWithAuthentication.call(this, authenticationMethod, options);
	}

	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

	return httpClient(this)
		.baseUrl('https://api.airtable.com/v0')
		.endpoint(`/${endpoint}`)
		.method(method)
		.body(body as IDataObject)
		.query(query ?? {})
		.withAuthentication(authenticationMethod)
		.execute();
}

/**
 * Make an API request to paginated Airtable endpoint
 * and return all results
 */
export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject,
	query?: IDataObject,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

	const records = await httpClient(this)
		.baseUrl('https://api.airtable.com/v0')
		.endpoint(`/${endpoint}`)
		.method(method)
		.body(body)
		.query(query ?? {})
		.withAuthentication(authenticationMethod)
		.withPagination({
			strategy: 'offset',
			itemsPath: 'records',
			offsetResponsePath: 'offset',
			offsetQueryParam: 'offset',
			pageSizeParam: 'pageSize',
			pageSize: 100,
		})
		.executeAll();

	return { records };
}

export async function downloadRecordAttachments(
	this: IExecuteFunctions | IPollFunctions,
	records: IRecord[],
	fieldNames: string[],
	pairedItem?: IPairedItemData[],
): Promise<INodeExecutionData[]> {
	const elements: INodeExecutionData[] = [];
	for (const record of records) {
		const element: INodeExecutionData = { json: {}, binary: {} };
		if (pairedItem) {
			element.pairedItem = pairedItem;
		}
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
