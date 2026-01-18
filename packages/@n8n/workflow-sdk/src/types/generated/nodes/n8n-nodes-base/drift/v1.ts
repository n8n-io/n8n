/**
 * Drift Node - Version 1
 * Consume Drift API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a contact */
export type DriftV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
/**
 * The email of the contact
 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
 */
		email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get custom attributes */
export type DriftV1ContactGetCustomAttributesConfig = {
	resource: 'contact';
	operation: 'getCustomAttributes';
};

/** Delete a contact */
export type DriftV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
/**
 * Unique identifier for the contact
 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
 */
		contactId: string | Expression<string>;
};

/** Get a contact */
export type DriftV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * Unique identifier for the contact
 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
 */
		contactId: string | Expression<string>;
};

/** Update a contact */
export type DriftV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
/**
 * Unique identifier for the contact
 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
 */
		contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type DriftV1Params =
	| DriftV1ContactCreateConfig
	| DriftV1ContactGetCustomAttributesConfig
	| DriftV1ContactDeleteConfig
	| DriftV1ContactGetConfig
	| DriftV1ContactUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface DriftV1Credentials {
	driftApi: CredentialReference;
	driftOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type DriftV1Node = {
	type: 'n8n-nodes-base.drift';
	version: 1;
	config: NodeConfig<DriftV1Params>;
	credentials?: DriftV1Credentials;
};