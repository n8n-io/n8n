/**
 * Disqus Node - Version 1
 * Access data on Disqus
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Return forum details */
export type DisqusV1ForumGetConfig = {
	resource: 'forum';
	operation: 'get';
/**
 * The short name(aka ID) of the forum to get
 * @displayOptions.show { operation: ["get"], resource: ["forum"] }
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
 * @displayOptions.show { operation: ["getCategories"], resource: ["forum"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["forum"], operation: ["getCategories"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["forum"], operation: ["getCategories"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["getThreads"], resource: ["forum"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["forum"], operation: ["getThreads"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["forum"], operation: ["getThreads"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["getPosts"], resource: ["forum"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["forum"], operation: ["getPosts"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["forum"], operation: ["getPosts"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

export type DisqusV1Params =
	| DisqusV1ForumGetConfig
	| DisqusV1ForumGetCategoriesConfig
	| DisqusV1ForumGetThreadsConfig
	| DisqusV1ForumGetPostsConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface DisqusV1Credentials {
	disqusApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface DisqusV1NodeBase {
	type: 'n8n-nodes-base.disqus';
	version: 1;
	credentials?: DisqusV1Credentials;
}

export type DisqusV1ForumGetNode = DisqusV1NodeBase & {
	config: NodeConfig<DisqusV1ForumGetConfig>;
};

export type DisqusV1ForumGetCategoriesNode = DisqusV1NodeBase & {
	config: NodeConfig<DisqusV1ForumGetCategoriesConfig>;
};

export type DisqusV1ForumGetThreadsNode = DisqusV1NodeBase & {
	config: NodeConfig<DisqusV1ForumGetThreadsConfig>;
};

export type DisqusV1ForumGetPostsNode = DisqusV1NodeBase & {
	config: NodeConfig<DisqusV1ForumGetPostsConfig>;
};

export type DisqusV1Node =
	| DisqusV1ForumGetNode
	| DisqusV1ForumGetCategoriesNode
	| DisqusV1ForumGetThreadsNode
	| DisqusV1ForumGetPostsNode
	;