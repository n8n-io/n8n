/**
 * Microsoft Teams Node - Version 1
 * Consume Microsoft Teams API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a channel */
export type MicrosoftTeamsV1ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
 */
		teamId: string | Expression<string>;
/**
 * Channel name as it will appear to the user in Microsoft Teams
 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
 */
		name: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a channel */
export type MicrosoftTeamsV1ChannelDeleteConfig = {
	resource: 'channel';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["delete"], resource: ["channel"] }
 */
		teamId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["delete"], resource: ["channel"] }
 */
		channelId?: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV1ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["get"], resource: ["channel"] }
 */
		teamId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["get"], resource: ["channel"] }
 */
		channelId?: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV1ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["channel"] }
 */
		teamId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["channel"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["channel"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a channel */
export type MicrosoftTeamsV1ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["update"], resource: ["channel"] }
 */
		teamId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["update"], resource: ["channel"] }
 */
		channelId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a channel */
export type MicrosoftTeamsV1ChannelMessageCreateConfig = {
	resource: 'channelMessage';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["channelMessage"] }
 */
		teamId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["channelMessage"] }
 */
		channelId?: string | Expression<string>;
/**
 * The type of the content
 * @displayOptions.show { operation: ["create"], resource: ["channelMessage"] }
 * @default text
 */
		messageType: 'text' | 'html' | Expression<string>;
/**
 * The content of the item
 * @displayOptions.show { operation: ["create"], resource: ["channelMessage"] }
 */
		message: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many channels */
export type MicrosoftTeamsV1ChannelMessageGetAllConfig = {
	resource: 'channelMessage';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["channelMessage"] }
 */
		teamId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["channelMessage"] }
 */
		channelId?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["channelMessage"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["channelMessage"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create a channel */
export type MicrosoftTeamsV1ChatMessageCreateConfig = {
	resource: 'chatMessage';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create", "get"], resource: ["chatMessage"] }
 */
		chatId: string | Expression<string>;
/**
 * The type of the content
 * @displayOptions.show { operation: ["create"], resource: ["chatMessage"] }
 * @default text
 */
		messageType: 'text' | 'html' | Expression<string>;
/**
 * The content of the item
 * @displayOptions.show { operation: ["create"], resource: ["chatMessage"] }
 */
		message: string | Expression<string>;
/**
 * Other options to set
 * @displayOptions.show { operation: ["create"], resource: ["chatMessage"] }
 * @default {}
 */
		options?: Record<string, unknown>;
};

/** Get a channel */
export type MicrosoftTeamsV1ChatMessageGetConfig = {
	resource: 'chatMessage';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create", "get"], resource: ["chatMessage"] }
 */
		chatId: string | Expression<string>;
	messageId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV1ChatMessageGetAllConfig = {
	resource: 'chatMessage';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["chatMessage"] }
 */
		chatId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["chatMessage"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["chatMessage"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Create a channel */
export type MicrosoftTeamsV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	groupSource: 'all' | 'mine' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		groupId: string | Expression<string>;
/**
 * The plan for the task to belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		planId: string | Expression<string>;
/**
 * The bucket for the task to belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		bucketId: string | Expression<string>;
/**
 * Title of the task
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a channel */
export type MicrosoftTeamsV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	taskId: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	taskId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	groupSource: 'all' | 'mine' | Expression<string>;
	tasksFor: 'member' | 'plan' | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["task"] }
 */
		groupId: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["task"], tasksFor: ["member"] }
 */
		memberId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["getAll"], resource: ["task"], tasksFor: ["plan"] }
 */
		planId?: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["task"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["task"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a channel */
export type MicrosoftTeamsV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	groupSource: 'all' | 'mine' | Expression<string>;
/**
 * The ID of the Task
 * @displayOptions.show { operation: ["update"], resource: ["task"] }
 */
		taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MicrosoftTeamsV1Params =
	| MicrosoftTeamsV1ChannelCreateConfig
	| MicrosoftTeamsV1ChannelDeleteConfig
	| MicrosoftTeamsV1ChannelGetConfig
	| MicrosoftTeamsV1ChannelGetAllConfig
	| MicrosoftTeamsV1ChannelUpdateConfig
	| MicrosoftTeamsV1ChannelMessageCreateConfig
	| MicrosoftTeamsV1ChannelMessageGetAllConfig
	| MicrosoftTeamsV1ChatMessageCreateConfig
	| MicrosoftTeamsV1ChatMessageGetConfig
	| MicrosoftTeamsV1ChatMessageGetAllConfig
	| MicrosoftTeamsV1TaskCreateConfig
	| MicrosoftTeamsV1TaskDeleteConfig
	| MicrosoftTeamsV1TaskGetConfig
	| MicrosoftTeamsV1TaskGetAllConfig
	| MicrosoftTeamsV1TaskUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftTeamsV1Credentials {
	microsoftTeamsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftTeamsV1NodeBase {
	type: 'n8n-nodes-base.microsoftTeams';
	version: 1;
	credentials?: MicrosoftTeamsV1Credentials;
}

export type MicrosoftTeamsV1ChannelCreateNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChannelCreateConfig>;
};

export type MicrosoftTeamsV1ChannelDeleteNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChannelDeleteConfig>;
};

export type MicrosoftTeamsV1ChannelGetNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChannelGetConfig>;
};

export type MicrosoftTeamsV1ChannelGetAllNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChannelGetAllConfig>;
};

export type MicrosoftTeamsV1ChannelUpdateNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChannelUpdateConfig>;
};

export type MicrosoftTeamsV1ChannelMessageCreateNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChannelMessageCreateConfig>;
};

export type MicrosoftTeamsV1ChannelMessageGetAllNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChannelMessageGetAllConfig>;
};

export type MicrosoftTeamsV1ChatMessageCreateNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChatMessageCreateConfig>;
};

export type MicrosoftTeamsV1ChatMessageGetNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChatMessageGetConfig>;
};

export type MicrosoftTeamsV1ChatMessageGetAllNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1ChatMessageGetAllConfig>;
};

export type MicrosoftTeamsV1TaskCreateNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1TaskCreateConfig>;
};

export type MicrosoftTeamsV1TaskDeleteNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1TaskDeleteConfig>;
};

export type MicrosoftTeamsV1TaskGetNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1TaskGetConfig>;
};

export type MicrosoftTeamsV1TaskGetAllNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1TaskGetAllConfig>;
};

export type MicrosoftTeamsV1TaskUpdateNode = MicrosoftTeamsV1NodeBase & {
	config: NodeConfig<MicrosoftTeamsV1TaskUpdateConfig>;
};

export type MicrosoftTeamsV1Node =
	| MicrosoftTeamsV1ChannelCreateNode
	| MicrosoftTeamsV1ChannelDeleteNode
	| MicrosoftTeamsV1ChannelGetNode
	| MicrosoftTeamsV1ChannelGetAllNode
	| MicrosoftTeamsV1ChannelUpdateNode
	| MicrosoftTeamsV1ChannelMessageCreateNode
	| MicrosoftTeamsV1ChannelMessageGetAllNode
	| MicrosoftTeamsV1ChatMessageCreateNode
	| MicrosoftTeamsV1ChatMessageGetNode
	| MicrosoftTeamsV1ChatMessageGetAllNode
	| MicrosoftTeamsV1TaskCreateNode
	| MicrosoftTeamsV1TaskDeleteNode
	| MicrosoftTeamsV1TaskGetNode
	| MicrosoftTeamsV1TaskGetAllNode
	| MicrosoftTeamsV1TaskUpdateNode
	;