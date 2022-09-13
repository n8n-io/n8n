import { IExecuteFunctions, IHookFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	NodeApiError,
} from 'n8n-workflow';

import { CustomField, GeneralAddress, Ref } from './descriptions/Shared.interface';

import { capitalCase } from 'change-case';

import { omit, pickBy } from 'lodash';

import { OptionsWithUri } from 'request';

import { DateFieldsUi, Option, QuickBooksOAuth2Credentials, TransactionReport } from './types';

/**
 * Make an authenticated API request to QuickBooks.
 */
export async function quickBooksApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const operation = this.getNodeParameter('operation', 0) as string;

	let isDownload = false;

	if (['estimate', 'invoice', 'payment'].includes(resource) && operation === 'get') {
		isDownload = this.getNodeParameter('download', 0) as boolean;
	}

	const productionUrl = 'https://quickbooks.api.intuit.com';
	const sandboxUrl = 'https://sandbox-quickbooks.api.intuit.com';

	const credentials = (await this.getCredentials(
		'quickBooksOAuth2Api',
	)) as QuickBooksOAuth2Credentials;

	const options: OptionsWithUri = {
		headers: {
			'user-agent': 'n8n',
		},
		method,
		uri: `${credentials.environment === 'sandbox' ? sandboxUrl : productionUrl}${endpoint}`,
		qs,
		body,
		json: !isDownload,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	if (isDownload) {
		options.headers!['Accept'] = 'application/pdf';
	}

	if (resource === 'invoice' && operation === 'send') {
		options.headers!['Content-Type'] = 'application/octet-stream';
	}

	if (
		(resource === 'invoice' && (operation === 'void' || operation === 'delete')) ||
		(resource === 'payment' && (operation === 'void' || operation === 'delete'))
	) {
		options.headers!['Content-Type'] = 'application/json';
	}

	try {
		return await this.helpers.requestOAuth2!.call(this, 'quickBooksOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Make an authenticated API request to QuickBooks and return all results.
 */
export async function quickBooksApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	body: IDataObject,
	resource: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	let responseData;
	let startPosition = 1;
	const maxResults = 1000;
	const returnData: IDataObject[] = [];

	const maxCountQuery = {
		query: `SELECT COUNT(*) FROM ${resource}`,
	} as IDataObject;

	const maxCount = await getCount.call(this, method, endpoint, maxCountQuery);

	const originalQuery = qs.query as string;

	do {
		qs.query = `${originalQuery} MAXRESULTS ${maxResults} STARTPOSITION ${startPosition}`;
		responseData = await quickBooksApiRequest.call(this, method, endpoint, qs, body);
		try {
			const nonResource = originalQuery.split(' ')?.pop();
			if (nonResource === 'CreditMemo' || nonResource === 'Term' || nonResource === 'TaxCode') {
				returnData.push(...responseData.QueryResponse[nonResource]);
			} else {
				returnData.push(...responseData.QueryResponse[capitalCase(resource)]);
			}
		} catch (error) {
			return [];
		}

		startPosition += maxResults;
	} while (maxCount > returnData.length);

	return returnData;
}

async function getCount(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const responseData = await quickBooksApiRequest.call(this, method, endpoint, qs, {});

	return responseData.QueryResponse.totalCount;
}

/**
 * Handles a QuickBooks listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	i: number,
	endpoint: string,
	resource: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	let responseData;

	const qs = {
		query: `SELECT * FROM ${resource}`,
	} as IDataObject;

	const returnAll = this.getNodeParameter('returnAll', i);

	const filters = this.getNodeParameter('filters', i) as IDataObject;
	if (filters.query) {
		qs.query += ` ${filters.query}`;
	}

	if (returnAll) {
		return await quickBooksApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource);
	} else {
		const limit = this.getNodeParameter('limit', i) as number;
		qs.query += ` MAXRESULTS ${limit}`;
		responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, qs, {});
		responseData = responseData.QueryResponse[capitalCase(resource)];
		return responseData;
	}
}

/**
 * Get the SyncToken required for delete and void operations in QuickBooks.
 */
export async function getSyncToken(
	this: IExecuteFunctions,
	i: number,
	companyId: string,
	resource: string,
) {
	const resourceId = this.getNodeParameter(`${resource}Id`, i);
	const getEndpoint = `/v3/company/${companyId}/${resource}/${resourceId}`;
	const propertyName = capitalCase(resource);
	const {
		[propertyName]: { SyncToken },
	} = await quickBooksApiRequest.call(this, 'GET', getEndpoint, {}, {});

	return SyncToken;
}

/**
 * Get the reference and SyncToken required for update operations in QuickBooks.
 */
export async function getRefAndSyncToken(
	this: IExecuteFunctions,
	i: number,
	companyId: string,
	resource: string,
	ref: string,
) {
	const resourceId = this.getNodeParameter(`${resource}Id`, i);
	const endpoint = `/v3/company/${companyId}/${resource}/${resourceId}`;
	const responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

	return {
		ref: responseData[capitalCase(resource)][ref],
		syncToken: responseData[capitalCase(resource)].SyncToken,
	};
}

/**
 * Populate node items with binary data.
 */
export async function handleBinaryData(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	i: number,
	companyId: string,
	resource: string,
	resourceId: string,
) {
	const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
	const fileName = this.getNodeParameter('fileName', i) as string;
	const endpoint = `/v3/company/${companyId}/${resource}/${resourceId}/pdf`;
	const data = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {}, { encoding: null });

	items[i].binary = items[i].binary ?? {};
	items[i].binary![binaryProperty] = await this.helpers.prepareBinaryData(data);
	items[i].binary![binaryProperty].fileName = fileName;
	items[i].binary![binaryProperty].fileExtension = 'pdf';

	return items;
}

export async function loadResource(this: ILoadOptionsFunctions, resource: string) {
	const returnData: INodePropertyOptions[] = [];

	const qs = {
		query: `SELECT * FROM ${resource}`,
	} as IDataObject;

	const {
		oauthTokenData: {
			callbackQueryString: { realmId },
		},
	} = (await this.getCredentials('quickBooksOAuth2Api')) as {
		oauthTokenData: { callbackQueryString: { realmId: string } };
	};
	const endpoint = `/v3/company/${realmId}/query`;

	const resourceItems = await quickBooksApiRequestAllItems.call(
		this,
		'GET',
		endpoint,
		qs,
		{},
		resource,
	);

	if (resource === 'preferences') {
		const {
			SalesFormsPrefs: { CustomField },
		} = resourceItems[0];
		const customFields = CustomField[1].CustomField;
		for (const customField of customFields) {
			const length = customField.Name.length;
			returnData.push({
				name: customField.StringValue,
				value: customField.Name.charAt(length - 1),
			});
		}
		return returnData;
	}

	resourceItems.forEach((resourceItem: { DisplayName: string; Name: string; Id: string }) => {
		returnData.push({
			name: resourceItem.DisplayName || resourceItem.Name || `Memo ${resourceItem.Id}`,
			value: resourceItem.Id,
		});
	});

	return returnData;
}

/**
 * Populate the `Line` property in a request body.
 */
export function processLines(
	this: IExecuteFunctions,
	body: IDataObject,
	lines: IDataObject[],
	resource: string,
) {
	lines.forEach((line) => {
		if (resource === 'bill') {
			if (line.DetailType === 'AccountBasedExpenseLineDetail') {
				line.AccountBasedExpenseLineDetail = {
					AccountRef: {
						value: line.accountId,
					},
				};
				delete line.accountId;
			} else if (line.DetailType === 'ItemBasedExpenseLineDetail') {
				line.ItemBasedExpenseLineDetail = {
					ItemRef: {
						value: line.itemId,
					},
				};
				delete line.itemId;
			}
		} else if (resource === 'estimate') {
			if (line.DetailType === 'SalesItemLineDetail') {
				line.SalesItemLineDetail = {
					ItemRef: {
						value: line.itemId,
					},
					TaxCodeRef: {
						value: line.TaxCodeRef,
					},
				};
				delete line.itemId;
				delete line.TaxCodeRef;
			}
		} else if (resource === 'invoice') {
			if (line.DetailType === 'SalesItemLineDetail') {
				line.SalesItemLineDetail = {
					ItemRef: {
						value: line.itemId,
					},
					TaxCodeRef: {
						value: line.TaxCodeRef,
					},
				};
				delete line.itemId;
				delete line.TaxCodeRef;
			}
		}
	});

	return lines;
}

/**
 * Populate update fields or additional fields into a request body.
 */
export function populateFields(
	this: IExecuteFunctions,
	body: IDataObject,
	fields: IDataObject,
	resource: string,
) {
	Object.entries(fields).forEach(([key, value]) => {
		if (resource === 'bill') {
			if (key.endsWith('Ref')) {
				const { details } = value as { details: Ref };
				body[key] = {
					name: details.name,
					value: details.value,
				};
			} else {
				body[key] = value;
			}
		} else if (['customer', 'employee', 'vendor'].includes(resource)) {
			if (key === 'BillAddr') {
				const { details } = value as { details: GeneralAddress };
				body.BillAddr = pickBy(details, (detail) => detail !== '');
			} else if (key === 'PrimaryEmailAddr') {
				body.PrimaryEmailAddr = {
					Address: value,
				};
			} else if (key === 'PrimaryPhone') {
				body.PrimaryPhone = {
					FreeFormNumber: value,
				};
			} else {
				body[key] = value;
			}
		} else if (resource === 'estimate' || resource === 'invoice') {
			if (key === 'BillAddr' || key === 'ShipAddr') {
				const { details } = value as { details: GeneralAddress };
				body[key] = pickBy(details, (detail) => detail !== '');
			} else if (key === 'BillEmail') {
				body.BillEmail = {
					Address: value,
				};
			} else if (key === 'CustomFields') {
				const { Field } = value as { Field: CustomField[] };
				body.CustomField = Field;
				const length = (body.CustomField as CustomField[]).length;
				for (let i = 0; i < length; i++) {
					//@ts-ignore
					body.CustomField[i]['Type'] = 'StringType';
				}
			} else if (key === 'CustomerMemo') {
				body.CustomerMemo = {
					value,
				};
			} else if (key.endsWith('Ref')) {
				const { details } = value as { details: Ref };
				body[key] = {
					name: details.name,
					value: details.value,
				};
			} else if (key === 'TotalTax') {
				body.TxnTaxDetail = {
					TotalTax: value,
				};
			} else {
				body[key] = value;
			}
		} else if (resource === 'payment') {
			body[key] = value;
		}
	});
	return body;
}

export const toOptions = (option: string) => ({ name: option, value: option });

export const toDisplayName = ({ name, value }: Option): INodePropertyOptions => {
	return { name: splitPascalCase(name), value };
};

export const splitPascalCase = (word: string) => {
	return word.match(/($[a-z])|[A-Z][^A-Z]+/g)!.join(' ');
};

export function adjustTransactionDates(transactionFields: IDataObject & DateFieldsUi): IDataObject {
	const dateFieldKeys = [
		'dateRangeCustom',
		'dateRangeDueCustom',
		'dateRangeModificationCustom',
		'dateRangeCreationCustom',
	] as const;

	if (dateFieldKeys.every((dateField) => !transactionFields[dateField])) {
		return transactionFields;
	}

	let adjusted = omit(transactionFields, dateFieldKeys) as IDataObject;

	dateFieldKeys.forEach((dateFieldKey) => {
		const dateField = transactionFields[dateFieldKey];

		if (dateField) {
			Object.entries(dateField[`${dateFieldKey}Properties`]).map(
				([key, value]) => (dateField[`${dateFieldKey}Properties`][key] = value.split('T')[0]),
			);

			adjusted = {
				...adjusted,
				...dateField[`${dateFieldKey}Properties`],
			};
		}
	});

	return adjusted;
}

export function simplifyTransactionReport(transactionReport: TransactionReport) {
	const columns = transactionReport.Columns.Column.map((column) => column.ColType);
	const rows = transactionReport.Rows.Row.map((row) => row.ColData.map((i) => i.value));

	const simplified = [];
	for (const row of rows) {
		const transaction: { [key: string]: string } = {};
		for (let i = 0; i < row.length; i++) {
			transaction[columns[i]] = row[i];
		}
		simplified.push(transaction);
	}

	return simplified;
}
