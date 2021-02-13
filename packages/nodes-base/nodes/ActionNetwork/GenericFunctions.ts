import { OptionsWithUri } from 'request';
import { IDataObject } from '../../../workflow/dist/src/Interfaces';

import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

export async function actionNetworkApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	method: string,
	path: string,
	body?: string,
	headers?: object
): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('ActionNetworkGroupApiToken');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	const options: OptionsWithUri = {
		headers: {
			'OSDI-API-Token': credentials.apiKey,
			'Content-Type': 'application/json',
			...(headers || {}),
		},
		method,
		uri: `https://actionnetwork.org${path}`,
		body
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		const errorMessage = (error.response && error.response.body.message) || (error.response && error.response.body.Message) || error.message;

		if (error.statusCode === 403) {
			throw new Error('The Action Network credentials are not valid!');
		}

		throw new Error(`Action Network error response [${error.statusCode}]: ${errorMessage}`);
	}
}

export async function actionNetworkApiRequestREST(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	path: string,
	body?: string,
	headers?: object
): Promise<any> { // tslint:disable-line:no-any
	const response = await actionNetworkApiRequest.call(this, method, path, body, headers);
	try {
		return JSON.parse(response);
	} catch (e) {
		return response;
	}
}

type FilterObj = { property: string, operation: string, search_term: string }

export function constructODIFilterPhrase ({ property, operation, search_term }: FilterObj) {
	return `${property} ${operation} '${search_term}'`
}

export function constructODIFilterString (filters: FilterObj[], filter_logic: string) {
	return (filters as any).map(constructODIFilterPhrase).join(` ${filter_logic} `)
}

export function constructPersonSignupHelperPayload({
	family_name,
	given_name,
	email_addresses,
	add_tags,
	phone_numbers,
	custom_fields,
	postal_addresses
}: any) {
	const body: any = {
		person: {
			family_name,
			given_name,
			email_addresses
		},
		add_tags: (add_tags as IDataObject[])?.map(t => t.tag),
	}

	// @ts-ignore
	if (phone_numbers?.length > 0) {
		body.person.phone_numbers = phone_numbers
	}
	if (Object.keys(custom_fields || {}).length > 0) {
		body.person.custom_fields = custom_fields
	}
	if (postal_addresses !== undefined && postal_addresses?.length > 0) {
		body.postal_addresses = postal_addresses.map(
			// @ts-ignore
			({ street_address, latitude, longitude, accuracy, ...a }) => {
				return {
					...a,
					address_lines: street_address ? [street_address] : undefined,
					location: { latitude, longitude, accuracy }
				}
			}
		)
	}

	return body
}
