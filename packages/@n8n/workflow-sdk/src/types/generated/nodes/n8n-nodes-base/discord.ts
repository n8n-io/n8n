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
	embeds?: {
		values?: Array<{
			inputMethod?: 'fields' | 'json' | Expression<string>;
			json?: IDataObject | string | Expression<string>;
			description?: string | Expression<string>;
			author?: string | Expression<string>;
			color?: string | Expression<string>;
			timestamp?: string | Expression<string>;
			title?: string | Expression<string>;
			url?: string | Expression<string>;
			image?: string | Expression<string>;
			thumbnail?: string | Expression<string>;
			video?: string | Expression<string>;
		}>;
	};
	files?: { values?: Array<{ inputFieldName?: string | Expression<string> }> };
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
	formFields?: {
		values?: Array<{
			fieldName?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldName?: string | Expression<string>;
			fieldType?:
				| 'checkbox'
				| 'html'
				| 'date'
				| 'dropdown'
				| 'email'
				| 'file'
				| 'hiddenField'
				| 'number'
				| 'password'
				| 'radio'
				| 'text'
				| 'textarea'
				| Expression<string>;
			elementName?: string | Expression<string>;
			fieldName?: string | Expression<string>;
			placeholder?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			multiselect?: boolean | Expression<boolean>;
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			numberOfSelections?: number | Expression<number>;
			minSelections?: number | Expression<number>;
			maxSelections?: number | Expression<number>;
			html?: string | Expression<string>;
			multipleFiles?: boolean | Expression<boolean>;
			acceptFileTypes?: string | Expression<string>;
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
	approvalOptions?: {
		values?: {
			approvalType?: 'single' | 'double' | Expression<string>;
			approveLabel?: string | Expression<string>;
			disapproveLabel?: string | Expression<string>;
		};
	};
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
// Node Types
// ===========================================================================

export type DiscordV2Node = {
	type: 'n8n-nodes-base.discord';
	version: 2;
	config: NodeConfig<DiscordV2Params>;
	credentials?: DiscordV2Credentials;
};

export type DiscordV1Node = {
	type: 'n8n-nodes-base.discord';
	version: 1;
	config: NodeConfig<DiscordV1Params>;
	credentials?: Record<string, never>;
};

export type DiscordNode = DiscordV2Node | DiscordV1Node;
