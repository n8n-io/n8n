/**
 * Mattermost Node Types
 *
 * Sends data to Mattermost
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mattermost/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Add a user to a channel */
export type MattermostV1ChannelAddUserConfig = {
	resource: 'channel';
	operation: 'addUser';
	/**
	 * The ID of the channel to invite user to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["addUser"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * The ID of the user to invite into channel. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["addUser"], resource: ["channel"] }
	 */
	userId: string | Expression<string>;
};

/** Create a new channel */
export type MattermostV1ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
	/**
	 * The Mattermost Team. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * The non-unique UI name for the channel
	 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
	 */
	displayName: string | Expression<string>;
	/**
	 * The unique handle for the channel, will be present in the channel URL
	 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
	 */
	channel: string | Expression<string>;
	/**
	 * The type of channel to create
	 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
	 * @default public
	 */
	type?: 'private' | 'public' | Expression<string>;
};

/** Soft delete a channel */
export type MattermostV1ChannelDeleteConfig = {
	resource: 'channel';
	operation: 'delete';
	/**
	 * The ID of the channel to soft delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["delete"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
};

/** Get a page of members for a channel */
export type MattermostV1ChannelMembersConfig = {
	resource: 'channel';
	operation: 'members';
	/**
	 * The Mattermost Team. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["members"], resource: ["channel"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * The Mattermost Team. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["members"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * By default the response only contain the ID of the user. If this option gets activated, it will resolve the user automatically.
	 * @displayOptions.show { resource: ["channel"], operation: ["members"] }
	 * @default true
	 */
	resolveData?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["members"], resource: ["channel"] }
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["members"], resource: ["channel"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Restores a soft deleted channel */
export type MattermostV1ChannelRestoreConfig = {
	resource: 'channel';
	operation: 'restore';
	/**
	 * The ID of the channel to restore
	 * @displayOptions.show { operation: ["restore"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
};

/** Search for a channel */
export type MattermostV1ChannelSearchConfig = {
	resource: 'channel';
	operation: 'search';
	/**
	 * The Mattermost Team. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["search"], resource: ["channel"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * The search term for Channels in a Team
	 * @displayOptions.show { operation: ["search"], resource: ["channel"] }
	 */
	term: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["search"], resource: ["channel"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["search"], resource: ["channel"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Get statistics for a channel */
export type MattermostV1ChannelStatisticsConfig = {
	resource: 'channel';
	operation: 'statistics';
	/**
	 * The ID of the channel to get the statistics from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["statistics"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
};

/** Soft delete a channel */
export type MattermostV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	/**
	 * ID of the post to delete
	 * @displayOptions.show { resource: ["message"], operation: ["delete"] }
	 */
	postId: string | Expression<string>;
};

/** Post a message into a channel */
export type MattermostV1MessagePostConfig = {
	resource: 'message';
	operation: 'post';
	/**
	 * The ID of the channel to post to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["post"], resource: ["message"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * The text to send
	 * @displayOptions.show { operation: ["post"], resource: ["message"] }
	 */
	message?: string | Expression<string>;
	/**
	 * The attachment to add
	 * @displayOptions.show { operation: ["post"], resource: ["message"] }
	 * @default {}
	 */
	attachments?: Record<string, unknown>;
	/**
	 * Other options to set
	 * @displayOptions.show { operation: ["post"], resource: ["message"] }
	 * @default {}
	 */
	otherOptions?: Record<string, unknown>;
};

/** Post an ephemeral message into a channel */
export type MattermostV1MessagePostEphemeralConfig = {
	resource: 'message';
	operation: 'postEphemeral';
	/**
	 * ID of the user to send the ephemeral message to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["postEphemeral"], resource: ["message"] }
	 */
	userId: string | Expression<string>;
	/**
	 * ID of the channel to send the ephemeral message in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["postEphemeral"], resource: ["message"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * Text to send in the ephemeral message
	 * @displayOptions.show { operation: ["postEphemeral"], resource: ["message"] }
	 */
	message?: string | Expression<string>;
};

/** Create a new channel */
export type MattermostV1ReactionCreateConfig = {
	resource: 'reaction';
	operation: 'create';
	/**
	 * ID of the user sending the reaction. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["reaction"], operation: ["create"] }
	 */
	userId: string | Expression<string>;
	/**
	 * ID of the post to react to. Obtainable from the post link: &lt;code&gt;https://mattermost.internal.n8n.io/[server]/pl/[postId]&lt;/code&gt;
	 * @displayOptions.show { resource: ["reaction"], operation: ["create"] }
	 */
	postId: string | Expression<string>;
	/**
	 * Emoji to use for this reaction
	 * @displayOptions.show { resource: ["reaction"], operation: ["create"] }
	 */
	emojiName: string | Expression<string>;
};

/** Soft delete a channel */
export type MattermostV1ReactionDeleteConfig = {
	resource: 'reaction';
	operation: 'delete';
	/**
	 * ID of the user whose reaction to delete. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["reaction"], operation: ["delete"] }
	 */
	userId: string | Expression<string>;
	/**
	 * ID of the post whose reaction to delete. Obtainable from the post link: &lt;code&gt;https://mattermost.internal.n8n.io/[server]/pl/[postId]&lt;/code&gt;
	 * @displayOptions.show { resource: ["reaction"], operation: ["delete"] }
	 */
	postId: string | Expression<string>;
	/**
	 * Name of the emoji to delete
	 * @displayOptions.show { resource: ["reaction"], operation: ["delete"] }
	 */
	emojiName: string | Expression<string>;
};

/** Get many reactions to one or more posts */
export type MattermostV1ReactionGetAllConfig = {
	resource: 'reaction';
	operation: 'getAll';
	/**
	 * One or more (comma-separated) posts to retrieve reactions from
	 * @displayOptions.show { resource: ["reaction"], operation: ["getAll"] }
	 */
	postId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["reaction"] }
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["reaction"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Create a new channel */
export type MattermostV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	username: string | Expression<string>;
	authService?: 'email' | 'gitlab' | 'google' | 'ldap' | 'office365' | 'saml' | Expression<string>;
	authData?: string | Expression<string>;
	email?: string | Expression<string>;
	/**
	 * The password used for email authentication
	 * @displayOptions.show { resource: ["user"], operation: ["create"], authService: ["email"] }
	 */
	password?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Deactivates the user and revokes all its sessions by archiving its user object */
export type MattermostV1UserDeactiveConfig = {
	resource: 'user';
	operation: 'deactive';
	/**
	 * User GUID
	 * @displayOptions.show { resource: ["user"], operation: ["deactive"] }
	 */
	userId: string | Expression<string>;
};

/** Get a user by email */
export type MattermostV1UserGetByEmailConfig = {
	resource: 'user';
	operation: 'getByEmail';
	/**
	 * User's email
	 * @displayOptions.show { resource: ["user"], operation: ["getByEmail"] }
	 */
	email: string | Expression<string>;
};

/** Get a user by ID */
export type MattermostV1UserGetByIdConfig = {
	resource: 'user';
	operation: 'getById';
	/**
	 * User's ID
	 * @displayOptions.show { resource: ["user"], operation: ["getById"] }
	 */
	userIds: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many reactions to one or more posts */
export type MattermostV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Invite user to team */
export type MattermostV1UserInviteConfig = {
	resource: 'user';
	operation: 'invite';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["user"], operation: ["invite"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * User's email. Multiple emails can be set separated by comma.
	 * @displayOptions.show { resource: ["user"], operation: ["invite"] }
	 */
	emails: string | Expression<string>;
};

export type MattermostV1Params =
	| MattermostV1ChannelAddUserConfig
	| MattermostV1ChannelCreateConfig
	| MattermostV1ChannelDeleteConfig
	| MattermostV1ChannelMembersConfig
	| MattermostV1ChannelRestoreConfig
	| MattermostV1ChannelSearchConfig
	| MattermostV1ChannelStatisticsConfig
	| MattermostV1MessageDeleteConfig
	| MattermostV1MessagePostConfig
	| MattermostV1MessagePostEphemeralConfig
	| MattermostV1ReactionCreateConfig
	| MattermostV1ReactionDeleteConfig
	| MattermostV1ReactionGetAllConfig
	| MattermostV1UserCreateConfig
	| MattermostV1UserDeactiveConfig
	| MattermostV1UserGetByEmailConfig
	| MattermostV1UserGetByIdConfig
	| MattermostV1UserGetAllConfig
	| MattermostV1UserInviteConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MattermostV1Credentials {
	mattermostApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MattermostV1Node = {
	type: 'n8n-nodes-base.mattermost';
	version: 1;
	config: NodeConfig<MattermostV1Params>;
	credentials?: MattermostV1Credentials;
};

export type MattermostNode = MattermostV1Node;
