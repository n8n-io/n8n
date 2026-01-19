/**
 * Reddit Node - Version 1
 * Consume the Reddit API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a top-level comment in a post */
export type RedditV1PostCreateConfig = {
	resource: 'post';
	operation: 'create';
/**
 * Subreddit to create the post in
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 */
		subreddit: string | Expression<string>;
/**
 * The kind of the post to create
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 * @default self
 */
		kind?: 'self' | 'link' | 'image' | Expression<string>;
/**
 * Title of the post, up to 300 characters long
 * @displayOptions.show { resource: ["post"], operation: ["create"] }
 */
		title: string | Expression<string>;
/**
 * URL of the post
 * @displayOptions.show { resource: ["post"], operation: ["create"], kind: ["link", "image"] }
 */
		url: string | Expression<string>;
/**
 * Text of the post. Markdown supported.
 * @displayOptions.show { resource: ["post"], operation: ["create"], kind: ["self"] }
 */
		text: string | Expression<string>;
/**
 * Whether the URL will be posted even if it was already posted to the subreddit before. Otherwise, the re-posting will trigger an error.
 * @displayOptions.show { resource: ["post"], operation: ["create"], kind: ["link", "image"] }
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
 * @displayOptions.show { resource: ["post"], operation: ["delete"] }
 */
		postId: string | Expression<string>;
};

export type RedditV1PostGetConfig = {
	resource: 'post';
	operation: 'get';
/**
 * The name of subreddit to retrieve the post from
 * @displayOptions.show { resource: ["post"], operation: ["get"] }
 */
		subreddit: string | Expression<string>;
/**
 * ID of the post to retrieve. Found in the post URL: &lt;code&gt;/r/[subreddit_name]/comments/[post_id]/[post_title]&lt;/code&gt;
 * @displayOptions.show { resource: ["post"], operation: ["get"] }
 */
		postId: string | Expression<string>;
};

/** Retrieve many comments in a post */
export type RedditV1PostGetAllConfig = {
	resource: 'post';
	operation: 'getAll';
/**
 * The name of subreddit to retrieve the posts from
 * @displayOptions.show { resource: ["post"], operation: ["getAll"] }
 */
		subreddit: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["post"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["post"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["post"], operation: ["search"] }
 * @default subreddit
 */
		location?: 'allReddit' | 'subreddit' | Expression<string>;
/**
 * The name of subreddit to search in
 * @displayOptions.show { resource: ["post"], operation: ["search"], location: ["subreddit"] }
 */
		subreddit: string | Expression<string>;
/**
 * The keyword for the search
 * @displayOptions.show { resource: ["post"], operation: ["search"] }
 */
		keyword: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["post"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["post"], operation: ["search"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["postComment"], operation: ["create"] }
 */
		postId: string | Expression<string>;
/**
 * Text of the comment. Markdown supported.
 * @displayOptions.show { resource: ["postComment"], operation: ["create"] }
 */
		commentText: string | Expression<string>;
};

/** Retrieve many comments in a post */
export type RedditV1PostCommentGetAllConfig = {
	resource: 'postComment';
	operation: 'getAll';
/**
 * The name of subreddit where the post is
 * @displayOptions.show { resource: ["postComment"], operation: ["getAll"] }
 */
		subreddit: string | Expression<string>;
/**
 * ID of the post to get all comments from. Found in the post URL: &lt;code&gt;/r/[subreddit_name]/comments/[post_id]/[post_title]&lt;/code&gt;
 * @displayOptions.show { resource: ["postComment"], operation: ["getAll"] }
 */
		postId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["postComment"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["postComment"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["postComment"], operation: ["delete"] }
 */
		commentId: string | Expression<string>;
};

/** Write a reply to a comment in a post */
export type RedditV1PostCommentReplyConfig = {
	resource: 'postComment';
	operation: 'reply';
/**
 * ID of the comment to reply to. To be found in the comment URL: &lt;code&gt;www.reddit.com/r/[subreddit_name]/comments/[post_id]/[post_title]/[comment_id]&lt;/code&gt;
 * @displayOptions.show { resource: ["postComment"], operation: ["reply"] }
 */
		commentId: string | Expression<string>;
/**
 * Text of the reply. Markdown supported.
 * @displayOptions.show { resource: ["postComment"], operation: ["reply"] }
 */
		replyText: string | Expression<string>;
};

export type RedditV1ProfileGetConfig = {
	resource: 'profile';
	operation: 'get';
/**
 * Details of my account to retrieve
 * @displayOptions.show { resource: ["profile"], operation: ["get"] }
 * @default identity
 */
		details: 'blockedUsers' | 'friends' | 'identity' | 'karma' | 'prefs' | 'saved' | 'trophies' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["profile"], operation: ["get"], details: ["saved"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["profile"], operation: ["get"], details: ["saved"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type RedditV1SubredditGetConfig = {
	resource: 'subreddit';
	operation: 'get';
/**
 * Subreddit content to retrieve
 * @displayOptions.show { resource: ["subreddit"], operation: ["get"] }
 * @default about
 */
		content: 'about' | 'rules' | Expression<string>;
/**
 * The name of subreddit to retrieve the content from
 * @displayOptions.show { resource: ["subreddit"], operation: ["get"] }
 */
		subreddit: string | Expression<string>;
};

/** Retrieve many comments in a post */
export type RedditV1SubredditGetAllConfig = {
	resource: 'subreddit';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["subreddit"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["subreddit"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 */
		username: string | Expression<string>;
/**
 * Details of the user to retrieve
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 * @default about
 */
		details: 'about' | 'comments' | 'gilded' | 'overview' | 'submitted' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["get"], details: ["overview", "submitted", "comments", "gilded"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["get"], details: ["comments", "gilded", "overview", "submitted"], returnAll: [false] }
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
	| RedditV1UserGetConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type RedditV1PostCreateOutput = {
	drafts_count?: number;
	id?: string;
	name?: string;
	url?: string;
};

export type RedditV1PostDeleteOutput = {
	success?: boolean;
};

export type RedditV1PostGetOutput = {
	allow_live_comments?: boolean;
	approved_at_utc?: null;
	approved_by?: null;
	archived?: boolean;
	author?: string;
	author_flair_richtext?: Array<{
		a?: string;
		e?: string;
		t?: string;
		u?: string;
	}>;
	author_flair_type?: string;
	author_fullname?: string;
	author_is_blocked?: boolean;
	author_patreon_flair?: boolean;
	author_premium?: boolean;
	banned_at_utc?: null;
	banned_by?: null;
	can_gild?: boolean;
	can_mod_post?: boolean;
	category?: null;
	clicked?: boolean;
	content_categories?: null;
	contest_mode?: boolean;
	created?: number;
	created_utc?: number;
	discussion_type?: null;
	domain?: string;
	downs?: number;
	gilded?: number;
	hidden?: boolean;
	hide_score?: boolean;
	id?: string;
	is_created_from_ads_ui?: boolean;
	is_crosspostable?: boolean;
	is_meta?: boolean;
	is_original_content?: boolean;
	is_reddit_media_domain?: boolean;
	is_robot_indexable?: boolean;
	is_self?: boolean;
	is_video?: boolean;
	link_flair_richtext?: Array<{
		e?: string;
		t?: string;
	}>;
	link_flair_type?: string;
	locked?: boolean;
	media_only?: boolean;
	mod_note?: null;
	mod_reason_by?: null;
	mod_reason_title?: null;
	name?: string;
	no_follow?: boolean;
	num_comments?: number;
	num_crossposts?: number;
	num_duplicates?: number;
	over_18?: boolean;
	permalink?: string;
	pinned?: boolean;
	quarantine?: boolean;
	removal_reason?: null;
	removed_by?: null;
	saved?: boolean;
	score?: number;
	selftext?: string;
	send_replies?: boolean;
	spoiler?: boolean;
	stickied?: boolean;
	subreddit?: string;
	subreddit_id?: string;
	subreddit_name_prefixed?: string;
	subreddit_subscribers?: number;
	subreddit_type?: string;
	thumbnail?: string;
	title?: string;
	top_awarded_type?: null;
	total_awards_received?: number;
	ups?: number;
	url?: string;
	view_count?: null;
	visited?: boolean;
};

export type RedditV1PostGetAllOutput = {
	allow_live_comments?: boolean;
	approved_at_utc?: null;
	approved_by?: null;
	archived?: boolean;
	author?: string;
	author_flair_richtext?: Array<{
		a?: string;
		e?: string;
		t?: string;
		u?: string;
	}>;
	author_flair_type?: string;
	author_fullname?: string;
	author_is_blocked?: boolean;
	author_patreon_flair?: boolean;
	author_premium?: boolean;
	banned_at_utc?: null;
	banned_by?: null;
	can_gild?: boolean;
	can_mod_post?: boolean;
	category?: null;
	clicked?: boolean;
	contest_mode?: boolean;
	created?: number;
	created_utc?: number;
	discussion_type?: null;
	domain?: string;
	downs?: number;
	gilded?: number;
	hidden?: boolean;
	hide_score?: boolean;
	id?: string;
	is_created_from_ads_ui?: boolean;
	is_crosspostable?: boolean;
	is_meta?: boolean;
	is_original_content?: boolean;
	is_reddit_media_domain?: boolean;
	is_robot_indexable?: boolean;
	is_self?: boolean;
	is_video?: boolean;
	link_flair_richtext?: Array<{
		e?: string;
		t?: string;
	}>;
	link_flair_template_id?: string;
	link_flair_type?: string;
	locked?: boolean;
	media_only?: boolean;
	mod_note?: null;
	mod_reason_by?: null;
	mod_reason_title?: null;
	name?: string;
	no_follow?: boolean;
	num_comments?: number;
	num_crossposts?: number;
	num_reports?: null;
	over_18?: boolean;
	permalink?: string;
	pinned?: boolean;
	post_hint?: string;
	preview?: {
		enabled?: boolean;
		images?: Array<{
			id?: string;
			resolutions?: Array<{
				height?: number;
				url?: string;
				width?: number;
			}>;
			source?: {
				height?: number;
				url?: string;
				width?: number;
			};
		}>;
	};
	quarantine?: boolean;
	removal_reason?: null;
	removed_by?: null;
	removed_by_category?: null;
	report_reasons?: null;
	saved?: boolean;
	score?: number;
	selftext?: string;
	send_replies?: boolean;
	spoiler?: boolean;
	stickied?: boolean;
	subreddit?: string;
	subreddit_id?: string;
	subreddit_name_prefixed?: string;
	subreddit_subscribers?: number;
	subreddit_type?: string;
	thumbnail?: string;
	title?: string;
	top_awarded_type?: null;
	total_awards_received?: number;
	ups?: number;
	url?: string;
	url_overridden_by_dest?: string;
	view_count?: null;
	visited?: boolean;
};

export type RedditV1PostSearchOutput = {
	allow_live_comments?: boolean;
	approved_at_utc?: null;
	approved_by?: null;
	archived?: boolean;
	author?: string;
	author_flair_richtext?: Array<{
		e?: string;
		t?: string;
	}>;
	author_flair_type?: string;
	author_fullname?: string;
	author_is_blocked?: boolean;
	author_patreon_flair?: boolean;
	author_premium?: boolean;
	banned_at_utc?: null;
	banned_by?: null;
	can_gild?: boolean;
	can_mod_post?: boolean;
	category?: null;
	clicked?: boolean;
	contest_mode?: boolean;
	created_utc?: number;
	discussion_type?: null;
	domain?: string;
	downs?: number;
	gilded?: number;
	hidden?: boolean;
	hide_score?: boolean;
	id?: string;
	is_created_from_ads_ui?: boolean;
	is_crosspostable?: boolean;
	is_meta?: boolean;
	is_original_content?: boolean;
	is_reddit_media_domain?: boolean;
	is_robot_indexable?: boolean;
	is_self?: boolean;
	is_video?: boolean;
	link_flair_richtext?: Array<{
		e?: string;
		t?: string;
	}>;
	link_flair_template_id?: string;
	link_flair_type?: string;
	locked?: boolean;
	media_only?: boolean;
	mod_note?: null;
	mod_reason_by?: null;
	mod_reason_title?: null;
	name?: string;
	no_follow?: boolean;
	num_comments?: number;
	num_crossposts?: number;
	over_18?: boolean;
	permalink?: string;
	pinned?: boolean;
	quarantine?: boolean;
	removal_reason?: null;
	removed_by?: null;
	removed_by_category?: null;
	saved?: boolean;
	score?: number;
	selftext?: string;
	send_replies?: boolean;
	spoiler?: boolean;
	stickied?: boolean;
	subreddit?: string;
	subreddit_id?: string;
	subreddit_name_prefixed?: string;
	subreddit_subscribers?: number;
	subreddit_type?: string;
	thumbnail?: string;
	title?: string;
	top_awarded_type?: null;
	total_awards_received?: number;
	ups?: number;
	url?: string;
	view_count?: null;
	visited?: boolean;
};

export type RedditV1PostCommentCreateOutput = {
	approved_at_utc?: null;
	approved_by?: null;
	archived?: boolean;
	associated_award?: null;
	author?: string;
	author_flair_background_color?: null;
	author_flair_css_class?: null;
	author_flair_template_id?: null;
	author_flair_text?: null;
	author_flair_text_color?: null;
	author_flair_type?: string;
	author_fullname?: string;
	author_is_blocked?: boolean;
	author_patreon_flair?: boolean;
	author_premium?: boolean;
	banned_at_utc?: null;
	banned_by?: null;
	body?: string;
	body_html?: string;
	can_gild?: boolean;
	can_mod_post?: boolean;
	collapsed?: boolean;
	collapsed_because_crowd_control?: null;
	collapsed_reason?: null;
	collapsed_reason_code?: null;
	comment_type?: null;
	controversiality?: number;
	created?: number;
	created_utc?: number;
	distinguished?: null;
	downs?: number;
	edited?: boolean;
	gilded?: number;
	id?: string;
	is_submitter?: boolean;
	likes?: boolean;
	link_id?: string;
	locked?: boolean;
	mod_note?: null;
	mod_reason_by?: null;
	mod_reason_title?: null;
	name?: string;
	no_follow?: boolean;
	parent_id?: string;
	permalink?: string;
	removal_reason?: null;
	replies?: string;
	rte_mode?: string;
	saved?: boolean;
	score?: number;
	score_hidden?: boolean;
	send_replies?: boolean;
	stickied?: boolean;
	subreddit?: string;
	subreddit_id?: string;
	subreddit_name_prefixed?: string;
	subreddit_type?: string;
	top_awarded_type?: null;
	total_awards_received?: number;
	unrepliable_reason?: null;
	ups?: number;
};

export type RedditV1PostCommentGetAllOutput = {
	approved_at_utc?: null;
	approved_by?: null;
	archived?: boolean;
	associated_award?: null;
	author?: string;
	author_flair_richtext?: Array<{
		a?: string;
		e?: string;
		t?: string;
		u?: string;
	}>;
	author_flair_type?: string;
	author_fullname?: string;
	author_is_blocked?: boolean;
	author_patreon_flair?: boolean;
	author_premium?: boolean;
	banned_at_utc?: null;
	banned_by?: null;
	body?: string;
	body_html?: string;
	can_gild?: boolean;
	can_mod_post?: boolean;
	collapsed?: boolean;
	collapsed_because_crowd_control?: null;
	collapsed_reason?: null;
	comment_type?: null;
	controversiality?: number;
	created?: number;
	created_utc?: number;
	depth?: number;
	downs?: number;
	gilded?: number;
	id?: string;
	is_submitter?: boolean;
	link_id?: string;
	locked?: boolean;
	mod_note?: null;
	mod_reason_by?: null;
	mod_reason_title?: null;
	name?: string;
	no_follow?: boolean;
	num_reports?: null;
	parent_id?: string;
	permalink?: string;
	removal_reason?: null;
	report_reasons?: null;
	saved?: boolean;
	score?: number;
	score_hidden?: boolean;
	send_replies?: boolean;
	stickied?: boolean;
	subreddit?: string;
	subreddit_id?: string;
	subreddit_name_prefixed?: string;
	subreddit_type?: string;
	top_awarded_type?: null;
	total_awards_received?: number;
	unrepliable_reason?: null;
	ups?: number;
};

export type RedditV1ProfileGetOutput = {
	awards_on_streams?: boolean;
	chat_group_rollout?: boolean;
	chat_subreddit?: boolean;
	chat_user_settings?: boolean;
	cookie_consent_banner?: boolean;
	crowd_control_for_post?: boolean;
	do_not_track?: boolean;
	expensive_coins_package?: boolean;
	images_in_comments?: boolean;
	is_email_permission_required?: boolean;
	mod_awards?: boolean;
	mod_service_mute_reads?: boolean;
	mod_service_mute_writes?: boolean;
	modlog_copyright_removal?: boolean;
	modmail_harassment_filter?: boolean;
	mweb_xpromo_interstitial_comments_android?: boolean;
	mweb_xpromo_interstitial_comments_ios?: boolean;
	mweb_xpromo_modal_listing_click_daily_dismissible_android?: boolean;
	mweb_xpromo_modal_listing_click_daily_dismissible_ios?: boolean;
	mweb_xpromo_revamp_v2?: {
		experiment_id?: number;
		owner?: string;
		variant?: string;
	};
	noreferrer_to_noopener?: boolean;
	premium_subscriptions_table?: boolean;
	promoted_trend_blanks?: boolean;
	resized_styles_images?: boolean;
	show_amp_link?: boolean;
	use_pref_account_deployment?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface RedditV1Credentials {
	redditOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface RedditV1NodeBase {
	type: 'n8n-nodes-base.reddit';
	version: 1;
	credentials?: RedditV1Credentials;
}

export type RedditV1PostCreateNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1PostCreateConfig>;
	output?: RedditV1PostCreateOutput;
};

export type RedditV1PostDeleteNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1PostDeleteConfig>;
	output?: RedditV1PostDeleteOutput;
};

export type RedditV1PostGetNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1PostGetConfig>;
	output?: RedditV1PostGetOutput;
};

export type RedditV1PostGetAllNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1PostGetAllConfig>;
	output?: RedditV1PostGetAllOutput;
};

export type RedditV1PostSearchNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1PostSearchConfig>;
	output?: RedditV1PostSearchOutput;
};

export type RedditV1PostCommentCreateNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1PostCommentCreateConfig>;
	output?: RedditV1PostCommentCreateOutput;
};

export type RedditV1PostCommentGetAllNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1PostCommentGetAllConfig>;
	output?: RedditV1PostCommentGetAllOutput;
};

export type RedditV1PostCommentDeleteNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1PostCommentDeleteConfig>;
};

export type RedditV1PostCommentReplyNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1PostCommentReplyConfig>;
};

export type RedditV1ProfileGetNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1ProfileGetConfig>;
	output?: RedditV1ProfileGetOutput;
};

export type RedditV1SubredditGetNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1SubredditGetConfig>;
};

export type RedditV1SubredditGetAllNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1SubredditGetAllConfig>;
};

export type RedditV1UserGetNode = RedditV1NodeBase & {
	config: NodeConfig<RedditV1UserGetConfig>;
};

export type RedditV1Node =
	| RedditV1PostCreateNode
	| RedditV1PostDeleteNode
	| RedditV1PostGetNode
	| RedditV1PostGetAllNode
	| RedditV1PostSearchNode
	| RedditV1PostCommentCreateNode
	| RedditV1PostCommentGetAllNode
	| RedditV1PostCommentDeleteNode
	| RedditV1PostCommentReplyNode
	| RedditV1ProfileGetNode
	| RedditV1SubredditGetNode
	| RedditV1SubredditGetAllNode
	| RedditV1UserGetNode
	;