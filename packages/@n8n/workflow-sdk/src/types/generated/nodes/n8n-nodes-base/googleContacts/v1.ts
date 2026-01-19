/**
 * Google Contacts Node - Version 1
 * Consume Google Contacts API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { operation: ["get"], resource: ["contact"] }
 * @default []
 */
		fields?: Array<'*' | 'addresses' | 'biographies' | 'birthdays' | 'coverPhotos' | 'emailAddresses' | 'events' | 'genders' | 'imClients' | 'interests' | 'locales' | 'memberships' | 'metadata' | 'names' | 'nicknames' | 'occupations' | 'organizations' | 'phoneNumbers' | 'photos' | 'relations' | 'residences' | 'sipAddresses' | 'skills' | 'urls' | 'userDefined'>;
/**
 * Whether to return the data exactly in the way it got received from the API
 * @displayOptions.show { operation: ["get"], resource: ["contact"] }
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
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * A field mask to restrict which fields on each person are returned. Multiple fields can be specified by separating them with commas.
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"] }
 * @default []
 */
		fields?: Array<'*' | 'addresses' | 'biographies' | 'birthdays' | 'coverPhotos' | 'emailAddresses' | 'events' | 'genders' | 'imClients' | 'interests' | 'locales' | 'memberships' | 'metadata' | 'names' | 'nicknames' | 'occupations' | 'organizations' | 'phoneNumbers' | 'photos' | 'relations' | 'residences' | 'sipAddresses' | 'skills' | 'urls' | 'userDefined'>;
/**
 * Whether or not to use a query to filter the results
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"] }
 * @default false
 */
		useQuery?: boolean | Expression<boolean>;
/**
 * The plain-text query for the request. The query is used to match prefix phrases of the fields on a person. For example, a person with name "foo name" matches queries such as "f", "fo", "foo", "foo n", "nam", etc., but not "oo n".
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"], useQuery: [true] }
 */
		query?: string | Expression<string>;
/**
 * Whether to return the data exactly in the way it got received from the API
 * @displayOptions.show { operation: ["getAll"], resource: ["contact"] }
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
 * @displayOptions.show { operation: ["update"], resource: ["contact"] }
 * @default []
 */
		fields?: Array<'*' | 'addresses' | 'biographies' | 'birthdays' | 'coverPhotos' | 'emailAddresses' | 'events' | 'genders' | 'imClients' | 'interests' | 'locales' | 'memberships' | 'metadata' | 'names' | 'nicknames' | 'occupations' | 'organizations' | 'phoneNumbers' | 'photos' | 'relations' | 'residences' | 'sipAddresses' | 'skills' | 'urls' | 'userDefined'>;
	updateFields?: Record<string, unknown>;
};

export type GoogleContactsV1Params =
	| GoogleContactsV1ContactCreateConfig
	| GoogleContactsV1ContactDeleteConfig
	| GoogleContactsV1ContactGetConfig
	| GoogleContactsV1ContactGetAllConfig
	| GoogleContactsV1ContactUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GoogleContactsV1Credentials {
	googleContactsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GoogleContactsV1NodeBase {
	type: 'n8n-nodes-base.googleContacts';
	version: 1;
	credentials?: GoogleContactsV1Credentials;
}

export type GoogleContactsV1ContactCreateNode = GoogleContactsV1NodeBase & {
	config: NodeConfig<GoogleContactsV1ContactCreateConfig>;
};

export type GoogleContactsV1ContactDeleteNode = GoogleContactsV1NodeBase & {
	config: NodeConfig<GoogleContactsV1ContactDeleteConfig>;
};

export type GoogleContactsV1ContactGetNode = GoogleContactsV1NodeBase & {
	config: NodeConfig<GoogleContactsV1ContactGetConfig>;
};

export type GoogleContactsV1ContactGetAllNode = GoogleContactsV1NodeBase & {
	config: NodeConfig<GoogleContactsV1ContactGetAllConfig>;
};

export type GoogleContactsV1ContactUpdateNode = GoogleContactsV1NodeBase & {
	config: NodeConfig<GoogleContactsV1ContactUpdateConfig>;
};

export type GoogleContactsV1Node =
	| GoogleContactsV1ContactCreateNode
	| GoogleContactsV1ContactDeleteNode
	| GoogleContactsV1ContactGetNode
	| GoogleContactsV1ContactGetAllNode
	| GoogleContactsV1ContactUpdateNode
	;