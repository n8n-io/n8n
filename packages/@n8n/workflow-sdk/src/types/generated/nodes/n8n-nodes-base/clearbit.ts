/**
 * Clearbit Node Types
 *
 * Consume Clearbit API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/clearbit/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** The Company API allows you to look up a company by their domain */
export type ClearbitV1CompanyAutocompleteConfig = {
	resource: 'company';
	operation: 'autocomplete';
	/**
	 * Name is the partial name of the company
	 */
	name: string | Expression<string>;
};

/** The Company API allows you to look up a company by their domain */
export type ClearbitV1CompanyEnrichConfig = {
	resource: 'company';
	operation: 'enrich';
	/**
	 * The domain to look up
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
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type ClearbitV1Params =
	| ClearbitV1CompanyAutocompleteConfig
	| ClearbitV1CompanyEnrichConfig
	| ClearbitV1PersonEnrichConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ClearbitV1Credentials {
	clearbitApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ClearbitV1Node = {
	type: 'n8n-nodes-base.clearbit';
	version: 1;
	config: NodeConfig<ClearbitV1Params>;
	credentials?: ClearbitV1Credentials;
};

export type ClearbitNode = ClearbitV1Node;
