/**
 * Slack Node - Version 2.3
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
export type SlackV23ChannelArchiveConfig = {
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
export type SlackV23ChannelCloseConfig = {
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
export type SlackV23ChannelCreateConfig = {
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
export type SlackV23ChannelGetConfig = {
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
export type SlackV23ChannelGetAllConfig = {
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
export type SlackV23ChannelHistoryConfig = {
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
export type SlackV23ChannelInviteConfig = {
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
export type SlackV23ChannelJoinConfig = {
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
export type SlackV23ChannelKickConfig = {
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
export type SlackV23ChannelLeaveConfig = {
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
export type SlackV23ChannelMemberConfig = {
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
export type SlackV23ChannelOpenConfig = {
	resource: 'channel';
	operation: 'open';
	options?: Record<string, unknown>;
};

/** Renames a conversation */
export type SlackV23ChannelRenameConfig = {
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
export type SlackV23ChannelRepliesConfig = {
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
export type SlackV23ChannelSetPurposeConfig = {
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
export type SlackV23ChannelSetTopicConfig = {
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
export type SlackV23ChannelUnarchiveConfig = {
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
export type SlackV23FileGetConfig = {
	resource: 'file';
	operation: 'get';
	fileId?: string | Expression<string>;
};

/** Get many channels in a Slack team */
export type SlackV23FileGetAllConfig = {
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
export type SlackV23FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
/**
 * Other options to set
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default {}
 */
		options?: Record<string, unknown>;
};

export type SlackV23MessageDeleteConfig = {
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

export type SlackV23MessageGetPermalinkConfig = {
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

export type SlackV23MessageSearchConfig = {
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

export type SlackV23MessagePostConfig = {
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

export type SlackV23MessageSendAndWaitConfig = {
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

export type SlackV23MessageUpdateConfig = {
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
export type SlackV23ReactionAddConfig = {
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
export type SlackV23ReactionGetConfig = {
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
export type SlackV23ReactionRemoveConfig = {
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
export type SlackV23StarAddConfig = {
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

export type SlackV23StarDeleteConfig = {
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
export type SlackV23StarGetAllConfig = {
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
export type SlackV23UserInfoConfig = {
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
export type SlackV23UserGetAllConfig = {
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
export type SlackV23UserGetProfileConfig = {
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
export type SlackV23UserGetPresenceConfig = {
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
export type SlackV23UserUpdateProfileConfig = {
	resource: 'user';
	operation: 'updateProfile';
	options?: Record<string, unknown>;
};

/** Initiates a public or private channel-based conversation */
export type SlackV23UserGroupCreateConfig = {
	resource: 'userGroup';
	operation: 'create';
/**
 * A name for the User Group. Must be unique among User Groups.
 * @displayOptions.show { operation: ["create"], resource: ["userGroup"] }
 */
		name: string | Expression<string>;
	Options?: Record<string, unknown>;
};

export type SlackV23UserGroupDisableConfig = {
	resource: 'userGroup';
	operation: 'disable';
/**
 * The encoded ID of the User Group to update
 * @displayOptions.show { operation: ["disable"], resource: ["userGroup"] }
 */
		userGroupId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type SlackV23UserGroupEnableConfig = {
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
export type SlackV23UserGroupGetAllConfig = {
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

export type SlackV23UserGroupUpdateConfig = {
	resource: 'userGroup';
	operation: 'update';
/**
 * The encoded ID of the User Group to update
 * @displayOptions.show { operation: ["update"], resource: ["userGroup"] }
 */
		userGroupId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type SlackV23Params =
	| SlackV23ChannelArchiveConfig
	| SlackV23ChannelCloseConfig
	| SlackV23ChannelCreateConfig
	| SlackV23ChannelGetConfig
	| SlackV23ChannelGetAllConfig
	| SlackV23ChannelHistoryConfig
	| SlackV23ChannelInviteConfig
	| SlackV23ChannelJoinConfig
	| SlackV23ChannelKickConfig
	| SlackV23ChannelLeaveConfig
	| SlackV23ChannelMemberConfig
	| SlackV23ChannelOpenConfig
	| SlackV23ChannelRenameConfig
	| SlackV23ChannelRepliesConfig
	| SlackV23ChannelSetPurposeConfig
	| SlackV23ChannelSetTopicConfig
	| SlackV23ChannelUnarchiveConfig
	| SlackV23FileGetConfig
	| SlackV23FileGetAllConfig
	| SlackV23FileUploadConfig
	| SlackV23MessageDeleteConfig
	| SlackV23MessageGetPermalinkConfig
	| SlackV23MessageSearchConfig
	| SlackV23MessagePostConfig
	| SlackV23MessageSendAndWaitConfig
	| SlackV23MessageUpdateConfig
	| SlackV23ReactionAddConfig
	| SlackV23ReactionGetConfig
	| SlackV23ReactionRemoveConfig
	| SlackV23StarAddConfig
	| SlackV23StarDeleteConfig
	| SlackV23StarGetAllConfig
	| SlackV23UserInfoConfig
	| SlackV23UserGetAllConfig
	| SlackV23UserGetProfileConfig
	| SlackV23UserGetPresenceConfig
	| SlackV23UserUpdateProfileConfig
	| SlackV23UserGroupCreateConfig
	| SlackV23UserGroupDisableConfig
	| SlackV23UserGroupEnableConfig
	| SlackV23UserGroupGetAllConfig
	| SlackV23UserGroupUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type SlackV23ChannelCreateOutput = {
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

export type SlackV23ChannelGetOutput = {
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

export type SlackV23ChannelGetAllOutput = {
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

export type SlackV23ChannelHistoryOutput = {
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

export type SlackV23ChannelInviteOutput = {
	error?: string;
};

export type SlackV23ChannelJoinOutput = {
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

export type SlackV23ChannelMemberOutput = {
	member?: string;
};

export type SlackV23ChannelOpenOutput = {
	id?: string;
};

export type SlackV23ChannelRepliesOutput = {
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

export type SlackV23ChannelSetTopicOutput = {
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

export type SlackV23FileGetOutput = {
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

export type SlackV23FileGetAllOutput = {
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

export type SlackV23FileUploadOutput = {
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

export type SlackV23MessageDeleteOutput = {
	channel?: string;
	message_timestamp?: string;
	ok?: boolean;
};

export type SlackV23MessageGetPermalinkOutput = {
	channel?: string;
	ok?: boolean;
	permalink?: string;
};

export type SlackV23MessageSearchOutput = {
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

export type SlackV23MessagePostOutput = {
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

export type SlackV23MessageSendAndWaitOutput = {
	data?: {
		approved?: boolean;
	};
};

export type SlackV23MessageUpdateOutput = {
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

export type SlackV23ReactionAddOutput = {
	ok?: boolean;
};

export type SlackV23ReactionGetOutput = {
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

export type SlackV23ReactionRemoveOutput = {
	ok?: boolean;
};

export type SlackV23UserInfoOutput = {
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

export type SlackV23UserGetAllOutput = {
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

export type SlackV23UserGetProfileOutput = {
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

export type SlackV23UserGetPresenceOutput = {
	ok?: boolean;
	presence?: string;
};

export type SlackV23UserUpdateProfileOutput = {
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

export interface SlackV23Credentials {
	slackApi: CredentialReference;
	slackOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SlackV23NodeBase {
	type: 'n8n-nodes-base.slack';
	version: 2.3;
	credentials?: SlackV23Credentials;
}

export type SlackV23ChannelArchiveNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelArchiveConfig>;
};

export type SlackV23ChannelCloseNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelCloseConfig>;
};

export type SlackV23ChannelCreateNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelCreateConfig>;
	output?: SlackV23ChannelCreateOutput;
};

export type SlackV23ChannelGetNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelGetConfig>;
	output?: SlackV23ChannelGetOutput;
};

export type SlackV23ChannelGetAllNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelGetAllConfig>;
	output?: SlackV23ChannelGetAllOutput;
};

export type SlackV23ChannelHistoryNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelHistoryConfig>;
	output?: SlackV23ChannelHistoryOutput;
};

export type SlackV23ChannelInviteNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelInviteConfig>;
	output?: SlackV23ChannelInviteOutput;
};

export type SlackV23ChannelJoinNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelJoinConfig>;
	output?: SlackV23ChannelJoinOutput;
};

export type SlackV23ChannelKickNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelKickConfig>;
};

export type SlackV23ChannelLeaveNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelLeaveConfig>;
};

export type SlackV23ChannelMemberNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelMemberConfig>;
	output?: SlackV23ChannelMemberOutput;
};

export type SlackV23ChannelOpenNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelOpenConfig>;
	output?: SlackV23ChannelOpenOutput;
};

export type SlackV23ChannelRenameNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelRenameConfig>;
};

export type SlackV23ChannelRepliesNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelRepliesConfig>;
	output?: SlackV23ChannelRepliesOutput;
};

export type SlackV23ChannelSetPurposeNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelSetPurposeConfig>;
};

export type SlackV23ChannelSetTopicNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelSetTopicConfig>;
	output?: SlackV23ChannelSetTopicOutput;
};

export type SlackV23ChannelUnarchiveNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ChannelUnarchiveConfig>;
};

export type SlackV23FileGetNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23FileGetConfig>;
	output?: SlackV23FileGetOutput;
};

export type SlackV23FileGetAllNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23FileGetAllConfig>;
	output?: SlackV23FileGetAllOutput;
};

export type SlackV23FileUploadNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23FileUploadConfig>;
	output?: SlackV23FileUploadOutput;
};

export type SlackV23MessageDeleteNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23MessageDeleteConfig>;
	output?: SlackV23MessageDeleteOutput;
};

export type SlackV23MessageGetPermalinkNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23MessageGetPermalinkConfig>;
	output?: SlackV23MessageGetPermalinkOutput;
};

export type SlackV23MessageSearchNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23MessageSearchConfig>;
	output?: SlackV23MessageSearchOutput;
};

export type SlackV23MessagePostNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23MessagePostConfig>;
	output?: SlackV23MessagePostOutput;
};

export type SlackV23MessageSendAndWaitNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23MessageSendAndWaitConfig>;
	output?: SlackV23MessageSendAndWaitOutput;
};

export type SlackV23MessageUpdateNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23MessageUpdateConfig>;
	output?: SlackV23MessageUpdateOutput;
};

export type SlackV23ReactionAddNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ReactionAddConfig>;
	output?: SlackV23ReactionAddOutput;
};

export type SlackV23ReactionGetNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ReactionGetConfig>;
	output?: SlackV23ReactionGetOutput;
};

export type SlackV23ReactionRemoveNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23ReactionRemoveConfig>;
	output?: SlackV23ReactionRemoveOutput;
};

export type SlackV23StarAddNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23StarAddConfig>;
};

export type SlackV23StarDeleteNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23StarDeleteConfig>;
};

export type SlackV23StarGetAllNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23StarGetAllConfig>;
};

export type SlackV23UserInfoNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserInfoConfig>;
	output?: SlackV23UserInfoOutput;
};

export type SlackV23UserGetAllNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserGetAllConfig>;
	output?: SlackV23UserGetAllOutput;
};

export type SlackV23UserGetProfileNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserGetProfileConfig>;
	output?: SlackV23UserGetProfileOutput;
};

export type SlackV23UserGetPresenceNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserGetPresenceConfig>;
	output?: SlackV23UserGetPresenceOutput;
};

export type SlackV23UserUpdateProfileNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserUpdateProfileConfig>;
	output?: SlackV23UserUpdateProfileOutput;
};

export type SlackV23UserGroupCreateNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserGroupCreateConfig>;
};

export type SlackV23UserGroupDisableNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserGroupDisableConfig>;
};

export type SlackV23UserGroupEnableNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserGroupEnableConfig>;
};

export type SlackV23UserGroupGetAllNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserGroupGetAllConfig>;
};

export type SlackV23UserGroupUpdateNode = SlackV23NodeBase & {
	config: NodeConfig<SlackV23UserGroupUpdateConfig>;
};

export type SlackV23Node =
	| SlackV23ChannelArchiveNode
	| SlackV23ChannelCloseNode
	| SlackV23ChannelCreateNode
	| SlackV23ChannelGetNode
	| SlackV23ChannelGetAllNode
	| SlackV23ChannelHistoryNode
	| SlackV23ChannelInviteNode
	| SlackV23ChannelJoinNode
	| SlackV23ChannelKickNode
	| SlackV23ChannelLeaveNode
	| SlackV23ChannelMemberNode
	| SlackV23ChannelOpenNode
	| SlackV23ChannelRenameNode
	| SlackV23ChannelRepliesNode
	| SlackV23ChannelSetPurposeNode
	| SlackV23ChannelSetTopicNode
	| SlackV23ChannelUnarchiveNode
	| SlackV23FileGetNode
	| SlackV23FileGetAllNode
	| SlackV23FileUploadNode
	| SlackV23MessageDeleteNode
	| SlackV23MessageGetPermalinkNode
	| SlackV23MessageSearchNode
	| SlackV23MessagePostNode
	| SlackV23MessageSendAndWaitNode
	| SlackV23MessageUpdateNode
	| SlackV23ReactionAddNode
	| SlackV23ReactionGetNode
	| SlackV23ReactionRemoveNode
	| SlackV23StarAddNode
	| SlackV23StarDeleteNode
	| SlackV23StarGetAllNode
	| SlackV23UserInfoNode
	| SlackV23UserGetAllNode
	| SlackV23UserGetProfileNode
	| SlackV23UserGetPresenceNode
	| SlackV23UserUpdateProfileNode
	| SlackV23UserGroupCreateNode
	| SlackV23UserGroupDisableNode
	| SlackV23UserGroupEnableNode
	| SlackV23UserGroupGetAllNode
	| SlackV23UserGroupUpdateNode
	;