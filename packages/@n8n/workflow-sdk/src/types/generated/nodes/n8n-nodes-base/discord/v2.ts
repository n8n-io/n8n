/**
 * Discord Node - Version 2
 * Sends data to Discord
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

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
 * @displayOptions.show { resource: ["channel"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * The name of the channel
 * @displayOptions.show { resource: ["channel"], operation: ["create"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 */
		name: string | Expression<string>;
/**
 * The type of channel to create
 * @displayOptions.show { resource: ["channel"], operation: ["create"] }
 * @displayOptions.hide { authentication: ["webhook"] }
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
 * @displayOptions.show { resource: ["channel"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Select the channel by name, URL, or ID
 * @displayOptions.show { resource: ["channel"], operation: ["deleteChannel"] }
 * @displayOptions.hide { authentication: ["webhook"] }
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
 * @displayOptions.show { resource: ["channel"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Select the channel by name, URL, or ID
 * @displayOptions.show { resource: ["channel"], operation: ["get"] }
 * @displayOptions.hide { authentication: ["webhook"] }
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
 * @displayOptions.show { resource: ["channel"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["channel"], operation: ["getAll"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["channel"], operation: ["getAll"] }
 * @displayOptions.hide { authentication: ["webhook"] }
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
 * @displayOptions.show { resource: ["channel"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Select the channel by name, URL, or ID
 * @displayOptions.show { resource: ["channel"], operation: ["update"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * The new name of the channel. Fill this field only if you want to change the channel's name.
 * @displayOptions.show { resource: ["channel"], operation: ["update"] }
 * @displayOptions.hide { authentication: ["webhook"] }
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
 * @displayOptions.show { resource: ["message"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Select the channel by name, URL, or ID
 * @displayOptions.show { resource: ["message"], operation: ["deleteMessage"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * The ID of the message
 * @displayOptions.show { resource: ["message"], operation: ["deleteMessage"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 */
		messageId: string | Expression<string>;
};

/** Get a message in a channel */
export type DiscordV2MessageGetConfig = {
	resource: 'message';
	operation: 'get';
/**
 * Select the server (guild) that your bot is connected to
 * @displayOptions.show { resource: ["message"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Select the channel by name, URL, or ID
 * @displayOptions.show { resource: ["message"], operation: ["get"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * The ID of the message
 * @displayOptions.show { resource: ["message"], operation: ["get"] }
 * @displayOptions.hide { authentication: ["webhook"] }
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
 * @displayOptions.show { resource: ["message"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Select the channel by name, URL, or ID
 * @displayOptions.show { resource: ["message"], operation: ["getAll"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["message"], operation: ["getAll"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["message"], operation: ["getAll"] }
 * @displayOptions.hide { authentication: ["webhook"] }
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
 * @displayOptions.show { resource: ["message"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Select the channel by name, URL, or ID
 * @displayOptions.show { resource: ["message"], operation: ["react"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * The ID of the message
 * @displayOptions.show { resource: ["message"], operation: ["react"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 */
		messageId: string | Expression<string>;
/**
 * The emoji you want to react with
 * @displayOptions.show { resource: ["message"], operation: ["react"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 */
		emoji: string | Expression<string>;
};

/** Send a message to a channel, thread, or member */
export type DiscordV2MessageSendConfig = {
	resource: 'message';
	operation: 'send';
/**
 * Select the server (guild) that your bot is connected to
 * @displayOptions.show { resource: ["message"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Send message to a channel or DM to a user
 * @displayOptions.show { resource: ["message"], operation: ["send"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default channel
 */
		sendTo?: 'user' | 'channel' | Expression<string>;
/**
 * Select the user you want to assign a role to
 * @displayOptions.show { sendTo: ["user"], resource: ["message"], operation: ["send"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default {"mode":"list","value":""}
 */
		userId?: ResourceLocatorValue;
/**
 * Select the channel by name, URL, or ID
 * @displayOptions.show { sendTo: ["channel"], resource: ["message"], operation: ["send"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * The content of the message (up to 2000 characters)
 * @displayOptions.show { resource: ["message"], operation: ["send"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 */
		content?: string | Expression<string>;
	options?: Record<string, unknown>;
	embeds?: {
		values?: Array<{
			/** Input Method
			 * @default fields
			 */
			inputMethod?: 'fields' | 'json' | Expression<string>;
			/** Value
			 * @displayOptions.show { inputMethod: ["json"] }
			 * @default ={}
			 */
			json?: IDataObject | string | Expression<string>;
			/** The description of embed
			 * @displayOptions.show { inputMethod: ["fields"] }
			 */
			description?: string | Expression<string>;
			/** The name of the author
			 * @displayOptions.show { inputMethod: ["fields"] }
			 */
			author?: string | Expression<string>;
			/** Color code of the embed
			 * @displayOptions.show { inputMethod: ["fields"] }
			 */
			color?: string | Expression<string>;
			/** The time displayed at the bottom of the embed. Provide in ISO8601 format.
			 * @displayOptions.show { inputMethod: ["fields"] }
			 */
			timestamp?: string | Expression<string>;
			/** The title of embed
			 * @displayOptions.show { inputMethod: ["fields"] }
			 */
			title?: string | Expression<string>;
			/** The URL where you want to link the embed to
			 * @displayOptions.show { inputMethod: ["fields"] }
			 */
			url?: string | Expression<string>;
			/** Source URL of image (only supports http(s) and attachments)
			 * @displayOptions.show { inputMethod: ["fields"] }
			 */
			image?: string | Expression<string>;
			/** Source URL of thumbnail (only supports http(s) and attachments)
			 * @displayOptions.show { inputMethod: ["fields"] }
			 */
			thumbnail?: string | Expression<string>;
			/** Source URL of video
			 * @displayOptions.show { inputMethod: ["fields"] }
			 */
			video?: string | Expression<string>;
		}>;
	};
	files?: {
		values?: Array<{
			/** The contents of the file being sent with the message
			 * @hint The name of the input field containing the binary file data to be sent
			 * @default data
			 */
			inputFieldName?: string | Expression<string>;
		}>;
	};
};

/** Send a message and wait for response */
export type DiscordV2MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
/**
 * Select the server (guild) that your bot is connected to
 * @displayOptions.show { resource: ["message"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Send message to a channel or DM to a user
 * @displayOptions.show { resource: ["message"], operation: ["sendAndWait"] }
 * @default channel
 */
		sendTo?: 'user' | 'channel' | Expression<string>;
/**
 * Select the user you want to assign a role to
 * @displayOptions.show { sendTo: ["user"], resource: ["message"], operation: ["sendAndWait"] }
 * @default {"mode":"list","value":""}
 */
		userId?: ResourceLocatorValue;
/**
 * Select the channel by name, URL, or ID
 * @displayOptions.show { sendTo: ["channel"], resource: ["message"], operation: ["sendAndWait"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
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

/** Retrieve the latest messages in a channel */
export type DiscordV2MemberGetAllConfig = {
	resource: 'member';
	operation: 'getAll';
/**
 * Select the server (guild) that your bot is connected to
 * @displayOptions.show { resource: ["member"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["member"], operation: ["getAll"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { returnAll: [false], resource: ["member"], operation: ["getAll"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * The ID of the user after which to return the members
 * @displayOptions.show { resource: ["member"], operation: ["getAll"] }
 * @displayOptions.hide { authentication: ["webhook"] }
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
 * @displayOptions.show { resource: ["member"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Select the user you want to assign a role to
 * @displayOptions.show { resource: ["member"], operation: ["roleAdd"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default {"mode":"list","value":""}
 */
		userId?: ResourceLocatorValue;
/**
 * Select the roles you want to add to the user
 * @displayOptions.show { resource: ["member"], operation: ["roleAdd"] }
 * @displayOptions.hide { authentication: ["webhook"] }
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
 * @displayOptions.show { resource: ["member"], authentication: ["botToken", "oAuth2"] }
 * @default {"mode":"list","value":""}
 */
		guildId: ResourceLocatorValue;
/**
 * Select the user you want to assign a role to
 * @displayOptions.show { resource: ["member"], operation: ["roleRemove"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default {"mode":"list","value":""}
 */
		userId?: ResourceLocatorValue;
/**
 * Select the roles you want to add to the user
 * @displayOptions.show { resource: ["member"], operation: ["roleRemove"] }
 * @displayOptions.hide { authentication: ["webhook"] }
 * @default []
 */
		role: string[];
};


// ===========================================================================
// Output Types
// ===========================================================================

export type DiscordV2ChannelCreateOutput = {
	flags?: number;
	guild_id?: string;
	id?: string;
	last_message_id?: null;
	name?: string;
	nsfw?: boolean;
	permission_overwrites?: Array<{
		allow?: string;
		deny?: string;
		id?: string;
		type?: number;
	}>;
	position?: number;
	rate_limit_per_user?: number;
	type?: number;
};

export type DiscordV2ChannelDeleteChannelOutput = {
	flags?: number;
	guild_id?: string;
	icon_emoji?: {
		id?: null;
		name?: string;
	};
	id?: string;
	name?: string;
	nsfw?: boolean;
	permission_overwrites?: Array<{
		allow?: string;
		deny?: string;
		id?: string;
		type?: number;
	}>;
	position?: number;
	rate_limit_per_user?: number;
	theme_color?: null;
	topic?: null;
	type?: number;
};

export type DiscordV2ChannelGetOutput = {
	flags?: number;
	guild_id?: string;
	id?: string;
	name?: string;
	nsfw?: boolean;
	permission_overwrites?: Array<{
		allow?: string;
		deny?: string;
		id?: string;
		type?: number;
	}>;
	position?: number;
	rate_limit_per_user?: number;
	type?: number;
};

export type DiscordV2ChannelGetAllOutput = {
	flags?: number;
	guild_id?: string;
	icon_emoji?: {
		id?: null;
		name?: string;
	};
	id?: string;
	name?: string;
	nsfw?: boolean;
	permission_overwrites?: Array<{
		allow?: string;
		deny?: string;
		id?: string;
		type?: number;
	}>;
	position?: number;
	rate_limit_per_user?: number;
	theme_color?: null;
	type?: number;
};

export type DiscordV2MessageDeleteMessageOutput = {
	success?: boolean;
};

export type DiscordV2MessageGetOutput = {
	attachments?: Array<{
		content_scan_version?: number;
		content_type?: string;
		filename?: string;
		height?: number;
		id?: string;
		placeholder?: string;
		placeholder_version?: number;
		proxy_url?: string;
		size?: number;
		url?: string;
		width?: number;
	}>;
	author?: {
		accent_color?: null;
		banner?: null;
		banner_color?: null;
		collectibles?: null;
		discriminator?: string;
		flags?: number;
		id?: string;
		public_flags?: number;
		username?: string;
	};
	channel_id?: string;
	components?: Array<{
		components?: Array<{
			custom_id?: string;
			id?: number;
			label?: string;
			style?: number;
			type?: number;
		}>;
		id?: number;
		type?: number;
	}>;
	content?: string;
	embeds?: Array<{
		color?: number;
		content_scan_version?: number;
		description?: string;
		thumbnail?: {
			flags?: number;
			height?: number;
			placeholder?: string;
			placeholder_version?: number;
			proxy_url?: string;
			url?: string;
			width?: number;
		};
		title?: string;
		type?: string;
		url?: string;
	}>;
	flags?: number;
	id?: string;
	mention_everyone?: boolean;
	mention_roles?: Array<string>;
	mentions?: Array<{
		accent_color?: null;
		avatar_decoration_data?: null;
		banner?: null;
		banner_color?: null;
		clan?: null;
		discriminator?: string;
		flags?: number;
		id?: string;
		primary_guild?: null;
		public_flags?: number;
		username?: string;
	}>;
	pinned?: boolean;
	timestamp?: string;
	tts?: boolean;
	type?: number;
};

export type DiscordV2MessageGetAllOutput = {
	attachments?: Array<{
		content_type?: string;
		filename?: string;
		height?: number;
		id?: string;
		placeholder?: string;
		placeholder_version?: number;
		proxy_url?: string;
		size?: number;
		url?: string;
		width?: number;
	}>;
	author?: {
		accent_color?: null;
		banner?: null;
		banner_color?: null;
		clan?: null;
		collectibles?: null;
		discriminator?: string;
		flags?: number;
		id?: string;
		primary_guild?: null;
		public_flags?: number;
		username?: string;
	};
	channel_id?: string;
	components?: Array<{
		components?: Array<{
			id?: number;
			label?: string;
			style?: number;
			type?: number;
			url?: string;
		}>;
		id?: number;
		type?: number;
	}>;
	content?: string;
	embeds?: Array<{
		author?: {
			name?: string;
			url?: string;
		};
		color?: number;
		description?: string;
		provider?: {
			name?: string;
			url?: string;
		};
		thumbnail?: {
			flags?: number;
			height?: number;
			placeholder?: string;
			placeholder_version?: number;
			proxy_url?: string;
			url?: string;
			width?: number;
		};
		title?: string;
		type?: string;
		url?: string;
		video?: {
			flags?: number;
			height?: number;
			placeholder?: string;
			placeholder_version?: number;
			url?: string;
			width?: number;
		};
	}>;
	flags?: number;
	id?: string;
	mention_everyone?: boolean;
	mention_roles?: Array<string>;
	mentions?: Array<{
		accent_color?: null;
		banner?: null;
		banner_color?: null;
		clan?: null;
		collectibles?: null;
		discriminator?: string;
		flags?: number;
		id?: string;
		primary_guild?: null;
		public_flags?: number;
		username?: string;
	}>;
	pinned?: boolean;
	timestamp?: string;
	tts?: boolean;
	type?: number;
};

export type DiscordV2MessageReactOutput = {
	success?: boolean;
};

export type DiscordV2MessageSendOutput = {
	attachments?: Array<{
		content_scan_version?: number;
		content_type?: string;
		filename?: string;
		id?: string;
		proxy_url?: string;
		size?: number;
		title?: string;
		url?: string;
	}>;
	author?: {
		accent_color?: null;
		avatar_decoration_data?: null;
		banner_color?: null;
		bot?: boolean;
		clan?: null;
		collectibles?: null;
		discriminator?: string;
		flags?: number;
		global_name?: null;
		id?: string;
		primary_guild?: null;
		public_flags?: number;
		username?: string;
	};
	channel_id?: string;
	content?: string;
	edited_timestamp?: null;
	embeds?: Array<{
		color?: number;
		content_scan_version?: number;
		description?: string;
		title?: string;
		type?: string;
	}>;
	flags?: number;
	id?: string;
	mention_everyone?: boolean;
	mentions?: Array<{
		avatar_decoration_data?: null;
		clan?: null;
		collectibles?: null;
		discriminator?: string;
		flags?: number;
		id?: string;
		primary_guild?: null;
		public_flags?: number;
		username?: string;
	}>;
	pinned?: boolean;
	timestamp?: string;
	tts?: boolean;
	type?: number;
};

export type DiscordV2MessageSendAndWaitOutput = {
	data?: {
		approved?: boolean;
	};
};

export type DiscordV2MemberGetAllOutput = {
	communication_disabled_until?: null;
	deaf?: boolean;
	flags?: number;
	joined_at?: string;
	mute?: boolean;
	pending?: boolean;
	roles?: Array<string>;
	user?: {
		accent_color?: null;
		banner?: null;
		banner_color?: null;
		clan?: null;
		discriminator?: string;
		flags?: number;
		id?: string;
		public_flags?: number;
		username?: string;
	};
};

export type DiscordV2MemberRoleAddOutput = {
	success?: boolean;
};

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

interface DiscordV2NodeBase {
	type: 'n8n-nodes-base.discord';
	version: 2;
	credentials?: DiscordV2Credentials;
}

export type DiscordV2ChannelCreateNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2ChannelCreateConfig>;
	output?: DiscordV2ChannelCreateOutput;
};

export type DiscordV2ChannelDeleteChannelNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2ChannelDeleteChannelConfig>;
	output?: DiscordV2ChannelDeleteChannelOutput;
};

export type DiscordV2ChannelGetNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2ChannelGetConfig>;
	output?: DiscordV2ChannelGetOutput;
};

export type DiscordV2ChannelGetAllNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2ChannelGetAllConfig>;
	output?: DiscordV2ChannelGetAllOutput;
};

export type DiscordV2ChannelUpdateNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2ChannelUpdateConfig>;
};

export type DiscordV2MessageDeleteMessageNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2MessageDeleteMessageConfig>;
	output?: DiscordV2MessageDeleteMessageOutput;
};

export type DiscordV2MessageGetNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2MessageGetConfig>;
	output?: DiscordV2MessageGetOutput;
};

export type DiscordV2MessageGetAllNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2MessageGetAllConfig>;
	output?: DiscordV2MessageGetAllOutput;
};

export type DiscordV2MessageReactNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2MessageReactConfig>;
	output?: DiscordV2MessageReactOutput;
};

export type DiscordV2MessageSendNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2MessageSendConfig>;
	output?: DiscordV2MessageSendOutput;
};

export type DiscordV2MessageSendAndWaitNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2MessageSendAndWaitConfig>;
	output?: DiscordV2MessageSendAndWaitOutput;
};

export type DiscordV2MemberGetAllNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2MemberGetAllConfig>;
	output?: DiscordV2MemberGetAllOutput;
};

export type DiscordV2MemberRoleAddNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2MemberRoleAddConfig>;
	output?: DiscordV2MemberRoleAddOutput;
};

export type DiscordV2MemberRoleRemoveNode = DiscordV2NodeBase & {
	config: NodeConfig<DiscordV2MemberRoleRemoveConfig>;
};

export type DiscordV2Node =
	| DiscordV2ChannelCreateNode
	| DiscordV2ChannelDeleteChannelNode
	| DiscordV2ChannelGetNode
	| DiscordV2ChannelGetAllNode
	| DiscordV2ChannelUpdateNode
	| DiscordV2MessageDeleteMessageNode
	| DiscordV2MessageGetNode
	| DiscordV2MessageGetAllNode
	| DiscordV2MessageReactNode
	| DiscordV2MessageSendNode
	| DiscordV2MessageSendAndWaitNode
	| DiscordV2MemberGetAllNode
	| DiscordV2MemberRoleAddNode
	| DiscordV2MemberRoleRemoveNode
	;