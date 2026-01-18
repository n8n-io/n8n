/**
 * Uplead Node Types
 *
 * Consume Uplead API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/uplead/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Company API lets you lookup company data via a domain name or company name */
export type UpleadV1CompanyEnrichConfig = {
	resource: 'company';
	operation: 'enrich';
	/**
	 * The name of the company (e.g – amazon)
	 */
	company?: string | Expression<string>;
	/**
	 * The domain name (e.g – amazon.com)
	 */
	domain?: string | Expression<string>;
};

/** Person API lets you lookup a person based on an email address OR based on a domain name + first name + last name */
export type UpleadV1PersonEnrichConfig = {
	resource: 'person';
	operation: 'enrich';
	/**
	 * Email address (e.g – mbenioff@salesforce.com)
	 */
	email?: string | Expression<string>;
	/**
	 * First name of the person (e.g – Marc)
	 */
	firstname?: string | Expression<string>;
	/**
	 * Last name of the person (e.g – Benioff)
	 */
	lastname?: string | Expression<string>;
	/**
	 * The domain name (e.g – salesforce.com)
	 */
	domain?: string | Expression<string>;
};

export type UpleadV1Params = UpleadV1CompanyEnrichConfig | UpleadV1PersonEnrichConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface UpleadV1Credentials {
	upleadApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type UpleadV1Node = {
	type: 'n8n-nodes-base.uplead';
	version: 1;
	config: NodeConfig<UpleadV1Params>;
	credentials?: UpleadV1Credentials;
};

export type UpleadNode = UpleadV1Node;
