/**
 * Slack Node - Version 2
 * Consume Slack API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
export type SlackV2ChannelArchiveConfig = {
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
export type SlackV2ChannelCloseConfig = {
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
export type SlackV2ChannelCreateConfig = {
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
export type SlackV2ChannelGetConfig = {
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
export type SlackV2ChannelGetAllConfig = {
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
export type SlackV2ChannelHistoryConfig = {
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
export type SlackV2ChannelInviteConfig = {
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
export type SlackV2ChannelJoinConfig = {
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
export type SlackV2ChannelKickConfig = {
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
export type SlackV2ChannelLeaveConfig = {
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
export type SlackV2ChannelMemberConfig = {
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
export type SlackV2ChannelOpenConfig = {
	resource: 'channel';
	operation: 'open';
	options?: Record<string, unknown>;
};

/** Renames a conversation */
export type SlackV2ChannelRenameConfig = {
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
export type SlackV2ChannelRepliesConfig = {
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
export type SlackV2ChannelSetPurposeConfig = {
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
export type SlackV2ChannelSetTopicConfig = {
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
export type SlackV2ChannelUnarchiveConfig = {
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
export type SlackV2FileGetConfig = {
	resource: 'file';
	operation: 'get';
	fileId?: string | Expression<string>;
};

/** Get many channels in a Slack team */
export type SlackV2FileGetAllConfig = {
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
export type SlackV2FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
/**
 * Whether the data to upload should be taken from binary field
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default false
 */
		binaryData?: boolean | Expression<boolean>;
	fileContent?: string | Expression<string>;
/**
 * Name of the binary property which contains the data for the file to be uploaded
 * @displayOptions.show { operation: ["upload"], resource: ["file"], binaryData: [true] }
 * @default data
 */
		binaryPropertyName: string | Expression<string>;
/**
 * Other options to set
 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
 * @default {}
 */
		options?: Record<string, unknown>;
};

export type SlackV2MessageDeleteConfig = {
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

export type SlackV2MessageGetPermalinkConfig = {
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

export type SlackV2MessageSearchConfig = {
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

export type SlackV2MessagePostConfig = {
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

export type SlackV2MessageSendAndWaitConfig = {
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

export type SlackV2MessageUpdateConfig = {
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
export type SlackV2ReactionAddConfig = {
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
export type SlackV2ReactionGetConfig = {
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
export type SlackV2ReactionRemoveConfig = {
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
export type SlackV2StarAddConfig = {
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

export type SlackV2StarDeleteConfig = {
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
export type SlackV2StarGetAllConfig = {
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
export type SlackV2UserInfoConfig = {
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
export type SlackV2UserGetAllConfig = {
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
export type SlackV2UserGetProfileConfig = {
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
export type SlackV2UserGetPresenceConfig = {
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
export type SlackV2UserUpdateProfileConfig = {
	resource: 'user';
	operation: 'updateProfile';
	options?: Record<string, unknown>;
};

/** Initiates a public or private channel-based conversation */
export type SlackV2UserGroupCreateConfig = {
	resource: 'userGroup';
	operation: 'create';
/**
 * A name for the User Group. Must be unique among User Groups.
 * @displayOptions.show { operation: ["create"], resource: ["userGroup"] }
 */
		name: string | Expression<string>;
	Options?: Record<string, unknown>;
};

export type SlackV2UserGroupDisableConfig = {
	resource: 'userGroup';
	operation: 'disable';
/**
 * The encoded ID of the User Group to update
 * @displayOptions.show { operation: ["disable"], resource: ["userGroup"] }
 */
		userGroupId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type SlackV2UserGroupEnableConfig = {
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
export type SlackV2UserGroupGetAllConfig = {
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

export type SlackV2UserGroupUpdateConfig = {
	resource: 'userGroup';
	operation: 'update';
/**
 * The encoded ID of the User Group to update
 * @displayOptions.show { operation: ["update"], resource: ["userGroup"] }
 */
		userGroupId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type SlackV2Params =
	| SlackV2ChannelArchiveConfig
	| SlackV2ChannelCloseConfig
	| SlackV2ChannelCreateConfig
	| SlackV2ChannelGetConfig
	| SlackV2ChannelGetAllConfig
	| SlackV2ChannelHistoryConfig
	| SlackV2ChannelInviteConfig
	| SlackV2ChannelJoinConfig
	| SlackV2ChannelKickConfig
	| SlackV2ChannelLeaveConfig
	| SlackV2ChannelMemberConfig
	| SlackV2ChannelOpenConfig
	| SlackV2ChannelRenameConfig
	| SlackV2ChannelRepliesConfig
	| SlackV2ChannelSetPurposeConfig
	| SlackV2ChannelSetTopicConfig
	| SlackV2ChannelUnarchiveConfig
	| SlackV2FileGetConfig
	| SlackV2FileGetAllConfig
	| SlackV2FileUploadConfig
	| SlackV2MessageDeleteConfig
	| SlackV2MessageGetPermalinkConfig
	| SlackV2MessageSearchConfig
	| SlackV2MessagePostConfig
	| SlackV2MessageSendAndWaitConfig
	| SlackV2MessageUpdateConfig
	| SlackV2ReactionAddConfig
	| SlackV2ReactionGetConfig
	| SlackV2ReactionRemoveConfig
	| SlackV2StarAddConfig
	| SlackV2StarDeleteConfig
	| SlackV2StarGetAllConfig
	| SlackV2UserInfoConfig
	| SlackV2UserGetAllConfig
	| SlackV2UserGetProfileConfig
	| SlackV2UserGetPresenceConfig
	| SlackV2UserUpdateProfileConfig
	| SlackV2UserGroupCreateConfig
	| SlackV2UserGroupDisableConfig
	| SlackV2UserGroupEnableConfig
	| SlackV2UserGroupGetAllConfig
	| SlackV2UserGroupUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SlackV2Credentials {
	slackApi: CredentialReference;
	slackOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SlackV2Node = {
	type: 'n8n-nodes-base.slack';
	version: 2;
	config: NodeConfig<SlackV2Params>;
	credentials?: SlackV2Credentials;
};