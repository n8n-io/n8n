/**
 * Twist Node Types
 *
 * Consume Twist API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/twist/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Archive a channel */
export type TwistV1ChannelArchiveConfig = {
	resource: 'channel';
	operation: 'archive';
	/**
	 * The ID of the channel
	 */
	channelId: string | Expression<string>;
};

/** Initiates a public or private channel-based conversation */
export type TwistV1ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
	/**
	 * The ID of the workspace. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	workspaceId: string | Expression<string>;
	/**
	 * The name of the channel
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a channel */
export type TwistV1ChannelDeleteConfig = {
	resource: 'channel';
	operation: 'delete';
	/**
	 * The ID of the channel
	 */
	channelId: string | Expression<string>;
};

/** Get information about a channel */
export type TwistV1ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
	/**
	 * The ID of the channel
	 */
	channelId: string | Expression<string>;
};

/** Get many channels */
export type TwistV1ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
	/**
	 * The ID of the workspace. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	workspaceId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Unarchive a channel */
export type TwistV1ChannelUnarchiveConfig = {
	resource: 'channel';
	operation: 'unarchive';
	/**
	 * The ID of the channel
	 */
	channelId: string | Expression<string>;
};

/** Update a channel */
export type TwistV1ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
	/**
	 * The ID of the channel
	 */
	channelId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Initiates a public or private channel-based conversation */
export type TwistV1CommentCreateConfig = {
	resource: 'comment';
	operation: 'create';
	/**
	 * The ID of the thread
	 */
	threadId: string | Expression<string>;
	/**
	 * The content of the comment
	 */
	content: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a channel */
export type TwistV1CommentDeleteConfig = {
	resource: 'comment';
	operation: 'delete';
	/**
	 * The ID of the comment
	 */
	commentId: string | Expression<string>;
};

/** Get information about a channel */
export type TwistV1CommentGetConfig = {
	resource: 'comment';
	operation: 'get';
	/**
	 * The ID of the comment
	 */
	commentId: string | Expression<string>;
};

/** Get many channels */
export type TwistV1CommentGetAllConfig = {
	resource: 'comment';
	operation: 'getAll';
	/**
	 * The ID of the channel
	 */
	threadId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a channel */
export type TwistV1CommentUpdateConfig = {
	resource: 'comment';
	operation: 'update';
	/**
	 * The ID of the comment
	 */
	commentId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Initiates a public or private channel-based conversation */
export type TwistV1MessageConversationCreateConfig = {
	resource: 'messageConversation';
	operation: 'create';
	/**
	 * The ID of the workspace. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	workspaceId: string | Expression<string>;
	/**
	 * The ID of the conversation. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	conversationId: string | Expression<string>;
	/**
	 * The content of the new message. Mentions can be used as &lt;code&gt;[Name](twist-mention://user_id)&lt;/code&gt; for users or &lt;code&gt;[Group name](twist-group-mention://group_id)&lt;/code&gt; for groups.
	 */
	content?: string | Expression<string>;
	/**
	 * Other options to set
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
};

/** Delete a channel */
export type TwistV1MessageConversationDeleteConfig = {
	resource: 'messageConversation';
	operation: 'delete';
	/**
	 * The ID of the conversation message
	 */
	id: string | Expression<string>;
};

/** Get information about a channel */
export type TwistV1MessageConversationGetConfig = {
	resource: 'messageConversation';
	operation: 'get';
	/**
	 * The ID of the conversation message
	 */
	id: string | Expression<string>;
};

/** Get many channels */
export type TwistV1MessageConversationGetAllConfig = {
	resource: 'messageConversation';
	operation: 'getAll';
	/**
	 * The ID of the workspace. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	workspaceId: string | Expression<string>;
	/**
	 * The ID of the conversation. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	conversationId: string | Expression<string>;
	/**
	 * Other options to set
	 * @default {}
	 */
	additionalFields?: Record<string, unknown>;
};

/** Update a channel */
export type TwistV1MessageConversationUpdateConfig = {
	resource: 'messageConversation';
	operation: 'update';
	/**
	 * The ID of the conversation message
	 */
	id: string | Expression<string>;
	/**
	 * Other options to set
	 * @default {}
	 */
	updateFields?: Record<string, unknown>;
};

/** Initiates a public or private channel-based conversation */
export type TwistV1ThreadCreateConfig = {
	resource: 'thread';
	operation: 'create';
	/**
	 * The ID of the channel
	 */
	channelId: string | Expression<string>;
	/**
	 * The title of the new thread (1 &lt; length &lt; 300)
	 */
	title: string | Expression<string>;
	/**
	 * The content of the thread
	 */
	content: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a channel */
export type TwistV1ThreadDeleteConfig = {
	resource: 'thread';
	operation: 'delete';
	/**
	 * The ID of the thread
	 */
	threadId: string | Expression<string>;
};

/** Get information about a channel */
export type TwistV1ThreadGetConfig = {
	resource: 'thread';
	operation: 'get';
	/**
	 * The ID of the thread
	 */
	threadId: string | Expression<string>;
};

/** Get many channels */
export type TwistV1ThreadGetAllConfig = {
	resource: 'thread';
	operation: 'getAll';
	/**
	 * The ID of the channel
	 */
	channelId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a channel */
export type TwistV1ThreadUpdateConfig = {
	resource: 'thread';
	operation: 'update';
	/**
	 * The ID of the thread
	 */
	threadId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type TwistV1Params =
	| TwistV1ChannelArchiveConfig
	| TwistV1ChannelCreateConfig
	| TwistV1ChannelDeleteConfig
	| TwistV1ChannelGetConfig
	| TwistV1ChannelGetAllConfig
	| TwistV1ChannelUnarchiveConfig
	| TwistV1ChannelUpdateConfig
	| TwistV1CommentCreateConfig
	| TwistV1CommentDeleteConfig
	| TwistV1CommentGetConfig
	| TwistV1CommentGetAllConfig
	| TwistV1CommentUpdateConfig
	| TwistV1MessageConversationCreateConfig
	| TwistV1MessageConversationDeleteConfig
	| TwistV1MessageConversationGetConfig
	| TwistV1MessageConversationGetAllConfig
	| TwistV1MessageConversationUpdateConfig
	| TwistV1ThreadCreateConfig
	| TwistV1ThreadDeleteConfig
	| TwistV1ThreadGetConfig
	| TwistV1ThreadGetAllConfig
	| TwistV1ThreadUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TwistV1Credentials {
	twistOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type TwistV1Node = {
	type: 'n8n-nodes-base.twist';
	version: 1;
	config: NodeConfig<TwistV1Params>;
	credentials?: TwistV1Credentials;
};

export type TwistNode = TwistV1Node;
