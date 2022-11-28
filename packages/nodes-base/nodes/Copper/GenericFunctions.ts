import { createHash } from 'crypto';

import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { ICredentialDataDecryptedObject, IDataObject, NodeApiError } from 'n8n-workflow';

import { flow, omit } from 'lodash';

import {
	AddressFixedCollection,
	EmailFixedCollection,
	EmailsFixedCollection,
	PhoneNumbersFixedCollection,
} from './utils/types';

/**
 * Make an authenticated API request to Copper.
 */
export async function copperApiRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| IWebhookFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri = '',
	option: IDataObject = {},
) {
	const credentials = (await this.getCredentials('copperApi')) as { apiKey: string; email: string };

	let options: OptionsWithUri = {
		headers: {
			'X-PW-AccessToken': credentials.apiKey,
			'X-PW-Application': 'developer_api',
			'X-PW-UserEmail': credentials.email,
			'Content-Type': 'application/json',
		},
		method,
		qs,
		body,
		uri: uri || `https://api.prosperworks.com/developer_api/v1${resource}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	if (Object.keys(options.body).length === 0) {
		delete options.body;
	}

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

/**
 * Creates a secret from the credentials
 *
 */
export function getAutomaticSecret(credentials: ICredentialDataDecryptedObject) {
	const data = `${credentials.email},${credentials.apiKey}`;
	return createHash('md5').update(data).digest('hex');
}

export function adjustAddress(fixedCollection: AddressFixedCollection) {
	if (!fixedCollection.address) return fixedCollection;

	const adjusted: { address?: object } = omit(fixedCollection, ['address']);

	if (fixedCollection.address) {
		adjusted.address = fixedCollection.address.addressFields;
	}

	return adjusted;
}

export function adjustPhoneNumbers(fixedCollection: PhoneNumbersFixedCollection) {
	if (!fixedCollection.phone_numbers) return fixedCollection;

	const adjusted: { phone_numbers?: object } = omit(fixedCollection, ['phone_numbers']);

	if (fixedCollection.phone_numbers) {
		adjusted.phone_numbers = fixedCollection.phone_numbers.phoneFields;
	}

	return adjusted;
}

export function adjustEmails(fixedCollection: EmailsFixedCollection) {
	if (!fixedCollection.emails) return fixedCollection;

	const adjusted: { emails?: object } = omit(fixedCollection, ['emails']);

	if (fixedCollection.emails) {
		adjusted.emails = fixedCollection.emails.emailFields;
	}

	return adjusted;
}

export function adjustProjectIds(fields: { project_ids?: string }) {
	if (!fields.project_ids) return fields;

	const adjusted: { project_ids?: string[] } = omit(fields, ['project_ids']);

	adjusted.project_ids = fields.project_ids.includes(',')
		? fields.project_ids.split(',')
		: [fields.project_ids];

	return adjusted;
}

export function adjustEmail(fixedCollection: EmailFixedCollection) {
	if (!fixedCollection.email) return fixedCollection;

	const adjusted: { email?: object } = omit(fixedCollection, ['email']);

	if (fixedCollection.email) {
		adjusted.email = fixedCollection.email.emailFields;
	}

	return adjusted;
}

export const adjustCompanyFields = flow(adjustAddress, adjustPhoneNumbers);
export const adjustLeadFields = flow(adjustCompanyFields, adjustEmail);
export const adjustPersonFields = flow(adjustCompanyFields, adjustEmails);
export const adjustTaskFields = flow(adjustLeadFields, adjustProjectIds);

/**
 * Handle a Copper listing by returning all items or up to a limit.
 */
export async function handleListing(
	this: IExecuteFunctions,
	method: string,
	endpoint: string,
	qs: IDataObject = {},
	body: IDataObject = {},
	uri = '',
) {
	let responseData;

	const returnAll = this.getNodeParameter('returnAll', 0);

	const option = { resolveWithFullResponse: true };

	if (returnAll) {
		return await copperApiRequestAllItems.call(this, method, endpoint, body, qs, uri, option);
	}

	const limit = this.getNodeParameter('limit', 0);
	responseData = await copperApiRequestAllItems.call(this, method, endpoint, body, qs, uri, option);
	return responseData.slice(0, limit);
}

/**
 * Make an authenticated API request to Copper and return all items.
 */
export async function copperApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri = '',
	option: IDataObject = {},
) {
	let responseData;
	qs.page_size = 200;
	let totalItems = 0;
	const returnData: IDataObject[] = [];

	do {
		responseData = await copperApiRequest.call(this, method, resource, body, qs, uri, option);
		totalItems = responseData.headers['x-pw-total'];
		returnData.push(...responseData.body);
	} while (totalItems > returnData.length);

	return returnData;
}
