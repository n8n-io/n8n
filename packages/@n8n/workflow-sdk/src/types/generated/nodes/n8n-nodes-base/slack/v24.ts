/**
 * Slack Node - Version 2.4
 * Consume Slack API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Archives a conversation */
export type SlackV24ChannelArchiveConfig = {
	resource: 'channel';
	operation: 'archive';
/**
 * The Slack channel to archive
 * @displayOptions.show { operation: ["archive"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId?: ResourceLocatorValue;
};

/** Closes a direct message or multi-person direct message */
export type SlackV24ChannelCloseConfig = {
	resource: 'channel';
	operation: 'close';
/**
 * The Slack channel to close
 * @displayOptions.show { operation: ["close"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
};

/** Initiates a public or private channel-based conversation */
export type SlackV24ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
	channelId: string | Expression<string>;
/**
 * Whether to create a Public or a Private Slack channel. &lt;a href="https://slack.com/help/articles/360017938993-What-is-a-channel"&gt;More info&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
 * @default public
 */
		channelVisibility: 'public' | 'private' | Expression<string>;
};

/** Get information about a channel */
export type SlackV24ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
/**
 * The Slack channel to get
 * @displayOptions.show { operation: ["get"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
	options?: Record<string, unknown>;
};

/** Get many channels in a Slack team */
export type SlackV24ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
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

/** Get a conversation's history of messages and events */
export type SlackV24ChannelHistoryConfig = {
	resource: 'channel';
	operation: 'history';
/**
 * The Slack channel to get the history from
 * @displayOptions.show { operation: ["history"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["channel"], operation: ["history"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["channel"], operation: ["history"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Invite a user to a channel */
export type SlackV24ChannelInviteConfig = {
	resource: 'channel';
	operation: 'invite';
/**
 * The Slack channel to invite to
 * @displayOptions.show { operation: ["invite"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * The ID of the user to invite into channel. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["invite"], resource: ["channel"] }
 * @default []
 */
		userIds: string[];
};

/** Joins an existing conversation */
export type SlackV24ChannelJoinConfig = {
	resource: 'channel';
	operation: 'join';
/**
 * The Slack channel to join
 * @displayOptions.show { operation: ["join"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
};

/** Removes a user from a channel */
export type SlackV24ChannelKickConfig = {
	resource: 'channel';
	operation: 'kick';
/**
 * The Slack channel to kick the user from
 * @displayOptions.show { operation: ["kick"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["kick"], resource: ["channel"] }
 */
		userId?: string | Expression<string>;
};

/** Leaves a conversation */
export type SlackV24ChannelLeaveConfig = {
	resource: 'channel';
	operation: 'leave';
/**
 * The Slack channel to leave from
 * @displayOptions.show { operation: ["leave"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
};

/** List members of a conversation */
export type SlackV24ChannelMemberConfig = {
	resource: 'channel';
	operation: 'member';
/**
 * The Slack channel to get the members from
 * @displayOptions.show { operation: ["member"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["channel"], operation: ["member"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["member"], resource: ["channel"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Whether to resolve the data automatically. By default the response only contain the ID to resource.
 * @displayOptions.show { resource: ["channel"], operation: ["member"] }
 * @default false
 */
		resolveData?: boolean | Expression<boolean>;
};

/** Opens or resumes a direct message or multi-person direct message */
export type SlackV24ChannelOpenConfig = {
	resource: 'channel';
	operation: 'open';
	options?: Record<string, unknown>;
};

/** Renames a conversation */
export type SlackV24ChannelRenameConfig = {
	resource: 'channel';
	operation: 'rename';
/**
 * The Slack channel to rename
 * @displayOptions.show { operation: ["rename"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * New name for conversation
 * @displayOptions.show { operation: ["rename"], resource: ["channel"] }
 */
		name: string | Expression<string>;
};

/** Get a thread of messages posted to a channel */
export type SlackV24ChannelRepliesConfig = {
	resource: 'channel';
	operation: 'replies';
/**
 * The Slack channel to replies to
 * @displayOptions.show { operation: ["replies"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Timestamp of the message to reply
 * @displayOptions.show { operation: ["replies"], resource: ["channel"] }
 */
		ts: number | Expression<number>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["channel"], operation: ["replies"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["channel"], operation: ["replies"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Sets the purpose for a conversation */
export type SlackV24ChannelSetPurposeConfig = {
	resource: 'channel';
	operation: 'setPurpose';
/**
 * The Slack channel to set the purpose of
 * @displayOptions.show { operation: ["setPurpose"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * A new, specialer purpose
 * @displayOptions.show { operation: ["setPurpose"], resource: ["channel"] }
 */
		purpose: string | Expression<string>;
};

/** Sets the topic for a conversation */
export type SlackV24ChannelSetTopicConfig = {
	resource: 'channel';
	operation: 'setTopic';
/**
 * The Slack channel to set the topic of
 * @displayOptions.show { operation: ["setTopic"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
	topic: string | Expression<string>;
};

/** Unarchives a conversation */
export type SlackV24ChannelUnarchiveConfig = {
	resource: 'channel';
	operation: 'unarchive';
/**
 * The Slack channel to unarchive
 * @displayOptions.show { operation: ["unarchive"], resource: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
};

/** Get information about a channel */
export type SlackV24FileGetConfig = {
	resource: 'file';
	operation: 'get';
	fileId?: string | Expression<string>;
};

/** Get many channels in a Slack team */
export type SlackV24FileGetAllConfig = {
	resource: 'file';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["file"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["file"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Create or upload an existing file */
export type SlackV24FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
/**
 * Other options to set
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default {}
 */
		options?: Record<string, unknown>;
};

export type SlackV24MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	select: 'channel' | 'user' | Expression<string>;
/**
 * The Slack channel to delete the message from
 * @displayOptions.show { operation: ["delete"], resource: ["message"], select: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
	user?: ResourceLocatorValue;
/**
 * Timestamp of the message to delete
 * @displayOptions.show { resource: ["message"], operation: ["delete"] }
 */
		timestamp: number | Expression<number>;
};

export type SlackV24MessageGetPermalinkConfig = {
	resource: 'message';
	operation: 'getPermalink';
/**
 * The Slack channel to get the message permalink from
 * @displayOptions.show { resource: ["message"], operation: ["getPermalink"] }
 * @default {"mode":"list","value":""}
 */
		channelId?: ResourceLocatorValue;
/**
 * Timestamp of the message to message
 * @displayOptions.show { resource: ["message"], operation: ["getPermalink"] }
 */
		timestamp: number | Expression<number>;
};

export type SlackV24MessageSearchConfig = {
	resource: 'message';
	operation: 'search';
/**
 * The text to search for within messages
 * @displayOptions.show { resource: ["message"], operation: ["search"] }
 */
		query: string | Expression<string>;
/**
 * How search results should be sorted. You can sort by.
 * @displayOptions.show { resource: ["message"], operation: ["search"] }
 * @default desc
 */
		sort?: 'desc' | 'asc' | 'relevance' | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["message"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["message"], operation: ["search"], returnAll: [false] }
 * @default 25
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type SlackV24MessagePostConfig = {
	resource: 'message';
	operation: 'post';
	select: 'channel' | 'user' | Expression<string>;
/**
 * The Slack channel to send to
 * @displayOptions.show { operation: ["post"], resource: ["message"], select: ["channel"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
	user?: ResourceLocatorValue;
/**
 * Whether to send a simple text message, or use Slack’s Blocks UI builder for more sophisticated messages that include form fields, sections and more
 * @displayOptions.show { operation: ["post"], resource: ["message"] }
 * @default text
 */
		messageType?: 'text' | 'block' | 'attachment' | Expression<string>;
/**
 * The message text to post. Supports &lt;a href="https://api.slack.com/reference/surfaces/formatting"&gt;markdown&lt;/a&gt; by default - this can be disabled in "Options".
 * @displayOptions.show { operation: ["post"], resource: ["message"], messageType: ["text"] }
 */
		text: string | Expression<string>;
/**
 * Enter the JSON output from Slack's visual Block Kit Builder here. You can then use expressions to add variable content to your blocks. To create blocks, use &lt;a target='_blank' href='https://app.slack.com/block-kit-builder'&gt;Slack's Block Kit Builder&lt;/a&gt;
 * @hint To create blocks, use &lt;a target='_blank' href='https://app.slack.com/block-kit-builder'&gt;Slack's Block Kit Builder&lt;/a&gt;
 * @displayOptions.show { operation: ["post"], resource: ["message"], messageType: ["block"] }
 */
		blocksUi: string | Expression<string>;
	attachments?: Record<string, unknown>;
/**
 * Other options to set
 * @displayOptions.show { operation: ["post"], resource: ["message"] }
 * @default {}
 */
		otherOptions?: Record<string, unknown>;
};

export type SlackV24MessageSendAndWaitConfig = {
	resource: 'message';
	operation: 'sendAndWait';
	select: 'channel' | 'user' | Expression<string>;
/**
 * The Slack channel to send to
 * @displayOptions.show { select: ["channel"], resource: ["message"], operation: ["sendAndWait"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
	user?: ResourceLocatorValue;
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
			 * @default Approve
			 */
			approveLabel?: string | Expression<string>;
			/** Approve Button Style
			 * @displayOptions.show { approvalType: ["single", "double"] }
			 * @default primary
			 */
			buttonApprovalStyle?: 'primary' | 'secondary' | Expression<string>;
			/** Disapprove Button Label
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default Decline
			 */
			disapproveLabel?: string | Expression<string>;
			/** Disapprove Button Style
			 * @displayOptions.show { approvalType: ["double"] }
			 * @default secondary
			 */
			buttonDisapprovalStyle?: 'primary' | 'secondary' | Expression<string>;
		};
	};
	options?: Record<string, unknown>;
};

export type SlackV24MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
/**
 * The Slack channel to update the message from
 * @displayOptions.show { resource: ["message"], operation: ["update"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Timestamp of the message to update
 * @displayOptions.show { resource: ["message"], operation: ["update"] }
 */
		ts: number | Expression<number>;
/**
 * Whether to send a simple text message, or use Slack’s Blocks UI builder for more sophisticated messages that include form fields, sections and more
 * @displayOptions.show { operation: ["update"], resource: ["message"] }
 * @default text
 */
		messageType?: 'text' | 'block' | 'attachment' | Expression<string>;
/**
 * Enter the JSON output from Slack's visual Block Kit Builder here. You can then use expressions to add variable content to your blocks. To create blocks, use &lt;a target='_blank' href='https://app.slack.com/block-kit-builder'&gt;Slack's Block Kit Builder&lt;/a&gt;
 * @hint To create blocks, use &lt;a target='_blank' href='https://app.slack.com/block-kit-builder'&gt;Slack's Block Kit Builder&lt;/a&gt;
 * @displayOptions.show { operation: ["update"], resource: ["message"], messageType: ["block"] }
 */
		blocksUi: string | Expression<string>;
/**
 * Fallback text to display in slack notifications. Supports &lt;a href="https://api.slack.com/reference/surfaces/formatting"&gt;markdown&lt;/a&gt; by default - this can be disabled in "Options".
 * @displayOptions.show { operation: ["update"], resource: ["message"], messageType: ["block"] }
 */
		text?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
/**
 * Other options to set
 * @displayOptions.show { operation: ["update"], resource: ["message"] }
 * @default {}
 */
		otherOptions?: Record<string, unknown>;
};

/** Add a star to an item */
export type SlackV24ReactionAddConfig = {
	resource: 'reaction';
	operation: 'add';
/**
 * The Slack channel to get the reactions from
 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Timestamp of the message to add, get or remove
 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
 */
		timestamp: number | Expression<number>;
/**
 * Emoji code to use for the message reaction. Use emoji codes like +1, not an actual emoji like 👍. &lt;a target="_blank" href=" https://www.webfx.com/tools/emoji-cheat-sheet/"&gt;List of common emoji codes&lt;/a&gt;
 * @displayOptions.show { resource: ["reaction"], operation: ["add", "remove"] }
 */
		name: string | Expression<string>;
};

/** Get information about a channel */
export type SlackV24ReactionGetConfig = {
	resource: 'reaction';
	operation: 'get';
/**
 * The Slack channel to get the reactions from
 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Timestamp of the message to add, get or remove
 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
 */
		timestamp: number | Expression<number>;
};

/** Remove a reaction of a message */
export type SlackV24ReactionRemoveConfig = {
	resource: 'reaction';
	operation: 'remove';
/**
 * The Slack channel to get the reactions from
 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
 * @default {"mode":"list","value":""}
 */
		channelId: ResourceLocatorValue;
/**
 * Timestamp of the message to add, get or remove
 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
 */
		timestamp: number | Expression<number>;
/**
 * Emoji code to use for the message reaction. Use emoji codes like +1, not an actual emoji like 👍. &lt;a target="_blank" href=" https://www.webfx.com/tools/emoji-cheat-sheet/"&gt;List of common emoji codes&lt;/a&gt;
 * @displayOptions.show { resource: ["reaction"], operation: ["add", "remove"] }
 */
		name: string | Expression<string>;
};

/** Add a star to an item */
export type SlackV24StarAddConfig = {
	resource: 'star';
	operation: 'add';
/**
 * Choose whether to add a star to a message or a file
 * @displayOptions.show { operation: ["add"], resource: ["star"] }
 */
		target: 'message' | 'file' | Expression<string>;
/**
 * The Slack channel to add a star to
 * @displayOptions.show { resource: ["star"], operation: ["add"], target: ["message", "file"] }
 * @default {"mode":"list","value":""}
 */
		channelId?: ResourceLocatorValue;
/**
 * File to add star to
 * @displayOptions.show { resource: ["star"], operation: ["add"], target: ["file"] }
 */
		fileId?: string | Expression<string>;
/**
 * Timestamp of the message to add
 * @displayOptions.show { resource: ["star"], operation: ["add"], target: ["message"] }
 */
		timestamp?: number | Expression<number>;
/**
 * Options to set
 * @displayOptions.show { operation: ["add"], resource: ["star"] }
 * @default {}
 */
		options?: Record<string, unknown>;
};

export type SlackV24StarDeleteConfig = {
	resource: 'star';
	operation: 'delete';
/**
 * Options to set
 * @displayOptions.show { operation: ["delete"], resource: ["star"] }
 * @default {}
 */
		options?: Record<string, unknown>;
};

/** Get many channels in a Slack team */
export type SlackV24StarGetAllConfig = {
	resource: 'star';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["star"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["star"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Get information about a user */
export type SlackV24UserInfoConfig = {
	resource: 'user';
	operation: 'info';
/**
 * The ID of the user to get information about
 * @displayOptions.show { operation: ["info", "getProfile"], resource: ["user"] }
 * @default {"mode":"list","value":""}
 */
		user?: ResourceLocatorValue;
};

/** Get many channels in a Slack team */
export type SlackV24UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Get a user's profile */
export type SlackV24UserGetProfileConfig = {
	resource: 'user';
	operation: 'getProfile';
/**
 * The ID of the user to get information about
 * @displayOptions.show { operation: ["info", "getProfile"], resource: ["user"] }
 * @default {"mode":"list","value":""}
 */
		user?: ResourceLocatorValue;
};

/** Get online status of a user */
export type SlackV24UserGetPresenceConfig = {
	resource: 'user';
	operation: 'getPresence';
/**
 * The ID of the user to get the online status of
 * @displayOptions.show { operation: ["getPresence"], resource: ["user"] }
 * @default {"mode":"list","value":""}
 */
		user?: ResourceLocatorValue;
};

/** Update a user's profile */
export type SlackV24UserUpdateProfileConfig = {
	resource: 'user';
	operation: 'updateProfile';
	options?: Record<string, unknown>;
};

/** Initiates a public or private channel-based conversation */
export type SlackV24UserGroupCreateConfig = {
	resource: 'userGroup';
	operation: 'create';
/**
 * A name for the User Group. Must be unique among User Groups.
 * @displayOptions.show { operation: ["create"], resource: ["userGroup"] }
 */
		name: string | Expression<string>;
	Options?: Record<string, unknown>;
};

export type SlackV24UserGroupDisableConfig = {
	resource: 'userGroup';
	operation: 'disable';
/**
 * The encoded ID of the User Group to update
 * @displayOptions.show { operation: ["disable"], resource: ["userGroup"] }
 */
		userGroupId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type SlackV24UserGroupEnableConfig = {
	resource: 'userGroup';
	operation: 'enable';
/**
 * The encoded ID of the User Group to update
 * @displayOptions.show { operation: ["enable"], resource: ["userGroup"] }
 */
		userGroupId: string | Expression<string>;
	option?: Record<string, unknown>;
};

/** Get many channels in a Slack team */
export type SlackV24UserGroupGetAllConfig = {
	resource: 'userGroup';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["userGroup"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["userGroup"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type SlackV24UserGroupUpdateConfig = {
	resource: 'userGroup';
	operation: 'update';
/**
 * The encoded ID of the User Group to update
 * @displayOptions.show { operation: ["update"], resource: ["userGroup"] }
 */
		userGroupId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type SlackV24Params =
	| SlackV24ChannelArchiveConfig
	| SlackV24ChannelCloseConfig
	| SlackV24ChannelCreateConfig
	| SlackV24ChannelGetConfig
	| SlackV24ChannelGetAllConfig
	| SlackV24ChannelHistoryConfig
	| SlackV24ChannelInviteConfig
	| SlackV24ChannelJoinConfig
	| SlackV24ChannelKickConfig
	| SlackV24ChannelLeaveConfig
	| SlackV24ChannelMemberConfig
	| SlackV24ChannelOpenConfig
	| SlackV24ChannelRenameConfig
	| SlackV24ChannelRepliesConfig
	| SlackV24ChannelSetPurposeConfig
	| SlackV24ChannelSetTopicConfig
	| SlackV24ChannelUnarchiveConfig
	| SlackV24FileGetConfig
	| SlackV24FileGetAllConfig
	| SlackV24FileUploadConfig
	| SlackV24MessageDeleteConfig
	| SlackV24MessageGetPermalinkConfig
	| SlackV24MessageSearchConfig
	| SlackV24MessagePostConfig
	| SlackV24MessageSendAndWaitConfig
	| SlackV24MessageUpdateConfig
	| SlackV24ReactionAddConfig
	| SlackV24ReactionGetConfig
	| SlackV24ReactionRemoveConfig
	| SlackV24StarAddConfig
	| SlackV24StarDeleteConfig
	| SlackV24StarGetAllConfig
	| SlackV24UserInfoConfig
	| SlackV24UserGetAllConfig
	| SlackV24UserGetProfileConfig
	| SlackV24UserGetPresenceConfig
	| SlackV24UserUpdateProfileConfig
	| SlackV24UserGroupCreateConfig
	| SlackV24UserGroupDisableConfig
	| SlackV24UserGroupEnableConfig
	| SlackV24UserGroupGetAllConfig
	| SlackV24UserGroupUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type SlackV24ChannelCreateOutput = {
	context_team_id?: string;
	created?: number;
	creator?: string;
	id?: string;
	is_archived?: boolean;
	is_channel?: boolean;
	is_ext_shared?: boolean;
	is_general?: boolean;
	is_group?: boolean;
	is_im?: boolean;
	is_member?: boolean;
	is_mpim?: boolean;
	is_org_shared?: boolean;
	is_pending_ext_shared?: boolean;
	is_private?: boolean;
	is_shared?: boolean;
	last_read?: string;
	name?: string;
	name_normalized?: string;
	parent_conversation?: null;
	priority?: number;
	purpose?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	shared_team_ids?: Array<string>;
	topic?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	unlinked?: number;
	updated?: number;
};

export type SlackV24ChannelGetOutput = {
	context_team_id?: string;
	created?: number;
	creator?: string;
	id?: string;
	is_archived?: boolean;
	is_channel?: boolean;
	is_ext_shared?: boolean;
	is_general?: boolean;
	is_group?: boolean;
	is_im?: boolean;
	is_member?: boolean;
	is_mpim?: boolean;
	is_org_shared?: boolean;
	is_pending_ext_shared?: boolean;
	is_private?: boolean;
	is_shared?: boolean;
	last_read?: string;
	name?: string;
	name_normalized?: string;
	parent_conversation?: null;
	previous_names?: Array<string>;
	properties?: {
		canvas?: {
			file_id?: string;
			is_empty?: boolean;
			quip_thread_id?: string;
		};
		tabs?: Array<{
			id?: string;
			label?: string;
			type?: string;
		}>;
		tabz?: Array<{
			type?: string;
		}>;
	};
	purpose?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	shared_team_ids?: Array<string>;
	topic?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	unlinked?: number;
	updated?: number;
};

export type SlackV24ChannelGetAllOutput = {
	context_team_id?: string;
	created?: number;
	creator?: string;
	id?: string;
	is_archived?: boolean;
	is_channel?: boolean;
	is_ext_shared?: boolean;
	is_general?: boolean;
	is_group?: boolean;
	is_im?: boolean;
	is_member?: boolean;
	is_mpim?: boolean;
	is_org_shared?: boolean;
	is_pending_ext_shared?: boolean;
	is_private?: boolean;
	is_shared?: boolean;
	name?: string;
	name_normalized?: string;
	num_members?: number;
	parent_conversation?: null;
	previous_names?: Array<string>;
	properties?: {
		canvas?: {
			file_id?: string;
			is_empty?: boolean;
			quip_thread_id?: string;
		};
		tabs?: Array<{
			id?: string;
			label?: string;
			type?: string;
		}>;
		tabz?: Array<{
			type?: string;
		}>;
		use_case?: string;
	};
	purpose?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	shared_team_ids?: Array<string>;
	topic?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	unlinked?: number;
	updated?: number;
};

export type SlackV24ChannelHistoryOutput = {
	blocks?: Array<{
		block_id?: string;
		elements?: Array<{
			elements?: Array<{
				style?: {
					bold?: boolean;
					italic?: boolean;
				};
				text?: string;
				type?: string;
			}>;
			type?: string;
		}>;
		type?: string;
	}>;
	bot_id?: string;
	client_msg_id?: string;
	team?: string;
	text?: string;
	ts?: string;
	type?: string;
	user?: string;
};

export type SlackV24ChannelInviteOutput = {
	error?: string;
};

export type SlackV24ChannelJoinOutput = {
	context_team_id?: string;
	created?: number;
	creator?: string;
	id?: string;
	is_archived?: boolean;
	is_channel?: boolean;
	is_ext_shared?: boolean;
	is_general?: boolean;
	is_group?: boolean;
	is_im?: boolean;
	is_member?: boolean;
	is_mpim?: boolean;
	is_org_shared?: boolean;
	is_pending_ext_shared?: boolean;
	is_private?: boolean;
	is_shared?: boolean;
	name?: string;
	name_normalized?: string;
	parent_conversation?: null;
	previous_names?: Array<string>;
	purpose?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	shared_team_ids?: Array<string>;
	topic?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	unlinked?: number;
	updated?: number;
};

export type SlackV24ChannelMemberOutput = {
	member?: string;
};

export type SlackV24ChannelOpenOutput = {
	id?: string;
};

export type SlackV24ChannelRepliesOutput = {
	app_id?: string;
	blocks?: Array<{
		block_id?: string;
		elements?: Array<{
			elements?: Array<{
				text?: string;
				type?: string;
			}>;
			type?: string;
		}>;
		type?: string;
	}>;
	bot_id?: string;
	bot_profile?: {
		app_id?: string;
		deleted?: boolean;
		icons?: {
			image_36?: string;
			image_48?: string;
			image_72?: string;
		};
		id?: string;
		name?: string;
		team_id?: string;
		updated?: number;
		user_id?: string;
	};
	client_msg_id?: string;
	is_locked?: boolean;
	latest_reply?: string;
	parent_user_id?: string;
	reply_count?: number;
	reply_users?: Array<string>;
	reply_users_count?: number;
	subscribed?: boolean;
	team?: string;
	text?: string;
	thread_ts?: string;
	ts?: string;
	type?: string;
	user?: string;
};

export type SlackV24ChannelSetTopicOutput = {
	context_team_id?: string;
	created?: number;
	creator?: string;
	id?: string;
	is_archived?: boolean;
	is_channel?: boolean;
	is_ext_shared?: boolean;
	is_general?: boolean;
	is_group?: boolean;
	is_im?: boolean;
	is_member?: boolean;
	is_mpim?: boolean;
	is_org_shared?: boolean;
	is_pending_ext_shared?: boolean;
	is_private?: boolean;
	is_shared?: boolean;
	name?: string;
	name_normalized?: string;
	parent_conversation?: null;
	previous_names?: Array<string>;
	purpose?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	shared_team_ids?: Array<string>;
	topic?: {
		creator?: string;
		last_set?: number;
		value?: string;
	};
	unlinked?: number;
	updated?: number;
};

export type SlackV24FileGetOutput = {
	aac?: string;
	audio_wave_samples?: Array<number>;
	channels?: Array<string>;
	comments_count?: number;
	created?: number;
	display_as_bot?: boolean;
	duration_ms?: number;
	editable?: boolean;
	external_type?: string;
	file_access?: string;
	filetype?: string;
	groups?: Array<string>;
	has_more_shares?: boolean;
	has_rich_preview?: boolean;
	id?: string;
	ims?: Array<string>;
	is_external?: boolean;
	is_public?: boolean;
	is_starred?: boolean;
	media_display_type?: string;
	mimetype?: string;
	mode?: string;
	name?: string;
	permalink?: string;
	permalink_public?: string;
	pretty_type?: string;
	public_url_shared?: boolean;
	size?: number;
	subtype?: string;
	timestamp?: number;
	title?: string;
	transcription?: {
		status?: string;
	};
	url_private?: string;
	url_private_download?: string;
	user?: string;
	user_team?: string;
	username?: string;
};

export type SlackV24FileGetAllOutput = {
	channels?: Array<string>;
	comments_count?: number;
	created?: number;
	display_as_bot?: boolean;
	editable?: boolean;
	external_type?: string;
	filetype?: string;
	groups?: Array<string>;
	id?: string;
	ims?: Array<string>;
	is_external?: boolean;
	is_public?: boolean;
	media_display_type?: string;
	mimetype?: string;
	mode?: string;
	name?: string;
	permalink?: string;
	pretty_type?: string;
	public_url_shared?: boolean;
	size?: number;
	timestamp?: number;
	title?: string;
	url_private?: string;
	url_private_download?: string;
	user?: string;
	user_team?: string;
	username?: string;
};

export type SlackV24FileUploadOutput = {
	channels?: Array<string>;
	comments_count?: number;
	created?: number;
	display_as_bot?: boolean;
	editable?: boolean;
	external_type?: string;
	file_access?: string;
	filetype?: string;
	groups?: Array<string>;
	has_more_shares?: boolean;
	has_rich_preview?: boolean;
	id?: string;
	is_external?: boolean;
	is_public?: boolean;
	is_starred?: boolean;
	media_display_type?: string;
	mimetype?: string;
	mode?: string;
	name?: string;
	permalink?: string;
	permalink_public?: string;
	pretty_type?: string;
	public_url_shared?: boolean;
	size?: number;
	timestamp?: number;
	title?: string;
	url_private?: string;
	url_private_download?: string;
	user?: string;
	user_team?: string;
	username?: string;
};

export type SlackV24MessageDeleteOutput = {
	channel?: string;
	message_timestamp?: string;
	ok?: boolean;
};

export type SlackV24MessageGetPermalinkOutput = {
	channel?: string;
	ok?: boolean;
	permalink?: string;
};

export type SlackV24MessageSearchOutput = {
	blocks?: Array<{
		block_id?: string;
		elements?: Array<{
			elements?: Array<{
				text?: string;
				type?: string;
				user_id?: string;
			}>;
			type?: string;
		}>;
		type?: string;
	}>;
	channel?: {
		id?: string;
		is_channel?: boolean;
		is_ext_shared?: boolean;
		is_group?: boolean;
		is_im?: boolean;
		is_mpim?: boolean;
		is_org_shared?: boolean;
		is_pending_ext_shared?: boolean;
		is_private?: boolean;
		is_shared?: boolean;
		name?: string;
	};
	iid?: string;
	no_reactions?: boolean;
	permalink?: string;
	team?: string;
	text?: string;
	ts?: string;
	type?: string;
	username?: string;
};

export type SlackV24MessagePostOutput = {
	channel?: string;
	message?: {
		app_id?: string;
		blocks?: Array<{
			block_id?: string;
			elements?: Array<{
				elements?: Array<{
					style?: {
						italic?: boolean;
					};
					text?: string;
					type?: string;
					url?: string;
				}>;
				type?: string;
			}>;
			type?: string;
		}>;
		bot_id?: string;
		bot_profile?: {
			app_id?: string;
			deleted?: boolean;
			icons?: {
				image_36?: string;
				image_48?: string;
				image_72?: string;
			};
			id?: string;
			name?: string;
			team_id?: string;
			updated?: number;
		};
		team?: string;
		text?: string;
		ts?: string;
		type?: string;
		user?: string;
	};
	message_timestamp?: string;
	ok?: boolean;
};

export type SlackV24MessageSendAndWaitOutput = {
	data?: {
		approved?: boolean;
	};
};

export type SlackV24MessageUpdateOutput = {
	channel?: string;
	message?: {
		app_id?: string;
		blocks?: Array<{
			block_id?: string;
			elements?: Array<{
				elements?: Array<{
					style?: {
						bold?: boolean;
						italic?: boolean;
					};
					text?: string;
					type?: string;
					url?: string;
				}>;
				type?: string;
			}>;
			text?: {
				text?: string;
				type?: string;
				verbatim?: boolean;
			};
			type?: string;
		}>;
		bot_id?: string;
		bot_profile?: {
			app_id?: string;
			deleted?: boolean;
			icons?: {
				image_36?: string;
				image_48?: string;
				image_72?: string;
			};
			id?: string;
			name?: string;
			team_id?: string;
			updated?: number;
		};
		edited?: {
			ts?: string;
			user?: string;
		};
		team?: string;
		text?: string;
		type?: string;
		user?: string;
	};
	message_timestamp?: string;
	ok?: boolean;
	text?: string;
};

export type SlackV24ReactionAddOutput = {
	ok?: boolean;
};

export type SlackV24ReactionGetOutput = {
	channel?: string;
	message?: {
		blocks?: Array<{
			block_id?: string;
			elements?: Array<{
				elements?: Array<{
					text?: string;
					type?: string;
					url?: string;
				}>;
				type?: string;
			}>;
			type?: string;
		}>;
		client_msg_id?: string;
		permalink?: string;
		reactions?: Array<{
			count?: number;
			name?: string;
			users?: Array<string>;
		}>;
		team?: string;
		text?: string;
		ts?: string;
		type?: string;
		user?: string;
	};
	ok?: boolean;
	type?: string;
};

export type SlackV24ReactionRemoveOutput = {
	ok?: boolean;
};

export type SlackV24UserInfoOutput = {
	color?: string;
	deleted?: boolean;
	id?: string;
	is_admin?: boolean;
	is_app_user?: boolean;
	is_bot?: boolean;
	is_email_confirmed?: boolean;
	is_owner?: boolean;
	is_primary_owner?: boolean;
	is_restricted?: boolean;
	is_ultra_restricted?: boolean;
	name?: string;
	profile?: {
		avatar_hash?: string;
		display_name?: string;
		display_name_normalized?: string;
		first_name?: string;
		huddle_state?: string;
		huddle_state_expiration_ts?: number;
		image_1024?: string;
		image_192?: string;
		image_24?: string;
		image_32?: string;
		image_48?: string;
		image_512?: string;
		image_72?: string;
		image_original?: string;
		is_custom_image?: boolean;
		last_name?: string;
		phone?: string;
		real_name?: string;
		real_name_normalized?: string;
		skype?: string;
		status_emoji?: string;
		status_emoji_display_info?: Array<{
			display_url?: string;
			emoji_name?: string;
			unicode?: string;
		}>;
		status_expiration?: number;
		status_text?: string;
		status_text_canonical?: string;
		team?: string;
		title?: string;
	};
	real_name?: string;
	team_id?: string;
	tz?: string;
	tz_label?: string;
	tz_offset?: number;
	updated?: number;
	who_can_share_contact_card?: string;
};

export type SlackV24UserGetAllOutput = {
	color?: string;
	deleted?: boolean;
	id?: string;
	is_admin?: boolean;
	is_app_user?: boolean;
	is_bot?: boolean;
	is_email_confirmed?: boolean;
	is_owner?: boolean;
	is_primary_owner?: boolean;
	is_restricted?: boolean;
	is_ultra_restricted?: boolean;
	name?: string;
	profile?: {
		always_active?: boolean;
		avatar_hash?: string;
		display_name?: string;
		display_name_normalized?: string;
		first_name?: string;
		huddle_state?: string;
		huddle_state_expiration_ts?: number;
		image_1024?: string;
		image_192?: string;
		image_24?: string;
		image_32?: string;
		image_48?: string;
		image_512?: string;
		image_72?: string;
		image_original?: string;
		is_custom_image?: boolean;
		last_name?: string;
		phone?: string;
		real_name?: string;
		real_name_normalized?: string;
		skype?: string;
		status_emoji?: string;
		status_emoji_display_info?: Array<{
			display_url?: string;
			emoji_name?: string;
			unicode?: string;
		}>;
		status_expiration?: number;
		status_text?: string;
		status_text_canonical?: string;
		team?: string;
		title?: string;
	};
	real_name?: string;
	team_id?: string;
	tz?: string;
	tz_label?: string;
	tz_offset?: number;
	updated?: number;
	who_can_share_contact_card?: string;
};

export type SlackV24UserGetProfileOutput = {
	avatar_hash?: string;
	display_name?: string;
	display_name_normalized?: string;
	email?: string;
	first_name?: string;
	image_1024?: string;
	image_192?: string;
	image_24?: string;
	image_32?: string;
	image_48?: string;
	image_512?: string;
	image_72?: string;
	image_original?: string;
	is_custom_image?: boolean;
	last_name?: string;
	phone?: string;
	real_name?: string;
	real_name_normalized?: string;
	skype?: string;
	status_emoji?: string;
	status_emoji_display_info?: Array<{
		display_url?: string;
		emoji_name?: string;
		unicode?: string;
	}>;
	status_expiration?: number;
	status_text?: string;
	status_text_canonical?: string;
	title?: string;
};

export type SlackV24UserGetPresenceOutput = {
	ok?: boolean;
	presence?: string;
};

export type SlackV24UserUpdateProfileOutput = {
	avatar_hash?: string;
	display_name?: string;
	display_name_normalized?: string;
	email?: string;
	fields?: {
		Xf03UMDX9738?: {
			alt?: string;
			value?: string;
		};
		Xf03UMDX98DC?: {
			alt?: string;
			value?: string;
		};
		Xf03UR35L6MT?: {
			alt?: string;
			value?: string;
		};
		Xf03UR35L7K7?: {
			alt?: string;
			value?: string;
		};
		Xf03UTUL86LB?: {
			alt?: string;
			value?: string;
		};
		Xf03UU2E8W4S?: {
			alt?: string;
			value?: string;
		};
		Xf03UWFR6VJQ?: {
			alt?: string;
			value?: string;
		};
		Xf03V6LREDCZ?: {
			alt?: string;
			value?: string;
		};
		Xf0403NW3YCQ?: {
			alt?: string;
			value?: string;
		};
		Xf05GWG5K0S0?: {
			alt?: string;
			value?: string;
		};
		Xf08BT55JWBG?: {
			alt?: string;
			value?: string;
		};
		Xf08BWUCR1LM?: {
			alt?: string;
			value?: string;
		};
		Xf08FLSF1456?: {
			alt?: string;
			value?: string;
		};
	};
	first_name?: string;
	huddle_state?: string;
	huddle_state_expiration_ts?: number;
	image_1024?: string;
	image_192?: string;
	image_24?: string;
	image_32?: string;
	image_48?: string;
	image_512?: string;
	image_72?: string;
	image_original?: string;
	is_custom_image?: boolean;
	last_name?: string;
	phone?: string;
	real_name?: string;
	real_name_normalized?: string;
	skype?: string;
	start_date?: string;
	status_emoji?: string;
	status_emoji_display_info?: Array<{
		display_url?: string;
		emoji_name?: string;
		unicode?: string;
	}>;
	status_expiration?: number;
	status_text?: string;
	status_text_canonical?: string;
	title?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface SlackV24Credentials {
	slackApi: CredentialReference;
	slackOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SlackV24NodeBase {
	type: 'n8n-nodes-base.slack';
	version: 2.4;
	credentials?: SlackV24Credentials;
}

export type SlackV24ChannelArchiveNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelArchiveConfig>;
};

export type SlackV24ChannelCloseNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelCloseConfig>;
};

export type SlackV24ChannelCreateNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelCreateConfig>;
	output?: SlackV24ChannelCreateOutput;
};

export type SlackV24ChannelGetNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelGetConfig>;
	output?: SlackV24ChannelGetOutput;
};

export type SlackV24ChannelGetAllNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelGetAllConfig>;
	output?: SlackV24ChannelGetAllOutput;
};

export type SlackV24ChannelHistoryNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelHistoryConfig>;
	output?: SlackV24ChannelHistoryOutput;
};

export type SlackV24ChannelInviteNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelInviteConfig>;
	output?: SlackV24ChannelInviteOutput;
};

export type SlackV24ChannelJoinNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelJoinConfig>;
	output?: SlackV24ChannelJoinOutput;
};

export type SlackV24ChannelKickNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelKickConfig>;
};

export type SlackV24ChannelLeaveNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelLeaveConfig>;
};

export type SlackV24ChannelMemberNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelMemberConfig>;
	output?: SlackV24ChannelMemberOutput;
};

export type SlackV24ChannelOpenNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelOpenConfig>;
	output?: SlackV24ChannelOpenOutput;
};

export type SlackV24ChannelRenameNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelRenameConfig>;
};

export type SlackV24ChannelRepliesNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelRepliesConfig>;
	output?: SlackV24ChannelRepliesOutput;
};

export type SlackV24ChannelSetPurposeNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelSetPurposeConfig>;
};

export type SlackV24ChannelSetTopicNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelSetTopicConfig>;
	output?: SlackV24ChannelSetTopicOutput;
};

export type SlackV24ChannelUnarchiveNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ChannelUnarchiveConfig>;
};

export type SlackV24FileGetNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24FileGetConfig>;
	output?: SlackV24FileGetOutput;
};

export type SlackV24FileGetAllNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24FileGetAllConfig>;
	output?: SlackV24FileGetAllOutput;
};

export type SlackV24FileUploadNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24FileUploadConfig>;
	output?: SlackV24FileUploadOutput;
};

export type SlackV24MessageDeleteNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24MessageDeleteConfig>;
	output?: SlackV24MessageDeleteOutput;
};

export type SlackV24MessageGetPermalinkNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24MessageGetPermalinkConfig>;
	output?: SlackV24MessageGetPermalinkOutput;
};

export type SlackV24MessageSearchNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24MessageSearchConfig>;
	output?: SlackV24MessageSearchOutput;
};

export type SlackV24MessagePostNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24MessagePostConfig>;
	output?: SlackV24MessagePostOutput;
};

export type SlackV24MessageSendAndWaitNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24MessageSendAndWaitConfig>;
	output?: SlackV24MessageSendAndWaitOutput;
};

export type SlackV24MessageUpdateNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24MessageUpdateConfig>;
	output?: SlackV24MessageUpdateOutput;
};

export type SlackV24ReactionAddNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ReactionAddConfig>;
	output?: SlackV24ReactionAddOutput;
};

export type SlackV24ReactionGetNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ReactionGetConfig>;
	output?: SlackV24ReactionGetOutput;
};

export type SlackV24ReactionRemoveNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24ReactionRemoveConfig>;
	output?: SlackV24ReactionRemoveOutput;
};

export type SlackV24StarAddNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24StarAddConfig>;
};

export type SlackV24StarDeleteNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24StarDeleteConfig>;
};

export type SlackV24StarGetAllNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24StarGetAllConfig>;
};

export type SlackV24UserInfoNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserInfoConfig>;
	output?: SlackV24UserInfoOutput;
};

export type SlackV24UserGetAllNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserGetAllConfig>;
	output?: SlackV24UserGetAllOutput;
};

export type SlackV24UserGetProfileNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserGetProfileConfig>;
	output?: SlackV24UserGetProfileOutput;
};

export type SlackV24UserGetPresenceNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserGetPresenceConfig>;
	output?: SlackV24UserGetPresenceOutput;
};

export type SlackV24UserUpdateProfileNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserUpdateProfileConfig>;
	output?: SlackV24UserUpdateProfileOutput;
};

export type SlackV24UserGroupCreateNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserGroupCreateConfig>;
};

export type SlackV24UserGroupDisableNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserGroupDisableConfig>;
};

export type SlackV24UserGroupEnableNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserGroupEnableConfig>;
};

export type SlackV24UserGroupGetAllNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserGroupGetAllConfig>;
};

export type SlackV24UserGroupUpdateNode = SlackV24NodeBase & {
	config: NodeConfig<SlackV24UserGroupUpdateConfig>;
};

export type SlackV24Node =
	| SlackV24ChannelArchiveNode
	| SlackV24ChannelCloseNode
	| SlackV24ChannelCreateNode
	| SlackV24ChannelGetNode
	| SlackV24ChannelGetAllNode
	| SlackV24ChannelHistoryNode
	| SlackV24ChannelInviteNode
	| SlackV24ChannelJoinNode
	| SlackV24ChannelKickNode
	| SlackV24ChannelLeaveNode
	| SlackV24ChannelMemberNode
	| SlackV24ChannelOpenNode
	| SlackV24ChannelRenameNode
	| SlackV24ChannelRepliesNode
	| SlackV24ChannelSetPurposeNode
	| SlackV24ChannelSetTopicNode
	| SlackV24ChannelUnarchiveNode
	| SlackV24FileGetNode
	| SlackV24FileGetAllNode
	| SlackV24FileUploadNode
	| SlackV24MessageDeleteNode
	| SlackV24MessageGetPermalinkNode
	| SlackV24MessageSearchNode
	| SlackV24MessagePostNode
	| SlackV24MessageSendAndWaitNode
	| SlackV24MessageUpdateNode
	| SlackV24ReactionAddNode
	| SlackV24ReactionGetNode
	| SlackV24ReactionRemoveNode
	| SlackV24StarAddNode
	| SlackV24StarDeleteNode
	| SlackV24StarGetAllNode
	| SlackV24UserInfoNode
	| SlackV24UserGetAllNode
	| SlackV24UserGetProfileNode
	| SlackV24UserGetPresenceNode
	| SlackV24UserUpdateProfileNode
	| SlackV24UserGroupCreateNode
	| SlackV24UserGroupDisableNode
	| SlackV24UserGroupEnableNode
	| SlackV24UserGroupGetAllNode
	| SlackV24UserGroupUpdateNode
	;