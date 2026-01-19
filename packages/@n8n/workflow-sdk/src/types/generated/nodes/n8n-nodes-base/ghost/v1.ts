/**
 * Ghost Node - Version 1
 * Consume Ghost API
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface GhostV1Credentials {
	ghostAdminApi: CredentialReference;
	ghostContentApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface GhostV1NodeBase {
	type: 'n8n-nodes-base.ghost';
	version: 1;
	credentials?: GhostV1Credentials;
}

export type GhostV1PostGetNode = GhostV1NodeBase & {
	config: NodeConfig<GhostV1PostGetConfig>;
};

export type GhostV1PostGetAllNode = GhostV1NodeBase & {
	config: NodeConfig<GhostV1PostGetAllConfig>;
};

export type GhostV1Node =
	| GhostV1PostGetNode
	| GhostV1PostGetAllNode
	;