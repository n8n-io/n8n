import { createHash } from 'crypto';
import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
} from 'n8n-workflow';

import {
	flow,
	omit,
} from 'lodash';

export async function copperApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = this.getCredentials('copperApi');
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

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
		uri: uri ||`https://api.prosperworks.com/developer_api/v1${resource}`,
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
		console.log(options);
		return await this.helpers.request!(options);
	} catch (error) {
		let errorMessage = error.message;
		if (error.response.body?.message) {
			errorMessage = error.response.body.message;
		}

		throw new Error('Copper Error: ' + errorMessage);
	}
}


/**
 * Creates a secret from the credentials
 *
 * @export
 * @param {ICredentialDataDecryptedObject} credentials
 * @returns
 */
export function getAutomaticSecret(credentials: ICredentialDataDecryptedObject) {
	const data = `${credentials.email},${credentials.apiKey}`;
	return createHash('md5').update(data).digest('hex');
}

export function adjustAddress(fixedCollection: { address?: { addressFields: object } }) {
	if (!fixedCollection.address) return fixedCollection;

	const adjusted: { address?: object } = omit(fixedCollection, ['address']);

	if (fixedCollection.address) {
		adjusted.address = fixedCollection.address.addressFields;
	}

	return adjusted;
}

export function adjustPhoneNumbers(fixedCollection: { phone_numbers?: { phoneFields: object } }) {
	if (!fixedCollection.phone_numbers) return fixedCollection;

	const adjusted: { phone_numbers?: object } = omit(fixedCollection, ['phone_numbers']);

	if (fixedCollection.phone_numbers) {
		adjusted.phone_numbers = fixedCollection.phone_numbers.phoneFields;
	}

	return adjusted;
}

export function adjustEmails(fixedCollection: { emails?: { emailFields: Array<{ email: string, category: string }> } }) {
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

export function adjustEmail(fixedCollection: { email?: { emailFields: Array<{ email: string, category: string }> } }) {
	if (!fixedCollection.email) return fixedCollection;

	const adjusted: { email?: object } = omit(fixedCollection, ['email']);

	if (fixedCollection.email) {
		adjusted.email = fixedCollection.email.emailFields;
	}

	return adjusted;
}

export const adjustCompanyFields = flow(adjustAddress, adjustPhoneNumbers);
export const adjustLeadFields = flow(adjustAddress, adjustPhoneNumbers, adjustEmail);
export const adjustPersonFields = flow(adjustAddress, adjustPhoneNumbers, adjustEmails);
export const adjustTaskFields = flow(adjustAddress, adjustPhoneNumbers, adjustEmails, adjustProjectIds);
