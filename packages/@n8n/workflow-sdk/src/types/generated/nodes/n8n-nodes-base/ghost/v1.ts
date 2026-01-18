/**
 * Ghost Node - Version 1
 * Consume Ghost API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get a post */
export type GhostV1PostGetConfig = {
	resource: 'post';
	operation: 'get';
/**
 * Pick where your data comes from, Content or Admin API
 * @default contentApi
 */
		source?: 'adminApi' | 'contentApi' | Expression<string>;
/**
 * Get the post either by slug or ID
 * @displayOptions.show { source: ["contentApi", "adminApi"], resource: ["post"], operation: ["get"] }
 * @default id
 */
		by: 'id' | 'slug' | Expression<string>;
/**
 * The ID or slug of the post to get
 * @displayOptions.show { source: ["contentApi", "adminApi"], resource: ["post"], operation: ["get"] }
 */
		identifier: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many posts */
export type GhostV1PostGetAllConfig = {
	resource: 'post';
	operation: 'getAll';
/**
 * Pick where your data comes from, Content or Admin API
 * @default contentApi
 */
		source?: 'adminApi' | 'contentApi' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { source: ["contentApi", "adminApi"], resource: ["post"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { source: ["adminApi", "contentApi"], resource: ["post"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type GhostV1Params =
	| GhostV1PostGetConfig
	| GhostV1PostGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface GhostV1Credentials {
	ghostAdminApi: CredentialReference;
	ghostContentApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type GhostV1Node = {
	type: 'n8n-nodes-base.ghost';
	version: 1;
	config: NodeConfig<GhostV1Params>;
	credentials?: GhostV1Credentials;
};