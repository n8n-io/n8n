import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, ILoadOptionsFunctions } from 'n8n-workflow';

import type { OptionsWithUri } from 'request';

import flow from 'lodash.flow';
import omit from 'lodash.omit';

import type {
	AllFieldsUi,
	FieldWithPrimaryField,
	LinksFieldContainer,
	PersonResponse,
	PetitionResponse,
	Resource,
	Response,
} from './types';

export async function actionNetworkApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const options: OptionsWithUri = {
		method,
		body,
		qs,
		uri: `https://actionnetwork.org/api/v2${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (!Object.keys(qs).length) {
		delete options.qs;
	}

	return this.helpers.requestWithAuthentication.call(this, 'actionNetworkApi', options);
}

/**
 * Convert an endpoint to the key needed to access data in the response.
 */
const toItemsKey = (endpoint: string) => {
	// handle two-resource endpoint
	if (
		endpoint.includes('/signatures') ||
		endpoint.includes('/attendances') ||
		endpoint.includes('/taggings')
	) {
		endpoint = endpoint.split('/').pop()!;
	}

	return `osdi:${endpoint.replace(/\//g, '')}`;
};

export async function handleListing(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	options?: { returnAll: true },
) {
	const returnData: IDataObject[] = [];
	let responseData;

	qs.perPage = 25; // max
	qs.page = 1;

	const returnAll = options?.returnAll ?? (this.getNodeParameter('returnAll', 0, false) as boolean);
	const limit = this.getNodeParameter('limit', 0, 0) as number;

	const itemsKey = toItemsKey(endpoint);

	do {
		responseData = await actionNetworkApiRequest.call(this, method, endpoint, body, qs);
		const items = responseData._embedded[itemsKey];
		returnData.push(...(items as IDataObject[]));

		if (!returnAll && returnData.length >= limit) {
			return returnData.slice(0, limit);
		}

		if (responseData._links?.next?.href) {
			const queryString = new URLSearchParams(
				responseData._links.next.href.split('?')[1] as string,
			);
			qs.page = queryString.get('page') as string;
		}
	} while (responseData._links?.next);

	return returnData;
}

// ----------------------------------------
//              helpers
// ----------------------------------------

export const extractId = (response: LinksFieldContainer) => {
	return response._links.self.href.split('/').pop() ?? 'No ID';
};

export const makeOsdiLink = (personId: string) => {
	return {
		_links: {
			'osdi:person': {
				href: `https://actionnetwork.org/api/v2/people/${personId}`,
			},
		},
	};
};

export const isPrimary = (field: FieldWithPrimaryField) => field.primary;

// ----------------------------------------
//           field adjusters
// ----------------------------------------

function adjustLanguagesSpoken(allFields: AllFieldsUi) {
	if (!allFields.languages_spoken) return allFields;

	return {
		...omit(allFields, ['languages_spoken']),
		languages_spoken: [allFields.languages_spoken],
	};
}

function adjustPhoneNumbers(allFields: AllFieldsUi) {
	if (!allFields.phone_numbers) return allFields;

	return {
		...omit(allFields, ['phone_numbers']),
		phone_numbers: [allFields.phone_numbers.phone_numbers_fields],
	};
}

function adjustPostalAddresses(allFields: AllFieldsUi) {
	if (!allFields.postal_addresses) return allFields;

	if (allFields.postal_addresses.postal_addresses_fields.length) {
		const adjusted = allFields.postal_addresses.postal_addresses_fields.map((field) => {
			const copy: IDataObject = {
				...omit(field, ['address_lines', 'location']),
			};

			if (field.address_lines) {
				copy.address_lines = [field.address_lines];
			}

			if (field.location) {
				copy.location = field.location.location_fields;
			}

			return copy;
		});

		return {
			...omit(allFields, ['postal_addresses']),
			postal_addresses: adjusted,
		};
	}
}

function adjustLocation(allFields: AllFieldsUi) {
	if (!allFields.location) return allFields;

	const locationFields = allFields.location.postal_addresses_fields;

	const adjusted: IDataObject = {
		...omit(locationFields, ['address_lines', 'location']),
	};

	if (locationFields.address_lines) {
		adjusted.address_lines = [locationFields.address_lines];
	}

	if (locationFields.location) {
		adjusted.location = locationFields.location.location_fields;
	}

	return {
		...omit(allFields, ['location']),
		location: adjusted,
	};
}

function adjustTargets(allFields: AllFieldsUi) {
	if (!allFields.target) return allFields;

	const adjusted = allFields.target.split(',').map((value) => ({ name: value }));

	return {
		...omit(allFields, ['target']),
		target: adjusted,
	};
}

// ----------------------------------------
//           payload adjusters
// ----------------------------------------

export const adjustPersonPayload = flow(
	adjustLanguagesSpoken,
	adjustPhoneNumbers,
	adjustPostalAddresses,
);

export const adjustPetitionPayload = adjustTargets;

export const adjustEventPayload = adjustLocation;

// ----------------------------------------
//           resource loaders
// ----------------------------------------

async function loadResource(this: ILoadOptionsFunctions, resource: string) {
	return handleListing.call(this, 'GET', `/${resource}`, {}, {}, { returnAll: true });
}

export const resourceLoaders = {
	async getTags(this: ILoadOptionsFunctions) {
		const tags = (await loadResource.call(this, 'tags')) as Array<
			{ name: string } & LinksFieldContainer
		>;

		return tags.map((tag) => ({ name: tag.name, value: extractId(tag) }));
	},

	async getTaggings(this: ILoadOptionsFunctions) {
		const tagId = this.getNodeParameter('tagId', 0);
		const endpoint = `/tags/${tagId}/taggings`;

		// two-resource endpoint, so direct call
		const taggings = (await handleListing.call(
			this,
			'GET',
			endpoint,
			{},
			{},
			{ returnAll: true },
		)) as LinksFieldContainer[];

		return taggings.map((tagging) => {
			const taggingId = extractId(tagging);

			return {
				name: taggingId,
				value: taggingId,
			};
		});
	},
};

// ----------------------------------------
//          response simplifiers
// ----------------------------------------
const simplifyPersonResponse = (response: PersonResponse) => {
	const emailAddress = response.email_addresses.filter(isPrimary);
	const phoneNumber = response.phone_numbers.filter(isPrimary);
	const postalAddress = response.postal_addresses.filter(isPrimary);

	const fieldsToSimplify = [
		'identifiers',
		'email_addresses',
		'phone_numbers',
		'postal_addresses',
		'languages_spoken',
		'_links',
	];

	return {
		id: extractId(response),
		...omit(response, fieldsToSimplify),
		...{ email_address: emailAddress[0].address || '' },
		...{ phone_number: phoneNumber[0].number || '' },
		...{
			postal_address: {
				...(postalAddress && omit(postalAddress[0], 'address_lines')),
				address_lines: postalAddress[0].address_lines ?? '',
			},
		},
		language_spoken: response.languages_spoken[0],
	};
};

const simplifyPetitionResponse = (response: PetitionResponse) => {
	const fieldsToSimplify = ['identifiers', '_links', 'action_network:hidden', '_embedded'];

	return {
		id: extractId(response),
		...omit(response, fieldsToSimplify),
		creator: simplifyPersonResponse(response._embedded['osdi:creator']),
	};
};

export const simplifyResponse = (response: Response, resource: Resource) => {
	if (resource === 'person') {
		return simplifyPersonResponse(response as PersonResponse);
	} else if (resource === 'petition') {
		return simplifyPetitionResponse(response as PetitionResponse);
	}

	const fieldsToSimplify = ['identifiers', '_links', 'action_network:sponsor', 'reminders'];

	return {
		id: extractId(response),
		...omit(response, fieldsToSimplify),
	};
};
