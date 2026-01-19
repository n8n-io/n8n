/**
 * X (Formerly Twitter) Node - Version 2
 * Post, like, and search tweets, send messages, search users, and add users to lists
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
	| TwitterV2UserSearchUserConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type TwitterV2TweetCreateOutput = {
	edit_history_tweet_ids?: Array<string>;
	id?: string;
	text?: string;
};

export type TwitterV2TweetDeleteOutput = {
	deleted?: boolean;
};

export type TwitterV2TweetLikeOutput = {
	liked?: boolean;
};

export type TwitterV2TweetRetweetOutput = {
	rest_id?: string;
	retweeted?: boolean;
};

export type TwitterV2TweetSearchOutput = {
	edit_history_tweet_ids?: Array<string>;
	id?: string;
	text?: string;
};

export type TwitterV2UserSearchUserOutput = {
	id?: string;
	name?: string;
	username?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface TwitterV2Credentials {
	twitterOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TwitterV2NodeBase {
	type: 'n8n-nodes-base.twitter';
	version: 2;
	credentials?: TwitterV2Credentials;
}

export type TwitterV2DirectMessageCreateNode = TwitterV2NodeBase & {
	config: NodeConfig<TwitterV2DirectMessageCreateConfig>;
};

export type TwitterV2ListAddNode = TwitterV2NodeBase & {
	config: NodeConfig<TwitterV2ListAddConfig>;
};

export type TwitterV2TweetCreateNode = TwitterV2NodeBase & {
	config: NodeConfig<TwitterV2TweetCreateConfig>;
	output?: TwitterV2TweetCreateOutput;
};

export type TwitterV2TweetDeleteNode = TwitterV2NodeBase & {
	config: NodeConfig<TwitterV2TweetDeleteConfig>;
	output?: TwitterV2TweetDeleteOutput;
};

export type TwitterV2TweetLikeNode = TwitterV2NodeBase & {
	config: NodeConfig<TwitterV2TweetLikeConfig>;
	output?: TwitterV2TweetLikeOutput;
};

export type TwitterV2TweetRetweetNode = TwitterV2NodeBase & {
	config: NodeConfig<TwitterV2TweetRetweetConfig>;
	output?: TwitterV2TweetRetweetOutput;
};

export type TwitterV2TweetSearchNode = TwitterV2NodeBase & {
	config: NodeConfig<TwitterV2TweetSearchConfig>;
	output?: TwitterV2TweetSearchOutput;
};

export type TwitterV2UserSearchUserNode = TwitterV2NodeBase & {
	config: NodeConfig<TwitterV2UserSearchUserConfig>;
	output?: TwitterV2UserSearchUserOutput;
};

export type TwitterV2Node =
	| TwitterV2DirectMessageCreateNode
	| TwitterV2ListAddNode
	| TwitterV2TweetCreateNode
	| TwitterV2TweetDeleteNode
	| TwitterV2TweetLikeNode
	| TwitterV2TweetRetweetNode
	| TwitterV2TweetSearchNode
	| TwitterV2UserSearchUserNode
	;