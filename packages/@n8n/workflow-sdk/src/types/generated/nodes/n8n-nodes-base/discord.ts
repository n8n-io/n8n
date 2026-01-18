/**
 * Discord Node Types
 *
 * Sends data to Discord
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/discord/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new channel */
export type DiscordV2ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * The name of the channel
	 */
	name: string | Expression<string>;
	/**
	 * The type of channel to create
	 * @default 0
	 */
	type: '0' | '2' | '4' | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a channel */
export type DiscordV2ChannelDeleteChannelConfig = {
	resource: 'channel';
	operation: 'deleteChannel';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Select the channel by name, URL, or ID
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
};

/** Get a message in a channel */
export type DiscordV2ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Select the channel by name, URL, or ID
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
};

/** Retrieve the latest messages in a channel */
export type DiscordV2ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
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
	options?: Record<string, unknown>;
};

/** Update a channel */
export type DiscordV2ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Select the channel by name, URL, or ID
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * The new name of the channel. Fill this field only if you want to change the channel's name.
	 */
	name?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a message in a channel */
export type DiscordV2MessageDeleteMessageConfig = {
	resource: 'message';
	operation: 'deleteMessage';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Select the channel by name, URL, or ID
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * The ID of the message
	 */
	messageId: string | Expression<string>;
};

/** Get a message in a channel */
export type DiscordV2MessageGetConfig = {
	resource: 'message';
	operation: 'get';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Select the channel by name, URL, or ID
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * The ID of the message
	 */
	messageId: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Retrieve the latest messages in a channel */
export type DiscordV2MessageGetAllConfig = {
	resource: 'message';
	operation: 'getAll';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Select the channel by name, URL, or ID
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
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
	options?: Record<string, unknown>;
};

/** React to a message with an emoji */
export type DiscordV2MessageReactConfig = {
	resource: 'message';
	operation: 'react';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Select the channel by name, URL, or ID
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * The ID of the message
	 */
	messageId: string | Expression<string>;
	/**
	 * The emoji you want to react with
	 */
	emoji: string | Expression<string>;
};

/** Send a message to a channel, thread, or member */
export type DiscordV2MessageSendConfig = {
	resource: 'message';
	operation: 'send';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Send message to a channel or DM to a user
	 * @default channel
	 */
	sendTo?: 'user' | 'channel' | Expression<string>;
	/**
	 * Select the user you want to assign a role to
	 * @default {"mode":"list","value":""}
	 */
	userId?: ResourceLocatorValue;
	/**
	 * Select the channel by name, URL, or ID
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * The content of the message (up to 2000 characters)
	 */
	content?: string | Expression<string>;
	options?: Record<string, unknown>;
	embeds?: Record<string, unknown>;
	files?: Record<string, unknown>;
};

/** Send a message and wait for response */
export type DiscordV2MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Send message to a channel or DM to a user
	 * @default channel
	 */
	sendTo?: 'user' | 'channel' | Expression<string>;
	/**
	 * Select the user you want to assign a role to
	 * @default {"mode":"list","value":""}
	 */
	userId?: ResourceLocatorValue;
	/**
	 * Select the channel by name, URL, or ID
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	formFields?: Record<string, unknown>;
	approvalOptions?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Retrieve the latest messages in a channel */
export type DiscordV2MemberGetAllConfig = {
	resource: 'member';
	operation: 'getAll';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
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
	/**
	 * The ID of the user after which to return the members
	 */
	after?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Add a role to a member */
export type DiscordV2MemberRoleAddConfig = {
	resource: 'member';
	operation: 'roleAdd';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Select the user you want to assign a role to
	 * @default {"mode":"list","value":""}
	 */
	userId?: ResourceLocatorValue;
	/**
	 * Select the roles you want to add to the user
	 * @default []
	 */
	role: string[];
};

/** Remove a role from a member */
export type DiscordV2MemberRoleRemoveConfig = {
	resource: 'member';
	operation: 'roleRemove';
	/**
	 * Select the server (guild) that your bot is connected to
	 * @default {"mode":"list","value":""}
	 */
	guildId: ResourceLocatorValue;
	/**
	 * Select the user you want to assign a role to
	 * @default {"mode":"list","value":""}
	 */
	userId?: ResourceLocatorValue;
	/**
	 * Select the roles you want to add to the user
	 * @default []
	 */
	role: string[];
};

export type DiscordV2Params =
	| DiscordV2ChannelCreateConfig
	| DiscordV2ChannelDeleteChannelConfig
	| DiscordV2ChannelGetConfig
	| DiscordV2ChannelGetAllConfig
	| DiscordV2ChannelUpdateConfig
	| DiscordV2MessageDeleteMessageConfig
	| DiscordV2MessageGetConfig
	| DiscordV2MessageGetAllConfig
	| DiscordV2MessageReactConfig
	| DiscordV2MessageSendConfig
	| DiscordV2MessageSendAndWaitConfig
	| DiscordV2MemberGetAllConfig
	| DiscordV2MemberRoleAddConfig
	| DiscordV2MemberRoleRemoveConfig;

export interface DiscordV1Params {
	webhookUri: string | Expression<string>;
	text?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface DiscordV2Credentials {
	discordBotApi: CredentialReference;
	discordOAuth2Api: CredentialReference;
	discordWebhookApi?: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type DiscordNode = {
	type: 'n8n-nodes-base.discord';
	version: 1 | 2;
	config: NodeConfig<DiscordV2Params>;
	credentials?: DiscordV2Credentials;
};
