/**
 * Hacker News Node - Version 1
 * Consume Hacker News API
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


// ===========================================================================
// Output Types
// ===========================================================================

export type HackerNewsV1AllGetAllOutput = {
	_highlightResult?: {
		author?: {
			matchLevel?: string;
			value?: string;
		};
		title?: {
			fullyHighlighted?: boolean;
			matchedWords?: Array<string>;
			matchLevel?: string;
			value?: string;
		};
		url?: {
			fullyHighlighted?: boolean;
			matchedWords?: Array<string>;
			matchLevel?: string;
			value?: string;
		};
	};
	_tags?: Array<string>;
	author?: string;
	children?: Array<number>;
	created_at?: string;
	created_at_i?: number;
	num_comments?: number;
	objectID?: string;
	story_id?: number;
	title?: string;
	updated_at?: string;
	url?: string;
};

export type HackerNewsV1ArticleGetOutput = {
	author?: string;
	created_at?: string;
	created_at_i?: number;
	id?: number;
	story_id?: number;
	type?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

// ===========================================================================
// Node Types
// ===========================================================================

interface HackerNewsV1NodeBase {
	type: 'n8n-nodes-base.hackerNews';
	version: 1;
}

export type HackerNewsV1AllGetAllNode = HackerNewsV1NodeBase & {
	config: NodeConfig<HackerNewsV1AllGetAllConfig>;
	output?: HackerNewsV1AllGetAllOutput;
};

export type HackerNewsV1ArticleGetNode = HackerNewsV1NodeBase & {
	config: NodeConfig<HackerNewsV1ArticleGetConfig>;
	output?: HackerNewsV1ArticleGetOutput;
};

export type HackerNewsV1UserGetNode = HackerNewsV1NodeBase & {
	config: NodeConfig<HackerNewsV1UserGetConfig>;
};

export type HackerNewsV1Node =
	| HackerNewsV1AllGetAllNode
	| HackerNewsV1ArticleGetNode
	| HackerNewsV1UserGetNode
	;