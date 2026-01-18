/**
 * Okta Node Types
 *
 * Use the Okta API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/okta/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new user */
export type OktaV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	firstName: string | Expression<string>;
	lastName: string | Expression<string>;
	login: string | Expression<string>;
	email: string | Expression<string>;
	/**
	 * Whether to activate the user and allow access to all assigned applications
	 * @default true
	 */
	activate?: boolean | Expression<boolean>;
	getCreateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Delete an existing user */
export type OktaV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	/**
	 * The user you want to operate on. Choose from the list, or specify an ID.
	 * @default {"mode":"list","value":""}
	 */
	userId: ResourceLocatorValue;
	/**
	 * Whether to send a deactivation email to the administrator
	 * @default false
	 */
	sendEmail?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Get details of a user */
export type OktaV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * The user you want to operate on. Choose from the list, or specify an ID.
	 * @default {"mode":"list","value":""}
	 */
	userId: ResourceLocatorValue;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Get many users */
export type OktaV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	searchQuery?: string | Expression<string>;
	/**
	 * Max number of results to return
	 * @default 20
	 */
	limit?: number | Expression<number>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	requestOptions?: Record<string, unknown>;
};

/** Update an existing user */
export type OktaV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	/**
	 * The user you want to operate on. Choose from the list, or specify an ID.
	 * @default {"mode":"list","value":""}
	 */
	userId: ResourceLocatorValue;
	getUpdateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type OktaV1Params =
	| OktaV1UserCreateConfig
	| OktaV1UserDeleteConfig
	| OktaV1UserGetConfig
	| OktaV1UserGetAllConfig
	| OktaV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface OktaV1Credentials {
	oktaApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type OktaV1Node = {
	type: 'n8n-nodes-base.okta';
	version: 1;
	config: NodeConfig<OktaV1Params>;
	credentials?: OktaV1Credentials;
};

export type OktaNode = OktaV1Node;
