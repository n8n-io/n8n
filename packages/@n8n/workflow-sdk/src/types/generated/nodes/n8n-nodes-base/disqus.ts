/**
 * Disqus Node Types
 *
 * Access data on Disqus
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/disqus/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Return forum details */
export type DisqusV1ForumGetConfig = {
	resource: 'forum';
	operation: 'get';
	/**
	 * The short name(aka ID) of the forum to get
	 */
	id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Return a list of categories within a forum */
export type DisqusV1ForumGetCategoriesConfig = {
	resource: 'forum';
	operation: 'getCategories';
	/**
	 * The short name(aka ID) of the forum to get Categories
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Return a list of threads within a forum */
export type DisqusV1ForumGetThreadsConfig = {
	resource: 'forum';
	operation: 'getThreads';
	/**
	 * The short name(aka ID) of the forum to get Threads
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Return a list of posts within a forum */
export type DisqusV1ForumGetPostsConfig = {
	resource: 'forum';
	operation: 'getPosts';
	/**
	 * The short name(aka ID) of the forum to get
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type DisqusV1Params =
	| DisqusV1ForumGetConfig
	| DisqusV1ForumGetCategoriesConfig
	| DisqusV1ForumGetThreadsConfig
	| DisqusV1ForumGetPostsConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface DisqusV1Credentials {
	disqusApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type DisqusV1Node = {
	type: 'n8n-nodes-base.disqus';
	version: 1;
	config: NodeConfig<DisqusV1Params>;
	credentials?: DisqusV1Credentials;
};

export type DisqusNode = DisqusV1Node;
