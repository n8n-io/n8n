/**
 * Hacker News Node - Version 1
 * Consume Hacker News API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Get many items */
export type HackerNewsV1AllGetAllConfig = {
	resource: 'all';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["all"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["all"], operation: ["getAll"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get a Hacker News article */
export type HackerNewsV1ArticleGetConfig = {
	resource: 'article';
	operation: 'get';
/**
 * The ID of the Hacker News article to be returned
 * @displayOptions.show { resource: ["article"], operation: ["get"] }
 */
		articleId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get a Hacker News article */
export type HackerNewsV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * The Hacker News user to be returned
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		username: string | Expression<string>;
};

export type HackerNewsV1Params =
	| HackerNewsV1AllGetAllConfig
	| HackerNewsV1ArticleGetConfig
	| HackerNewsV1UserGetConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Type
// ===========================================================================

export type HackerNewsV1Node = {
	type: 'n8n-nodes-base.hackerNews';
	version: 1;
	config: NodeConfig<HackerNewsV1Params>;
	credentials?: Record<string, never>;
};