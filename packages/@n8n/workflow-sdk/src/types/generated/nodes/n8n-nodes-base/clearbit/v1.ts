/**
 * Clearbit Node - Version 1
 * Consume Clearbit API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** The Company API allows you to look up a company by their domain */
export type ClearbitV1CompanyAutocompleteConfig = {
	resource: 'company';
	operation: 'autocomplete';
/**
 * Name is the partial name of the company
 * @displayOptions.show { resource: ["company"], operation: ["autocomplete"] }
 */
		name: string | Expression<string>;
};

/** The Company API allows you to look up a company by their domain */
export type ClearbitV1CompanyEnrichConfig = {
	resource: 'company';
	operation: 'enrich';
/**
 * The domain to look up
 * @displayOptions.show { resource: ["company"], operation: ["enrich"] }
 */
		domain: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** The Person API lets you retrieve social information associated with an email address, such as a person’s name, location and Twitter handle */
export type ClearbitV1PersonEnrichConfig = {
	resource: 'person';
	operation: 'enrich';
/**
 * The email address to look up
 * @displayOptions.show { resource: ["person"], operation: ["enrich"] }
 */
		email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type ClearbitV1CompanyAutocompleteOutput = {
	domain?: string;
	name?: string;
};

export type ClearbitV1PersonEnrichOutput = {
	bio?: null;
	email?: string;
	emailProvider?: boolean;
	employment?: {
		domain?: string;
		name?: string;
	};
	facebook?: {
		handle?: null;
	};
	fuzzy?: boolean;
	googleplus?: {
		handle?: null;
	};
	gravatar?: {
		avatars?: Array<{
			type?: string;
			url?: string;
		}>;
	};
	id?: string;
	inactiveAt?: null;
	indexedAt?: string;
	name?: {
		familyName?: string;
		fullName?: string;
		givenName?: string;
	};
	site?: null;
	twitter?: {
		avatar?: null;
		bio?: null;
		favorites?: null;
		followers?: null;
		following?: null;
		handle?: null;
		id?: null;
		location?: null;
		site?: null;
		statuses?: null;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ClearbitV1Credentials {
	clearbitApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ClearbitV1NodeBase {
	type: 'n8n-nodes-base.clearbit';
	version: 1;
	credentials?: ClearbitV1Credentials;
}

export type ClearbitV1CompanyAutocompleteNode = ClearbitV1NodeBase & {
	config: NodeConfig<ClearbitV1CompanyAutocompleteConfig>;
	output?: ClearbitV1CompanyAutocompleteOutput;
};

export type ClearbitV1CompanyEnrichNode = ClearbitV1NodeBase & {
	config: NodeConfig<ClearbitV1CompanyEnrichConfig>;
};

export type ClearbitV1PersonEnrichNode = ClearbitV1NodeBase & {
	config: NodeConfig<ClearbitV1PersonEnrichConfig>;
	output?: ClearbitV1PersonEnrichOutput;
};

export type ClearbitV1Node =
	| ClearbitV1CompanyAutocompleteNode
	| ClearbitV1CompanyEnrichNode
	| ClearbitV1PersonEnrichNode
	;