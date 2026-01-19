/**
 * Uplead Node - Version 1
 * Consume Uplead API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Company API lets you lookup company data via a domain name or company name */
export type UpleadV1CompanyEnrichConfig = {
	resource: 'company';
	operation: 'enrich';
/**
 * The name of the company (e.g – amazon)
 * @displayOptions.show { resource: ["company"], operation: ["enrich"] }
 */
		company?: string | Expression<string>;
/**
 * The domain name (e.g – amazon.com)
 * @displayOptions.show { resource: ["company"], operation: ["enrich"] }
 */
		domain?: string | Expression<string>;
};

/** Person API lets you lookup a person based on an email address OR based on a domain name + first name + last name */
export type UpleadV1PersonEnrichConfig = {
	resource: 'person';
	operation: 'enrich';
/**
 * Email address (e.g – mbenioff@salesforce.com)
 * @displayOptions.show { resource: ["person"], operation: ["enrich"] }
 */
		email?: string | Expression<string>;
/**
 * First name of the person (e.g – Marc)
 * @displayOptions.show { resource: ["person"], operation: ["enrich"] }
 */
		firstname?: string | Expression<string>;
/**
 * Last name of the person (e.g – Benioff)
 * @displayOptions.show { resource: ["person"], operation: ["enrich"] }
 */
		lastname?: string | Expression<string>;
/**
 * The domain name (e.g – salesforce.com)
 * @displayOptions.show { resource: ["person"], operation: ["enrich"] }
 */
		domain?: string | Expression<string>;
};

export type UpleadV1Params =
	| UpleadV1CompanyEnrichConfig
	| UpleadV1PersonEnrichConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface UpleadV1Credentials {
	upleadApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface UpleadV1NodeBase {
	type: 'n8n-nodes-base.uplead';
	version: 1;
	credentials?: UpleadV1Credentials;
}

export type UpleadV1CompanyEnrichNode = UpleadV1NodeBase & {
	config: NodeConfig<UpleadV1CompanyEnrichConfig>;
};

export type UpleadV1PersonEnrichNode = UpleadV1NodeBase & {
	config: NodeConfig<UpleadV1PersonEnrichConfig>;
};

export type UpleadV1Node =
	| UpleadV1CompanyEnrichNode
	| UpleadV1PersonEnrichNode
	;