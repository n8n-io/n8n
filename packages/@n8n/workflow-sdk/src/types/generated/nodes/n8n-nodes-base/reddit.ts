/**
 * Reddit Node Types
 *
 * Consume the Reddit API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/reddit/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a top-level comment in a post */
export type RedditV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
	/**
	 * Subreddit to create the post in
	 */
	subreddit: string | Expression<string>;
	/**
	 * The kind of the post to create
	 * @default self
	 */
	kind?: 'self' | 'link' | 'image' | Expression<string>;
	/**
	 * Title of the post, up to 300 characters long
	 */
	title: string | Expression<string>;
	/**
	 * URL of the post
	 */
	url: string | Expression<string>;
	/**
	 * Text of the post. Markdown supported.
	 */
	text: string | Expression<string>;
	/**
	 * Whether the URL will be posted even if it was already posted to the subreddit before. Otherwise, the re-posting will trigger an error.
	 * @default false
	 */
	resubmit?: boolean | Expression<boolean>;
};

/** Remove a comment from a post */
export type RedditV1PostDeleteConfig = {
	resource: 'post';
	operation: 'delete';
	/**
	 * ID of the post to delete. Found in the post URL: &lt;code&gt;/r/[subreddit_name]/comments/[post_id]/[post_title]&lt;/code&gt;
	 */
	postId: string | Expression<string>;
};

export type RedditV1PostGetConfig = {
	resource: 'post';
	operation: 'get';
	/**
	 * The name of subreddit to retrieve the post from
	 */
	subreddit: string | Expression<string>;
	/**
	 * ID of the post to retrieve. Found in the post URL: &lt;code&gt;/r/[subreddit_name]/comments/[post_id]/[post_title]&lt;/code&gt;
	 */
	postId: string | Expression<string>;
};

/** Retrieve many comments in a post */
export type RedditV1PostGetAllConfig = {
	resource: 'post';
	operation: 'getAll';
	/**
	 * The name of subreddit to retrieve the posts from
	 */
	subreddit: string | Expression<string>;
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
	filters?: Record<string, unknown>;
};

/** Search posts in a subreddit or in all of Reddit */
export type RedditV1PostSearchConfig = {
	resource: 'post';
	operation: 'search';
	/**
	 * Location where to search for posts
	 * @default subreddit
	 */
	location?: 'allReddit' | 'subreddit' | Expression<string>;
	/**
	 * The name of subreddit to search in
	 */
	subreddit: string | Expression<string>;
	/**
	 * The keyword for the search
	 */
	keyword: string | Expression<string>;
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

/** Create a top-level comment in a post */
export type RedditV1PostCommentCreateConfig = {
	resource: 'postComment';
	operation: 'create';
	/**
	 * ID of the post to write the comment to. Found in the post URL: &lt;code&gt;/r/[subreddit_name]/comments/[post_id]/[post_title]&lt;/code&gt;
	 */
	postId: string | Expression<string>;
	/**
	 * Text of the comment. Markdown supported.
	 */
	commentText: string | Expression<string>;
};

/** Retrieve many comments in a post */
export type RedditV1PostCommentGetAllConfig = {
	resource: 'postComment';
	operation: 'getAll';
	/**
	 * The name of subreddit where the post is
	 */
	subreddit: string | Expression<string>;
	/**
	 * ID of the post to get all comments from. Found in the post URL: &lt;code&gt;/r/[subreddit_name]/comments/[post_id]/[post_title]&lt;/code&gt;
	 */
	postId: string | Expression<string>;
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
};

/** Remove a comment from a post */
export type RedditV1PostCommentDeleteConfig = {
	resource: 'postComment';
	operation: 'delete';
	/**
	 * ID of the comment to remove. Found in the comment URL:&lt;code&gt;/r/[subreddit_name]/comments/[post_id]/[post_title]/[comment_id]&lt;/code&gt;
	 */
	commentId: string | Expression<string>;
};

/** Write a reply to a comment in a post */
export type RedditV1PostCommentReplyConfig = {
	resource: 'postComment';
	operation: 'reply';
	/**
	 * ID of the comment to reply to. To be found in the comment URL: &lt;code&gt;www.reddit.com/r/[subreddit_name]/comments/[post_id]/[post_title]/[comment_id]&lt;/code&gt;
	 */
	commentId: string | Expression<string>;
	/**
	 * Text of the reply. Markdown supported.
	 */
	replyText: string | Expression<string>;
};

export type RedditV1ProfileGetConfig = {
	resource: 'profile';
	operation: 'get';
	/**
	 * Details of my account to retrieve
	 * @default identity
	 */
	details:
		| 'blockedUsers'
		| 'friends'
		| 'identity'
		| 'karma'
		| 'prefs'
		| 'saved'
		| 'trophies'
		| Expression<string>;
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
};

export type RedditV1SubredditGetConfig = {
	resource: 'subreddit';
	operation: 'get';
	/**
	 * Subreddit content to retrieve
	 * @default about
	 */
	content: 'about' | 'rules' | Expression<string>;
	/**
	 * The name of subreddit to retrieve the content from
	 */
	subreddit: string | Expression<string>;
};

/** Retrieve many comments in a post */
export type RedditV1SubredditGetAllConfig = {
	resource: 'subreddit';
	operation: 'getAll';
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
	filters?: Record<string, unknown>;
};

export type RedditV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * Reddit ID of the user to retrieve
	 */
	username: string | Expression<string>;
	/**
	 * Details of the user to retrieve
	 * @default about
	 */
	details: 'about' | 'comments' | 'gilded' | 'overview' | 'submitted' | Expression<string>;
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
};

export type RedditV1Params =
	| RedditV1PostCreateConfig
	| RedditV1PostDeleteConfig
	| RedditV1PostGetConfig
	| RedditV1PostGetAllConfig
	| RedditV1PostSearchConfig
	| RedditV1PostCommentCreateConfig
	| RedditV1PostCommentGetAllConfig
	| RedditV1PostCommentDeleteConfig
	| RedditV1PostCommentReplyConfig
	| RedditV1ProfileGetConfig
	| RedditV1SubredditGetConfig
	| RedditV1SubredditGetAllConfig
	| RedditV1UserGetConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface RedditV1Credentials {
	redditOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type RedditNode = {
	type: 'n8n-nodes-base.reddit';
	version: 1;
	config: NodeConfig<RedditV1Params>;
	credentials?: RedditV1Credentials;
};
