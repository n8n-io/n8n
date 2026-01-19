/**
 * Twist Node - Version 1
 * Consume Twist API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Archive a channel */
export type TwistV1ChannelArchiveConfig = {
	resource: 'channel';
	operation: 'archive';
/**
 * The ID of the channel
 * @displayOptions.show { operation: ["archive", "delete", "get", "unarchive"], resource: ["channel"] }
 */
		channelId: string | Expression<string>;
};

/** Initiates a public or private channel-based conversation */
export type TwistV1ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
/**
 * The ID of the workspace. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
 */
		workspaceId: string | Expression<string>;
/**
 * The name of the channel
 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
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
 * @displayOptions.show { operation: ["archive", "delete", "get", "unarchive"], resource: ["channel"] }
 */
		channelId: string | Expression<string>;
};

/** Get information about a channel */
export type TwistV1ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
/**
 * The ID of the channel
 * @displayOptions.show { operation: ["archive", "delete", "get", "unarchive"], resource: ["channel"] }
 */
		channelId: string | Expression<string>;
};

/** Get many channels */
export type TwistV1ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
/**
 * The ID of the workspace. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["channel"] }
 */
		workspaceId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["channel"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["channel"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["archive", "delete", "get", "unarchive"], resource: ["channel"] }
 */
		channelId: string | Expression<string>;
};

/** Update a channel */
export type TwistV1ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
/**
 * The ID of the channel
 * @displayOptions.show { operation: ["update"], resource: ["channel"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["comment"] }
 */
		threadId: string | Expression<string>;
/**
 * The content of the comment
 * @displayOptions.show { operation: ["create"], resource: ["comment"] }
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
 * @displayOptions.show { operation: ["get", "delete"], resource: ["comment"] }
 */
		commentId: string | Expression<string>;
};

/** Get information about a channel */
export type TwistV1CommentGetConfig = {
	resource: 'comment';
	operation: 'get';
/**
 * The ID of the comment
 * @displayOptions.show { operation: ["get", "delete"], resource: ["comment"] }
 */
		commentId: string | Expression<string>;
};

/** Get many channels */
export type TwistV1CommentGetAllConfig = {
	resource: 'comment';
	operation: 'getAll';
/**
 * The ID of the channel
 * @displayOptions.show { operation: ["getAll"], resource: ["comment"] }
 */
		threadId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["comment"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["comment"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["comment"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["messageConversation"] }
 */
		workspaceId: string | Expression<string>;
/**
 * The ID of the conversation. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["messageConversation"] }
 */
		conversationId: string | Expression<string>;
/**
 * The content of the new message. Mentions can be used as &lt;code&gt;[Name](twist-mention://user_id)&lt;/code&gt; for users or &lt;code&gt;[Group name](twist-group-mention://group_id)&lt;/code&gt; for groups.
 * @displayOptions.show { operation: ["create"], resource: ["messageConversation"] }
 */
		content?: string | Expression<string>;
/**
 * Other options to set
 * @displayOptions.show { operation: ["create"], resource: ["messageConversation"] }
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
 * @displayOptions.show { operation: ["delete", "get"], resource: ["messageConversation"] }
 */
		id: string | Expression<string>;
};

/** Get information about a channel */
export type TwistV1MessageConversationGetConfig = {
	resource: 'messageConversation';
	operation: 'get';
/**
 * The ID of the conversation message
 * @displayOptions.show { operation: ["delete", "get"], resource: ["messageConversation"] }
 */
		id: string | Expression<string>;
};

/** Get many channels */
export type TwistV1MessageConversationGetAllConfig = {
	resource: 'messageConversation';
	operation: 'getAll';
/**
 * The ID of the workspace. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["messageConversation"] }
 */
		workspaceId: string | Expression<string>;
/**
 * The ID of the conversation. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["messageConversation"] }
 */
		conversationId: string | Expression<string>;
/**
 * Other options to set
 * @displayOptions.show { operation: ["getAll"], resource: ["messageConversation"] }
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
 * @displayOptions.show { operation: ["update"], resource: ["messageConversation"] }
 */
		id: string | Expression<string>;
/**
 * Other options to set
 * @displayOptions.show { operation: ["update"], resource: ["messageConversation"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["thread"] }
 */
		channelId: string | Expression<string>;
/**
 * The title of the new thread (1 &lt; length &lt; 300)
 * @displayOptions.show { operation: ["create"], resource: ["thread"] }
 */
		title: string | Expression<string>;
/**
 * The content of the thread
 * @displayOptions.show { operation: ["create"], resource: ["thread"] }
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
 * @displayOptions.show { operation: ["get", "delete"], resource: ["thread"] }
 */
		threadId: string | Expression<string>;
};

/** Get information about a channel */
export type TwistV1ThreadGetConfig = {
	resource: 'thread';
	operation: 'get';
/**
 * The ID of the thread
 * @displayOptions.show { operation: ["get", "delete"], resource: ["thread"] }
 */
		threadId: string | Expression<string>;
};

/** Get many channels */
export type TwistV1ThreadGetAllConfig = {
	resource: 'thread';
	operation: 'getAll';
/**
 * The ID of the channel
 * @displayOptions.show { operation: ["getAll"], resource: ["thread"] }
 */
		channelId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["thread"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["thread"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["thread"] }
 */
		threadId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface TwistV1Credentials {
	twistOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TwistV1NodeBase {
	type: 'n8n-nodes-base.twist';
	version: 1;
	credentials?: TwistV1Credentials;
}

export type TwistV1ChannelArchiveNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ChannelArchiveConfig>;
};

export type TwistV1ChannelCreateNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ChannelCreateConfig>;
};

export type TwistV1ChannelDeleteNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ChannelDeleteConfig>;
};

export type TwistV1ChannelGetNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ChannelGetConfig>;
};

export type TwistV1ChannelGetAllNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ChannelGetAllConfig>;
};

export type TwistV1ChannelUnarchiveNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ChannelUnarchiveConfig>;
};

export type TwistV1ChannelUpdateNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ChannelUpdateConfig>;
};

export type TwistV1CommentCreateNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1CommentCreateConfig>;
};

export type TwistV1CommentDeleteNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1CommentDeleteConfig>;
};

export type TwistV1CommentGetNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1CommentGetConfig>;
};

export type TwistV1CommentGetAllNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1CommentGetAllConfig>;
};

export type TwistV1CommentUpdateNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1CommentUpdateConfig>;
};

export type TwistV1MessageConversationCreateNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1MessageConversationCreateConfig>;
};

export type TwistV1MessageConversationDeleteNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1MessageConversationDeleteConfig>;
};

export type TwistV1MessageConversationGetNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1MessageConversationGetConfig>;
};

export type TwistV1MessageConversationGetAllNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1MessageConversationGetAllConfig>;
};

export type TwistV1MessageConversationUpdateNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1MessageConversationUpdateConfig>;
};

export type TwistV1ThreadCreateNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ThreadCreateConfig>;
};

export type TwistV1ThreadDeleteNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ThreadDeleteConfig>;
};

export type TwistV1ThreadGetNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ThreadGetConfig>;
};

export type TwistV1ThreadGetAllNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ThreadGetAllConfig>;
};

export type TwistV1ThreadUpdateNode = TwistV1NodeBase & {
	config: NodeConfig<TwistV1ThreadUpdateConfig>;
};

export type TwistV1Node =
	| TwistV1ChannelArchiveNode
	| TwistV1ChannelCreateNode
	| TwistV1ChannelDeleteNode
	| TwistV1ChannelGetNode
	| TwistV1ChannelGetAllNode
	| TwistV1ChannelUnarchiveNode
	| TwistV1ChannelUpdateNode
	| TwistV1CommentCreateNode
	| TwistV1CommentDeleteNode
	| TwistV1CommentGetNode
	| TwistV1CommentGetAllNode
	| TwistV1CommentUpdateNode
	| TwistV1MessageConversationCreateNode
	| TwistV1MessageConversationDeleteNode
	| TwistV1MessageConversationGetNode
	| TwistV1MessageConversationGetAllNode
	| TwistV1MessageConversationUpdateNode
	| TwistV1ThreadCreateNode
	| TwistV1ThreadDeleteNode
	| TwistV1ThreadGetNode
	| TwistV1ThreadGetAllNode
	| TwistV1ThreadUpdateNode
	;