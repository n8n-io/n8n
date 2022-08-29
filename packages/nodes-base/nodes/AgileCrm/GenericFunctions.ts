import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError } from 'n8n-workflow';

import { IContactUpdate } from './ContactInterface';

import { IFilterRules, ISearchConditions } from './FilterInterface';

export async function agileCrmApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	sendAsForm?: boolean,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('agileCrmApi');
	const options: IHttpRequestOptions = {
		method,
		headers: {
			Accept: 'application/json',
		},
		auth: {
			username: credentials.email as string,
			password: credentials.apiKey as string,
		},
		qs: query,
		uri: uri || `https://${credentials.subdomain}.agilecrm.com/dev/${endpoint}`,
		json: true,
	};

	// To send the request as 'content-type': 'application/x-www-form-urlencoded' add form to options instead of body
	if (sendAsForm) {
		options.form = body;
	}
	// Only add Body property if method not GET or DELETE to avoid 400 response
	// And when not sending a form
	else if (method !== 'GET' && method !== 'DELETE') {
		options.body = body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function agileCrmApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	sendAsForm?: boolean,
	// tslint:disable-next-line:no-any
): Promise<any> {
	// https://github.com/agilecrm/rest-api#11-listing-contacts-

	const returnData: IDataObject[] = [];
	let responseData;
	do {
		responseData = await agileCrmApiRequest.call(
			this,
			method,
			resource,
			body,
			query,
			uri,
			sendAsForm,
		);
		if (responseData.length !== 0) {
			returnData.push.apply(returnData, responseData);
			if (sendAsForm) {
				body.cursor = responseData[responseData.length - 1].cursor;
			} else {
				query.cursor = responseData[responseData.length - 1].cursor;
			}
		}
	} while (
		responseData.length !== 0 &&
		responseData[responseData.length - 1].hasOwnProperty('cursor')
	);

	return returnData;
}

export async function agileCrmApiRequestUpdate(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: Partial<IHttpRequestMethods>,
	endpoint?: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('agileCrmApi');
	const baseUri = `https://${credentials.subdomain}.agilecrm.com/dev/`;
	const options: IHttpRequestOptions = {
		method,
		headers: {
			Accept: 'application/json',
		},
		body: { id: body.id },
		auth: {
			username: credentials.email as string,
			password: credentials.apiKey as string,
		},
		uri: uri || baseUri,
		json: true,
	};

	const successfulUpdates = [];
	let lastSuccesfulUpdateReturn: any; // tslint:disable-line:no-any
	const payload: IContactUpdate = body;

	try {
		// Due to API, we must update each property separately. For user it looks like one seamless update
		if (payload.properties) {
			Object.assign(options.body!, { properties: payload.properties });
			options.uri = baseUri + 'api/contacts/edit-properties';
			lastSuccesfulUpdateReturn = await this.helpers.request!(options);

			// Iterate trough properties and show them as individial updates instead of only vague "properties"
			// tslint:disable-next-line:no-any
			payload.properties?.map((property: any) => {
				successfulUpdates.push(`${property.name}`);
			});

			// tslint:disable-next-line:no-any
			delete (options.body as any).properties;
		}
		if (payload.lead_score) {
			Object.assign(options.body!, { lead_score: payload.lead_score });
			options.uri = baseUri + 'api/contacts/edit/lead-score';
			lastSuccesfulUpdateReturn = await this.helpers.request!(options);

			successfulUpdates.push('lead_score');

			// tslint:disable-next-line:no-any
			delete (options.body as any).lead_score;
		}
		if (body.tags) {
			Object.assign(options.body!, { tags: payload.tags });
			options.uri = baseUri + 'api/contacts/edit/tags';
			lastSuccesfulUpdateReturn = await this.helpers.request!(options);

			payload.tags?.map((tag: string) => {
				successfulUpdates.push(`(Tag) ${tag}`);
			});

			// tslint:disable-next-line:no-any
			delete (options.body as any).tags;
		}
		if (body.star_value) {
			Object.assign(options.body!, { star_value: payload.star_value });
			options.uri = baseUri + 'api/contacts/edit/add-star';
			lastSuccesfulUpdateReturn = await this.helpers.request!(options);

			successfulUpdates.push('star_value');

			// tslint:disable-next-line:no-any
			delete (options.body as any).star_value;
		}

		return lastSuccesfulUpdateReturn;
	} catch (error) {
		if (successfulUpdates.length === 0) {
			throw new NodeApiError(this.getNode(), error);
		} else {
			throw new NodeApiError(this.getNode(), error, {
				message: `Not all properties updated. Updated properties: ${successfulUpdates.join(', ')}`,
				description: error.message,
				httpCode: error.statusCode,
			});
		}
	}
}

// tslint:disable-next-line:no-any
export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}

export function getFilterRules(conditions: ISearchConditions[], matchType: string): IDataObject {
	const rules = [];

	for (const key in conditions) {
		if (conditions.hasOwnProperty(key)) {
			const searchConditions: ISearchConditions = conditions[key] as ISearchConditions;
			const rule: IFilterRules = {
				LHS: searchConditions.field,
				CONDITION: searchConditions.condition_type,
				RHS: searchConditions.value as string,
				RHS_NEW: searchConditions.value2 as string,
			};
			rules.push(rule);
		}
	}

	if (matchType === 'anyFilter') {
		return {
			or_rules: rules,
		};
	} else {
		return {
			rules,
		};
	}
}

export function simplifyResponse(
	records: [{ id: string; properties: [{ name: string; value: string }] }],
) {
	const results = [];
	for (const record of records) {
		results.push(
			record.properties.reduce(
				(obj, value) => Object.assign(obj, { [`${value.name}`]: value.value }),
				{ id: record.id },
			),
		);
	}
	return results;
}
