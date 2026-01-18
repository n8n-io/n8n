/**
 * X (Formerly Twitter) Node Types
 *
 * Post, like, and search tweets, send messages, search users, and add users to lists
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/twitter/
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

/** Send a direct message to a user */
export type TwitterV2DirectMessageCreateConfig = {
	resource: 'directMessage';
	operation: 'create';
	/**
	 * The user you want to send the message to
	 * @displayOptions.show { operation: ["create"], resource: ["directMessage"] }
	 * @default {"mode":"username","value":""}
	 */
	user: ResourceLocatorValue;
	/**
	 * The text of the direct message. URL encoding is required. Max length of 10,000 characters.
	 * @displayOptions.show { operation: ["create"], resource: ["directMessage"] }
	 */
	text: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Add a user to a list */
export type TwitterV2ListAddConfig = {
	resource: 'list';
	operation: 'add';
	/**
	 * The list you want to add the user to
	 * @displayOptions.show { operation: ["add"], resource: ["list"] }
	 * @default {"mode":"id","value":""}
	 */
	list: ResourceLocatorValue;
	/**
	 * The user you want to add to the list
	 * @displayOptions.show { operation: ["add"], resource: ["list"] }
	 * @default {"mode":"username","value":""}
	 */
	user: ResourceLocatorValue;
};

/** Create, like, search, or delete a tweet */
export type TwitterV2TweetCreateConfig = {
	resource: 'tweet';
	operation: 'create';
	/**
	 * The text of the status update. URLs must be encoded. Links wrapped with the t.co shortener will affect character count
	 * @displayOptions.show { operation: ["create"], resource: ["tweet"] }
	 */
	text: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create, like, search, or delete a tweet */
export type TwitterV2TweetDeleteConfig = {
	resource: 'tweet';
	operation: 'delete';
	/**
	 * The tweet to delete
	 * @displayOptions.show { resource: ["tweet"], operation: ["delete"] }
	 * @default {"mode":"id","value":""}
	 */
	tweetDeleteId: ResourceLocatorValue;
};

/** Create, like, search, or delete a tweet */
export type TwitterV2TweetLikeConfig = {
	resource: 'tweet';
	operation: 'like';
	/**
	 * The tweet to like
	 * @displayOptions.show { operation: ["like"], resource: ["tweet"] }
	 * @default {"mode":"id","value":""}
	 */
	tweetId: ResourceLocatorValue;
};

/** Create, like, search, or delete a tweet */
export type TwitterV2TweetRetweetConfig = {
	resource: 'tweet';
	operation: 'retweet';
	/**
	 * The tweet to retweet
	 * @displayOptions.show { operation: ["retweet"], resource: ["tweet"] }
	 * @default {"mode":"id","value":""}
	 */
	tweetId: ResourceLocatorValue;
};

/** Create, like, search, or delete a tweet */
export type TwitterV2TweetSearchConfig = {
	resource: 'tweet';
	operation: 'search';
	/**
	 * A UTF-8, URL-encoded search query of 500 characters maximum, including operators. Queries may additionally be limited by complexity. Check the searching examples &lt;a href="https://developer.twitter.com/en/docs/tweets/search/guides/standard-operators"&gt;here&lt;/a&gt;.
	 * @displayOptions.show { operation: ["search"], resource: ["tweet"] }
	 */
	searchText: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["tweet"], operation: ["search"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["tweet"], operation: ["search"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Search users by username */
export type TwitterV2UserSearchUserConfig = {
	resource: 'user';
	operation: 'searchUser';
	/**
	 * The user you want to search
	 * @displayOptions.show { operation: ["searchUser"], resource: ["user"] }
	 * @displayOptions.hide { me: [true] }
	 * @default {"mode":"username","value":""}
	 */
	user: ResourceLocatorValue;
	/**
	 * Whether you want to search the authenticated user
	 * @displayOptions.show { operation: ["searchUser"], resource: ["user"] }
	 * @default false
	 */
	me?: boolean | Expression<boolean>;
};

export type TwitterV2Params =
	| TwitterV2DirectMessageCreateConfig
	| TwitterV2ListAddConfig
	| TwitterV2TweetCreateConfig
	| TwitterV2TweetDeleteConfig
	| TwitterV2TweetLikeConfig
	| TwitterV2TweetRetweetConfig
	| TwitterV2TweetSearchConfig
	| TwitterV2UserSearchUserConfig;

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

export type TwitterV1Params =
	| TwitterV1DirectMessageCreateConfig
	| TwitterV1TweetCreateConfig
	| TwitterV1TweetDeleteConfig
	| TwitterV1TweetLikeConfig
	| TwitterV1TweetRetweetConfig
	| TwitterV1TweetSearchConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TwitterV2Credentials {
	twitterOAuth2Api: CredentialReference;
}

export interface TwitterV1Credentials {
	twitterOAuth1Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type TwitterV2Node = {
	type: 'n8n-nodes-base.twitter';
	version: 2;
	config: NodeConfig<TwitterV2Params>;
	credentials?: TwitterV2Credentials;
};

export type TwitterV1Node = {
	type: 'n8n-nodes-base.twitter';
	version: 1;
	config: NodeConfig<TwitterV1Params>;
	credentials?: TwitterV1Credentials;
};

export type TwitterNode = TwitterV2Node | TwitterV1Node;
