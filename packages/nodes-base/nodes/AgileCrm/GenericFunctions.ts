import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { IContactUpdate } from './ContactInterface';
import type { IFilterRules, ISearchConditions } from './FilterInterface';

export async function agileCrmApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	sendAsForm?: boolean,
): Promise<any> {
	const credentials = await this.getCredentials('agileCrmApi');
	const options: IRequestOptions = {
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
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function agileCrmApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	sendAsForm?: boolean,
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
			returnData.push.apply(returnData, responseData as IDataObject[]);
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
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods = 'PUT',
	_endpoint?: string,
	body: any = {},
	_query: IDataObject = {},
	uri?: string,
): Promise<any> {
	const credentials = await this.getCredentials('agileCrmApi');
	const baseUri = `https://${credentials.subdomain}.agilecrm.com/dev/`;
	const options: IRequestOptions = {
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
	let lastSuccesfulUpdateReturn: any;
	const payload: IContactUpdate = body;

	try {
		// Due to API, we must update each property separately. For user it looks like one seamless update
		if (payload.properties) {
			options.body.properties = payload.properties;
			options.uri = baseUri + 'api/contacts/edit-properties';
			lastSuccesfulUpdateReturn = await this.helpers.request(options);

			// Iterate trough properties and show them as individial updates instead of only vague "properties"
			payload.properties?.map((property: any) => {
				successfulUpdates.push(`${property.name}`);
			});

			delete options.body.properties;
		}
		if (payload.lead_score) {
			options.body.lead_score = payload.lead_score;
			options.uri = baseUri + 'api/contacts/edit/lead-score';
			lastSuccesfulUpdateReturn = await this.helpers.request(options);

			successfulUpdates.push('lead_score');

			delete options.body.lead_score;
		}
		if (body.tags) {
			options.body.tags = payload.tags;
			options.uri = baseUri + 'api/contacts/edit/tags';
			lastSuccesfulUpdateReturn = await this.helpers.request(options);

			payload.tags?.map((tag: string) => {
				successfulUpdates.push(`(Tag) ${tag}`);
			});

			delete options.body.tags;
		}
		if (body.star_value) {
			options.body.star_value = payload.star_value;
			options.uri = baseUri + 'api/contacts/edit/add-star';
			lastSuccesfulUpdateReturn = await this.helpers.request(options);

			successfulUpdates.push('star_value');

			delete options.body.star_value;
		}

		return lastSuccesfulUpdateReturn;
	} catch (error) {
		if (successfulUpdates.length === 0) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		} else {
			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: `Not all properties updated. Updated properties: ${successfulUpdates.join(', ')}`,
				description: error.message,
				httpCode: error.statusCode,
			});
		}
	}
}

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

	// eslint-disable-next-line @typescript-eslint/no-for-in-array
	for (const key in conditions) {
		if (conditions.hasOwnProperty(key)) {
			const searchConditions: ISearchConditions = conditions[key];
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
