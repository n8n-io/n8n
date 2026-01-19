/**
 * Microsoft Teams Node - Version 2
 * Consume Microsoft Teams API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a channel */
export type MicrosoftTeamsV2ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
/**
 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
 * @displayOptions.show { resource: ["channel"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		teamId: ResourceLocatorValue;
/**
 * The name of the new channel you want to create
 * @displayOptions.show { resource: ["channel"], operation: ["create"] }
 */
		name: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a channel */
export type MicrosoftTeamsV2ChannelDeleteChannelConfig = {
	resource: 'channel';
	operation: 'deleteChannel';
/**
 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
 * @displayOptions.show { resource: ["channel"], operation: ["deleteChannel"] }
 * @default {"mode":"list","value":""}
 */
		teamId: ResourceLocatorValue;
/**
 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
 * @displayOptions.show { resource: ["channel"], operation: ["deleteChannel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV2ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
/**
 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
 * @displayOptions.show { resource: ["channel"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		teamId: ResourceLocatorValue;
/**
 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
 * @displayOptions.show { resource: ["channel"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		channelId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV2ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
/**
 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
 * @displayOptions.show { resource: ["channel"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		teamId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["channel"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["channel"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Update a channel */
export type MicrosoftTeamsV2ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
/**
 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
 * @displayOptions.show { resource: ["channel"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		teamId: ResourceLocatorValue;
/**
 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
 * @displayOptions.show { resource: ["channel"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		channelId: string | Expression<string>;
/**
 * The name of the channel
 * @displayOptions.show { resource: ["channel"], operation: ["update"] }
 */
		name?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a channel */
export type MicrosoftTeamsV2ChannelMessageCreateConfig = {
	resource: 'channelMessage';
	operation: 'create';
/**
 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
 * @displayOptions.show { resource: ["channelMessage"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		teamId: ResourceLocatorValue;
/**
 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
 * @displayOptions.show { resource: ["channelMessage"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		channelId: string | Expression<string>;
/**
 * Whether the message is plain text or HTML
 * @displayOptions.show { resource: ["channelMessage"], operation: ["create"] }
 * @default text
 */
		contentType: 'text' | 'html' | Expression<string>;
/**
 * The content of the message to be sent
 * @displayOptions.show { resource: ["channelMessage"], operation: ["create"] }
 */
		message: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many channels */
export type MicrosoftTeamsV2ChannelMessageGetAllConfig = {
	resource: 'channelMessage';
	operation: 'getAll';
/**
 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
 * @displayOptions.show { resource: ["channelMessage"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		teamId: ResourceLocatorValue;
/**
 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
 * @displayOptions.show { resource: ["channelMessage"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		channelId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["channelMessage"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["channelMessage"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Create a channel */
export type MicrosoftTeamsV2ChatMessageCreateConfig = {
	resource: 'chatMessage';
	operation: 'create';
/**
 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
 * @displayOptions.show { resource: ["chatMessage"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		chatId: ResourceLocatorValue;
/**
 * Whether the message is plain text or HTML
 * @displayOptions.show { resource: ["chatMessage"], operation: ["create"] }
 * @default text
 */
		contentType: 'text' | 'html' | Expression<string>;
/**
 * The content of the message to be sent
 * @displayOptions.show { resource: ["chatMessage"], operation: ["create"] }
 */
		message: string | Expression<string>;
/**
 * Other options to set
 * @displayOptions.show { resource: ["chatMessage"], operation: ["create"] }
 * @default {}
 */
		options?: Record<string, unknown>;
};

/** Get a channel */
export type MicrosoftTeamsV2ChatMessageGetConfig = {
	resource: 'chatMessage';
	operation: 'get';
/**
 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
 * @displayOptions.show { resource: ["chatMessage"], operation: ["get"] }
 * @default {"mode":"list","value":""}
 */
		chatId: ResourceLocatorValue;
/**
 * The ID of the message to retrieve
 * @displayOptions.show { resource: ["chatMessage"], operation: ["get"] }
 */
		messageId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV2ChatMessageGetAllConfig = {
	resource: 'chatMessage';
	operation: 'getAll';
/**
 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
 * @displayOptions.show { resource: ["chatMessage"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		chatId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["chatMessage"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["chatMessage"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Send a message and wait for response */
export type MicrosoftTeamsV2ChatMessageSendAndWaitConfig = {
	resource: 'chatMessage';
	operation: 'sendAndWait';
/**
 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
 * @displayOptions.show { resource: ["chatMessage"], operation: ["sendAndWait"] }
 * @default {"mode":"list","value":""}
 */
		chatId: ResourceLocatorValue;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	approvalOptions?: {
		values?: {
			/** Type of Approval
			 * @default single
			 */
			approvalType?: 'single' | 'double' | Expression<string>;
			/** Approve Button Label
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default ✓ Approve
			 */
			approveLabel?: string | Expression<string>;
			/** Disapprove Button Label
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default ✗ Decline
			 */
			disapproveLabel?: string | Expression<string>;
		};
	};
	options?: Record<string, unknown>;
};

/** Create a channel */
export type MicrosoftTeamsV2TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	groupId: string | Expression<string>;
/**
 * The plan for the task to belong to
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		planId: string | Expression<string>;
/**
 * The bucket for the task to belong to
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		bucketId: string | Expression<string>;
/**
 * Title of the task
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		title: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a task */
export type MicrosoftTeamsV2TaskDeleteTaskConfig = {
	resource: 'task';
	operation: 'deleteTask';
/**
 * The ID of the task to delete
 * @displayOptions.show { resource: ["task"], operation: ["deleteTask"] }
 */
		taskId: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV2TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * The ID of the task to retrieve
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 */
		taskId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV2TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * Whether to retrieve the tasks for a user or for a plan
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default member
 */
		tasksFor: 'member' | 'plan' | Expression<string>;
	groupId: string | Expression<string>;
/**
 * The plan for the task to belong to
 * @displayOptions.show { tasksFor: ["plan"], resource: ["task"], operation: ["getAll"] }
 * @default {"mode":"list","value":""}
 */
		planId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["task"], operation: ["getAll"] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Update a channel */
export type MicrosoftTeamsV2TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * The ID of the task to update
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
 */
		taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftTeamsV2Credentials {
	microsoftTeamsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MicrosoftTeamsV2NodeBase {
	type: 'n8n-nodes-base.microsoftTeams';
	version: 2;
	credentials?: MicrosoftTeamsV2Credentials;
}

export type MicrosoftTeamsV2ChannelCreateNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChannelCreateConfig>;
};

export type MicrosoftTeamsV2ChannelDeleteChannelNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChannelDeleteChannelConfig>;
};

export type MicrosoftTeamsV2ChannelGetNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChannelGetConfig>;
};

export type MicrosoftTeamsV2ChannelGetAllNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChannelGetAllConfig>;
};

export type MicrosoftTeamsV2ChannelUpdateNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChannelUpdateConfig>;
};

export type MicrosoftTeamsV2ChannelMessageCreateNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChannelMessageCreateConfig>;
};

export type MicrosoftTeamsV2ChannelMessageGetAllNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChannelMessageGetAllConfig>;
};

export type MicrosoftTeamsV2ChatMessageCreateNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChatMessageCreateConfig>;
};

export type MicrosoftTeamsV2ChatMessageGetNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChatMessageGetConfig>;
};

export type MicrosoftTeamsV2ChatMessageGetAllNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChatMessageGetAllConfig>;
};

export type MicrosoftTeamsV2ChatMessageSendAndWaitNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2ChatMessageSendAndWaitConfig>;
};

export type MicrosoftTeamsV2TaskCreateNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2TaskCreateConfig>;
};

export type MicrosoftTeamsV2TaskDeleteTaskNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2TaskDeleteTaskConfig>;
};

export type MicrosoftTeamsV2TaskGetNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2TaskGetConfig>;
};

export type MicrosoftTeamsV2TaskGetAllNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2TaskGetAllConfig>;
};

export type MicrosoftTeamsV2TaskUpdateNode = MicrosoftTeamsV2NodeBase & {
	config: NodeConfig<MicrosoftTeamsV2TaskUpdateConfig>;
};

export type MicrosoftTeamsV2Node =
	| MicrosoftTeamsV2ChannelCreateNode
	| MicrosoftTeamsV2ChannelDeleteChannelNode
	| MicrosoftTeamsV2ChannelGetNode
	| MicrosoftTeamsV2ChannelGetAllNode
	| MicrosoftTeamsV2ChannelUpdateNode
	| MicrosoftTeamsV2ChannelMessageCreateNode
	| MicrosoftTeamsV2ChannelMessageGetAllNode
	| MicrosoftTeamsV2ChatMessageCreateNode
	| MicrosoftTeamsV2ChatMessageGetNode
	| MicrosoftTeamsV2ChatMessageGetAllNode
	| MicrosoftTeamsV2ChatMessageSendAndWaitNode
	| MicrosoftTeamsV2TaskCreateNode
	| MicrosoftTeamsV2TaskDeleteTaskNode
	| MicrosoftTeamsV2TaskGetNode
	| MicrosoftTeamsV2TaskGetAllNode
	| MicrosoftTeamsV2TaskUpdateNode
	;