/**
 * Gong Node - Version 1
 * Interact with Gong API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Retrieve data for a specific call */
export type GongV1CallGetConfig = {
	resource: 'call';
	operation: 'get';
	call: ResourceLocatorValue;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of calls */
export type GongV1CallGetAllConfig = {
	resource: 'call';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["call"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["call"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve data for a specific call */
export type GongV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	user: ResourceLocatorValue;
	requestOptions?: Record<string, unknown>;
};

/** Retrieve a list of calls */
export type GongV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type GongV1Params =
	| GongV1CallGetConfig
	| GongV1CallGetAllConfig
	| GongV1UserGetConfig
	| GongV1UserGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GongV1Credentials {
	gongApi: CredentialReference;
	gongOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GongV1Node = {
	type: 'n8n-nodes-base.gong';
	version: 1;
	config: NodeConfig<GongV1Params>;
	credentials?: GongV1Credentials;
};