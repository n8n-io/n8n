/**
 * X (Formerly Twitter) Node - Version 1
 * Consume Twitter API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a direct message */
export type TwitterV1DirectMessageCreateConfig = {
	resource: 'directMessage';
	operation: 'create';
/**
 * The ID of the user who should receive the direct message
 * @displayOptions.show { operation: ["create"], resource: ["directMessage"] }
 */
		userId: string | Expression<string>;
/**
 * The text of your Direct Message. URL encode as necessary. Max length of 10,000 characters.
 * @displayOptions.show { operation: ["create"], resource: ["directMessage"] }
 */
		text: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a direct message */
export type TwitterV1TweetCreateConfig = {
	resource: 'tweet';
	operation: 'create';
/**
 * The text of the status update. URL encode as necessary. t.co link wrapping will affect character counts.
 * @displayOptions.show { operation: ["create"], resource: ["tweet"] }
 */
		text: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a tweet */
export type TwitterV1TweetDeleteConfig = {
	resource: 'tweet';
	operation: 'delete';
/**
 * The ID of the tweet to delete
 * @displayOptions.show { operation: ["delete"], resource: ["tweet"] }
 */
		tweetId: string | Expression<string>;
};

/** Like a tweet */
export type TwitterV1TweetLikeConfig = {
	resource: 'tweet';
	operation: 'like';
/**
 * The ID of the tweet
 * @displayOptions.show { operation: ["like"], resource: ["tweet"] }
 */
		tweetId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Retweet a tweet */
export type TwitterV1TweetRetweetConfig = {
	resource: 'tweet';
	operation: 'retweet';
/**
 * The ID of the tweet
 * @displayOptions.show { operation: ["retweet"], resource: ["tweet"] }
 */
		tweetId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Search tweets */
export type TwitterV1TweetSearchConfig = {
	resource: 'tweet';
	operation: 'search';
/**
 * A UTF-8, URL-encoded search query of 500 characters maximum, including operators. Queries may additionally be limited by complexity. Check the searching examples &lt;a href="https://developer.twitter.com/en/docs/tweets/search/guides/standard-operators"&gt;here&lt;/a&gt;.
 * @displayOptions.show { operation: ["search"], resource: ["tweet"] }
 */
		searchText: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["search"], resource: ["tweet"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["search"], resource: ["tweet"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface TwitterV1Credentials {
	twitterOAuth1Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TwitterV1NodeBase {
	type: 'n8n-nodes-base.twitter';
	version: 1;
	credentials?: TwitterV1Credentials;
}

export type TwitterV1DirectMessageCreateNode = TwitterV1NodeBase & {
	config: NodeConfig<TwitterV1DirectMessageCreateConfig>;
};

export type TwitterV1TweetCreateNode = TwitterV1NodeBase & {
	config: NodeConfig<TwitterV1TweetCreateConfig>;
};

export type TwitterV1TweetDeleteNode = TwitterV1NodeBase & {
	config: NodeConfig<TwitterV1TweetDeleteConfig>;
};

export type TwitterV1TweetLikeNode = TwitterV1NodeBase & {
	config: NodeConfig<TwitterV1TweetLikeConfig>;
};

export type TwitterV1TweetRetweetNode = TwitterV1NodeBase & {
	config: NodeConfig<TwitterV1TweetRetweetConfig>;
};

export type TwitterV1TweetSearchNode = TwitterV1NodeBase & {
	config: NodeConfig<TwitterV1TweetSearchConfig>;
};

export type TwitterV1Node =
	| TwitterV1DirectMessageCreateNode
	| TwitterV1TweetCreateNode
	| TwitterV1TweetDeleteNode
	| TwitterV1TweetLikeNode
	| TwitterV1TweetRetweetNode
	| TwitterV1TweetSearchNode
	;