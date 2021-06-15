import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	OptionsWithUri,
} from 'request';

import {
	flow,
	omit,
} from 'lodash';

import {
	AllFieldsUi,
	LoadedPerson,
	LoadedPetition,
	LoadedTag,
	LodadedTagging,
	ResourceIds,
} from './types';

export async function actionNetworkApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = this.getCredentials('actionNetworkApi') as { apiKey: string } | undefined;

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}

	const options: OptionsWithUri = {
		headers: {
			'OSDI-API-Token': credentials.apiKey,
		},
		method,
		body,
		qs,
		uri: `https://actionnetwork.org/api/v2${endpoint}`,
		json: true,
	};

	try {
		if (!Object.keys(body).length) {
			delete options.body;
		}

		if (!Object.keys(qs).length) {
			delete options.qs;
		}

		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

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

	const returnAll = options?.returnAll ?? this.getNodeParameter('returnAll', 0, false) as boolean;
	const limit = this.getNodeParameter('limit', 0, 0) as number;

	const itemsKey = toItemsKey(endpoint);

	do {
		responseData = await actionNetworkApiRequest.call(this, method, endpoint, body, qs);
		const items = responseData._embedded[itemsKey];
		returnData.push(...items);

		if (!returnAll && returnData.length >= limit) {
			return returnData.slice(0, limit);
		}

		qs.page = responseData.page as number;
	} while (responseData.total_pages && qs.page < responseData.total_pages);

	return returnData;
}


// ----------------------------------------
//              helpers
// ----------------------------------------

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
		const relevantPart = endpoint.split('/').pop();
		return `osdi:${relevantPart?.replace(/\//g, '')}`;
	}

	return `osdi:${endpoint.replace(/\//g, '')}`;
};

export const extractId = (identifiers: string[]) =>
	identifiers
		.filter(identifier => identifier.startsWith('action_network'))[0]
		.replace(/action_network:/g, '');

export const makeOsdiLink = (personId: string) => {
	return {
		_links: {
			'osdi:person': {
				href: `https://actionnetwork.org/api/v2/people/${personId}`,
			},
		},
	};
};


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
				copy.address_lines = field.address_lines.line_fields.map(({ line }) => line);
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
		adjusted.address_lines = locationFields.address_lines.line_fields.map(({ line }) => line);
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

	const adjusted = allFields.target.split(',').map(value => ({ name: value }));

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
	return await handleListing.call(this, 'GET', `/${resource}`, {}, {}, { returnAll: true });
}

export const resourceLoaders = {
	async getAttendances(this: ILoadOptionsFunctions) {
		const eventId = this.getNodeParameter('eventId', 0);
		const endpoint = `/events/${eventId}/attendances`;

		// two-resource endpoint, so direct call
		const attendances = await handleListing.call(
			this, 'GET', endpoint, {}, {}, { returnAll: true },
		) as ResourceIds[];

		return attendances.map((signature) => {
			return {
				name: extractId(signature.identifiers),
				value: extractId(signature.identifiers),
			};
		});
	},

	async getEvents(this: ILoadOptionsFunctions) {
		const events = await loadResource.call(this, 'events') as LoadedPetition[];

		return events.map(({ title, identifiers }) => {
			return { name: title, value: extractId(identifiers) };
		});
	},

	async getPersons(this: ILoadOptionsFunctions) {
		const persons = await loadResource.call(this, 'people') as LoadedPerson[];

		return persons.map(({ family_name, given_name, identifiers }) => {
			return { name: `${family_name}, ${given_name}`, value: extractId(identifiers) };
		});
	},

	async getPetitions(this: ILoadOptionsFunctions) {
		const petitions = await loadResource.call(this, 'petitions') as LoadedPetition[];

		return petitions.map(({ title, identifiers }) => {
			return { name: title, value: extractId(identifiers) };
		});
	},

	async getSignatures(this: ILoadOptionsFunctions) {
		const petitionId = this.getNodeParameter('petitionId', 0);
		const endpoint = `/petitions/${petitionId}/signatures`;

		// two-resource endpoint, so direct call
		const signatures = await handleListing.call(
			this, 'GET', endpoint, {}, {}, { returnAll: true },
		) as ResourceIds[];

		return signatures.map((signature) => {
			return {
				name: extractId(signature.identifiers),
				value: extractId(signature.identifiers),
			};
		});
	},

	async getTags(this: ILoadOptionsFunctions) {
		const tags = await loadResource.call(this, 'tags') as LoadedTag[];

		return tags.map(({ name, identifiers }) => {
			return { name, value: extractId(identifiers) };
		});
	},

	async getTaggings(this: ILoadOptionsFunctions) {
		const tagId = this.getNodeParameter('tagId', 0);
		const endpoint = `/tags/${tagId}/taggings`;

		// two-resource endpoint, so direct call
		const taggings = await handleListing.call(
			this, 'GET', endpoint, {}, {}, { returnAll: true },
		) as LodadedTagging[];

		return taggings.map((tagging) => {
			const taggingId = tagging._links.self.href.split('/').pop() ?? 'No tagging ID';

			return {
				name: taggingId,
				value: taggingId,
			};
		});
	},
};
