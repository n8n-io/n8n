/**
 * Drift Node - Version 1
 * Consume Drift API
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface DriftV1Credentials {
	driftApi: CredentialReference;
	driftOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface DriftV1NodeBase {
	type: 'n8n-nodes-base.drift';
	version: 1;
	credentials?: DriftV1Credentials;
}

export type DriftV1ContactCreateNode = DriftV1NodeBase & {
	config: NodeConfig<DriftV1ContactCreateConfig>;
};

export type DriftV1ContactGetCustomAttributesNode = DriftV1NodeBase & {
	config: NodeConfig<DriftV1ContactGetCustomAttributesConfig>;
};

export type DriftV1ContactDeleteNode = DriftV1NodeBase & {
	config: NodeConfig<DriftV1ContactDeleteConfig>;
};

export type DriftV1ContactGetNode = DriftV1NodeBase & {
	config: NodeConfig<DriftV1ContactGetConfig>;
};

export type DriftV1ContactUpdateNode = DriftV1NodeBase & {
	config: NodeConfig<DriftV1ContactUpdateConfig>;
};

export type DriftV1Node =
	| DriftV1ContactCreateNode
	| DriftV1ContactGetCustomAttributesNode
	| DriftV1ContactDeleteNode
	| DriftV1ContactGetNode
	| DriftV1ContactUpdateNode
	;