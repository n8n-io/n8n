/**
 * Ghost Node Types
 *
 * Consume Ghost API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/ghost/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

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
	 * @default id
	 */
	by: 'id' | 'slug' | Expression<string>;
	/**
	 * The ID or slug of the post to get
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type GhostV1Params = GhostV1PostGetConfig | GhostV1PostGetAllConfig;

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

export type GhostNode = {
	type: 'n8n-nodes-base.ghost';
	version: 1;
	config: NodeConfig<GhostV1Params>;
	credentials?: GhostV1Credentials;
};
