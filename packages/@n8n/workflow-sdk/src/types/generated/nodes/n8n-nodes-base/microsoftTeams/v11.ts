/**
 * Microsoft Teams Node - Version 1.1
 * Consume Microsoft Teams API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a channel */
export type MicrosoftTeamsV11ChannelCreateConfig = {
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
export type MicrosoftTeamsV11ChannelDeleteConfig = {
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
export type MicrosoftTeamsV11ChannelGetConfig = {
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
export type MicrosoftTeamsV11ChannelGetAllConfig = {
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
export type MicrosoftTeamsV11ChannelUpdateConfig = {
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
export type MicrosoftTeamsV11ChannelMessageCreateConfig = {
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
export type MicrosoftTeamsV11ChannelMessageGetAllConfig = {
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
export type MicrosoftTeamsV11ChatMessageCreateConfig = {
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
export type MicrosoftTeamsV11ChatMessageGetConfig = {
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
export type MicrosoftTeamsV11ChatMessageGetAllConfig = {
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
export type MicrosoftTeamsV11TaskCreateConfig = {
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
export type MicrosoftTeamsV11TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	taskId: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV11TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	taskId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV11TaskGetAllConfig = {
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
export type MicrosoftTeamsV11TaskUpdateConfig = {
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

export type MicrosoftTeamsV11Params =
	| MicrosoftTeamsV11ChannelCreateConfig
	| MicrosoftTeamsV11ChannelDeleteConfig
	| MicrosoftTeamsV11ChannelGetConfig
	| MicrosoftTeamsV11ChannelGetAllConfig
	| MicrosoftTeamsV11ChannelUpdateConfig
	| MicrosoftTeamsV11ChannelMessageCreateConfig
	| MicrosoftTeamsV11ChannelMessageGetAllConfig
	| MicrosoftTeamsV11ChatMessageCreateConfig
	| MicrosoftTeamsV11ChatMessageGetConfig
	| MicrosoftTeamsV11ChatMessageGetAllConfig
	| MicrosoftTeamsV11TaskCreateConfig
	| MicrosoftTeamsV11TaskDeleteConfig
	| MicrosoftTeamsV11TaskGetConfig
	| MicrosoftTeamsV11TaskGetAllConfig
	| MicrosoftTeamsV11TaskUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftTeamsV11Credentials {
	microsoftTeamsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftTeamsV11NodeBase {
	type: 'n8n-nodes-base.microsoftTeams';
	version: 1.1;
	credentials?: MicrosoftTeamsV11Credentials;
}

export type MicrosoftTeamsV11ChannelCreateNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChannelCreateConfig>;
};

export type MicrosoftTeamsV11ChannelDeleteNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChannelDeleteConfig>;
};

export type MicrosoftTeamsV11ChannelGetNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChannelGetConfig>;
};

export type MicrosoftTeamsV11ChannelGetAllNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChannelGetAllConfig>;
};

export type MicrosoftTeamsV11ChannelUpdateNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChannelUpdateConfig>;
};

export type MicrosoftTeamsV11ChannelMessageCreateNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChannelMessageCreateConfig>;
};

export type MicrosoftTeamsV11ChannelMessageGetAllNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChannelMessageGetAllConfig>;
};

export type MicrosoftTeamsV11ChatMessageCreateNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChatMessageCreateConfig>;
};

export type MicrosoftTeamsV11ChatMessageGetNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChatMessageGetConfig>;
};

export type MicrosoftTeamsV11ChatMessageGetAllNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11ChatMessageGetAllConfig>;
};

export type MicrosoftTeamsV11TaskCreateNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11TaskCreateConfig>;
};

export type MicrosoftTeamsV11TaskDeleteNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11TaskDeleteConfig>;
};

export type MicrosoftTeamsV11TaskGetNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11TaskGetConfig>;
};

export type MicrosoftTeamsV11TaskGetAllNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11TaskGetAllConfig>;
};

export type MicrosoftTeamsV11TaskUpdateNode = MicrosoftTeamsV11NodeBase & {
	config: NodeConfig<MicrosoftTeamsV11TaskUpdateConfig>;
};

export type MicrosoftTeamsV11Node =
	| MicrosoftTeamsV11ChannelCreateNode
	| MicrosoftTeamsV11ChannelDeleteNode
	| MicrosoftTeamsV11ChannelGetNode
	| MicrosoftTeamsV11ChannelGetAllNode
	| MicrosoftTeamsV11ChannelUpdateNode
	| MicrosoftTeamsV11ChannelMessageCreateNode
	| MicrosoftTeamsV11ChannelMessageGetAllNode
	| MicrosoftTeamsV11ChatMessageCreateNode
	| MicrosoftTeamsV11ChatMessageGetNode
	| MicrosoftTeamsV11ChatMessageGetAllNode
	| MicrosoftTeamsV11TaskCreateNode
	| MicrosoftTeamsV11TaskDeleteNode
	| MicrosoftTeamsV11TaskGetNode
	| MicrosoftTeamsV11TaskGetAllNode
	| MicrosoftTeamsV11TaskUpdateNode
	;