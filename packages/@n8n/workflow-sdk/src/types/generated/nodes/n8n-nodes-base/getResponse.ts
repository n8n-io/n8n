/**
 * GetResponse Node Types
 *
 * Consume GetResponse API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/getresponse/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new contact */
export type GetResponseV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	email?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
	 */
	campaignId?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type GetResponseV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * ID of contact to delete
	 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
	 */
	contactId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get a contact */
export type GetResponseV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * Unique identifier for a particular contact
	 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
	 */
	contactId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many contacts */
export type GetResponseV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
	 * @default 20
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update contact properties */
export type GetResponseV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * Unique identifier for a particular contact
	 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
	 */
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type GetResponseV1Params =
	| GetResponseV1ContactCreateConfig
	| GetResponseV1ContactDeleteConfig
	| GetResponseV1ContactGetConfig
	| GetResponseV1ContactGetAllConfig
	| GetResponseV1ContactUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GetResponseV1Credentials {
	getResponseApi: CredentialReference;
	getResponseOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type GetResponseV1Node = {
	type: 'n8n-nodes-base.getResponse';
	version: 1;
	config: NodeConfig<GetResponseV1Params>;
	credentials?: GetResponseV1Credentials;
};

export type GetResponseNode = GetResponseV1Node;
