/**
 * Google Contacts Node Types
 *
 * Consume Google Contacts API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/googlecontacts/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a contact */
export type GoogleContactsV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	familyName?: string | Expression<string>;
	givenName?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type GoogleContactsV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	contactId: string | Expression<string>;
};

/** Get a contact */
export type GoogleContactsV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	contactId: string | Expression<string>;
	/**
	 * A field mask to restrict which fields on each person are returned. Multiple fields can be specified by separating them with commas.
	 * @default []
	 */
	fields?: Array<
		| '*'
		| 'addresses'
		| 'biographies'
		| 'birthdays'
		| 'coverPhotos'
		| 'emailAddresses'
		| 'events'
		| 'genders'
		| 'imClients'
		| 'interests'
		| 'locales'
		| 'memberships'
		| 'metadata'
		| 'names'
		| 'nicknames'
		| 'occupations'
		| 'organizations'
		| 'phoneNumbers'
		| 'photos'
		| 'relations'
		| 'residences'
		| 'sipAddresses'
		| 'skills'
		| 'urls'
		| 'userDefined'
	>;
	/**
	 * Whether to return the data exactly in the way it got received from the API
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
};

/** Retrieve many contacts */
export type GoogleContactsV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	/**
	 * A field mask to restrict which fields on each person are returned. Multiple fields can be specified by separating them with commas.
	 * @default []
	 */
	fields?: Array<
		| '*'
		| 'addresses'
		| 'biographies'
		| 'birthdays'
		| 'coverPhotos'
		| 'emailAddresses'
		| 'events'
		| 'genders'
		| 'imClients'
		| 'interests'
		| 'locales'
		| 'memberships'
		| 'metadata'
		| 'names'
		| 'nicknames'
		| 'occupations'
		| 'organizations'
		| 'phoneNumbers'
		| 'photos'
		| 'relations'
		| 'residences'
		| 'sipAddresses'
		| 'skills'
		| 'urls'
		| 'userDefined'
	>;
	/**
	 * Whether or not to use a query to filter the results
	 * @default false
	 */
	useQuery?: boolean | Expression<boolean>;
	/**
	 * The plain-text query for the request. The query is used to match prefix phrases of the fields on a person. For example, a person with name "foo name" matches queries such as "f", "fo", "foo", "foo n", "nam", etc., but not "oo n".
	 */
	query?: string | Expression<string>;
	/**
	 * Whether to return the data exactly in the way it got received from the API
	 * @default false
	 */
	rawData?: boolean | Expression<boolean>;
	options?: Record<string, unknown>;
};

/** Update a contact */
export type GoogleContactsV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	contactId: string | Expression<string>;
	/**
	 * A field mask to restrict which fields on each person are returned. Multiple fields can be specified by separating them with commas.
	 * @default []
	 */
	fields?: Array<
		| '*'
		| 'addresses'
		| 'biographies'
		| 'birthdays'
		| 'coverPhotos'
		| 'emailAddresses'
		| 'events'
		| 'genders'
		| 'imClients'
		| 'interests'
		| 'locales'
		| 'memberships'
		| 'metadata'
		| 'names'
		| 'nicknames'
		| 'occupations'
		| 'organizations'
		| 'phoneNumbers'
		| 'photos'
		| 'relations'
		| 'residences'
		| 'sipAddresses'
		| 'skills'
		| 'urls'
		| 'userDefined'
	>;
	updateFields?: Record<string, unknown>;
};

export type GoogleContactsV1Params =
	| GoogleContactsV1ContactCreateConfig
	| GoogleContactsV1ContactDeleteConfig
	| GoogleContactsV1ContactGetConfig
	| GoogleContactsV1ContactGetAllConfig
	| GoogleContactsV1ContactUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleContactsV1Credentials {
	googleContactsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GoogleContactsNode = {
	type: 'n8n-nodes-base.googleContacts';
	version: 1;
	config: NodeConfig<GoogleContactsV1Params>;
	credentials?: GoogleContactsV1Credentials;
};
