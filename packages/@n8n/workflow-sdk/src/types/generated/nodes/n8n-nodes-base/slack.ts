/**
 * Slack Node Types
 *
 * Consume Slack API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/slack/
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

/** Archives a conversation */
export type SlackV24ChannelArchiveConfig = {
	resource: 'channel';
	operation: 'archive';
	/**
	 * The Slack channel to archive
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * The ID of the user to invite into channel. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
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
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	userId?: string | Expression<string>;
};

/** Leaves a conversation */
export type SlackV24ChannelLeaveConfig = {
	resource: 'channel';
	operation: 'leave';
	/**
	 * The Slack channel to leave from
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
	/**
	 * Whether to resolve the data automatically. By default the response only contain the ID to resource.
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
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * New name for conversation
	 */
	name: string | Expression<string>;
};

/** Get a thread of messages posted to a channel */
export type SlackV24ChannelRepliesConfig = {
	resource: 'channel';
	operation: 'replies';
	/**
	 * The Slack channel to replies to
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * Timestamp of the message to reply
	 */
	ts: number | Expression<number>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * A new, specialer purpose
	 */
	purpose: string | Expression<string>;
};

/** Sets the topic for a conversation */
export type SlackV24ChannelSetTopicConfig = {
	resource: 'channel';
	operation: 'setTopic';
	/**
	 * The Slack channel to set the topic of
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData?: boolean | Expression<boolean>;
	fileContent?: string | Expression<string>;
	/**
	 * Name of the binary property which contains the data for the file to be uploaded
	 * @default data
	 */
	binaryPropertyName: string | Expression<string>;
	/**
	 * Other options to set
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
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	user?: ResourceLocatorValue;
	/**
	 * Timestamp of the message to delete
	 */
	timestamp: number | Expression<number>;
};

export type SlackV24MessageGetPermalinkConfig = {
	resource: 'message';
	operation: 'getPermalink';
	/**
	 * The Slack channel to get the message permalink from
	 * @default {"mode":"list","value":""}
	 */
	channelId?: ResourceLocatorValue;
	/**
	 * Timestamp of the message to message
	 */
	timestamp: number | Expression<number>;
};

export type SlackV24MessageSearchConfig = {
	resource: 'message';
	operation: 'search';
	/**
	 * The text to search for within messages
	 */
	query: string | Expression<string>;
	/**
	 * How search results should be sorted. You can sort by.
	 * @default desc
	 */
	sort?: 'desc' | 'asc' | 'relevance' | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	user?: ResourceLocatorValue;
	/**
	 * Whether to send a simple text message, or use Slack’s Blocks UI builder for more sophisticated messages that include form fields, sections and more
	 * @default text
	 */
	messageType?: 'text' | 'block' | 'attachment' | Expression<string>;
	/**
	 * The message text to post. Supports &lt;a href="https://api.slack.com/reference/surfaces/formatting"&gt;markdown&lt;/a&gt; by default - this can be disabled in "Options".
	 */
	text: string | Expression<string>;
	/**
	 * Enter the JSON output from Slack's visual Block Kit Builder here. You can then use expressions to add variable content to your blocks. To create blocks, use &lt;a target='_blank' href='https://app.slack.com/block-kit-builder'&gt;Slack's Block Kit Builder&lt;/a&gt;
	 */
	blocksUi: string | Expression<string>;
	attachments?: Record<string, unknown>;
	/**
	 * Other options to set
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
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	user?: ResourceLocatorValue;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	formFields?: Record<string, unknown>;
	approvalOptions?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

export type SlackV24MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
	/**
	 * The Slack channel to update the message from
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * Timestamp of the message to update
	 */
	ts: number | Expression<number>;
	/**
	 * Whether to send a simple text message, or use Slack’s Blocks UI builder for more sophisticated messages that include form fields, sections and more
	 * @default text
	 */
	messageType?: 'text' | 'block' | 'attachment' | Expression<string>;
	/**
	 * Enter the JSON output from Slack's visual Block Kit Builder here. You can then use expressions to add variable content to your blocks. To create blocks, use &lt;a target='_blank' href='https://app.slack.com/block-kit-builder'&gt;Slack's Block Kit Builder&lt;/a&gt;
	 */
	blocksUi: string | Expression<string>;
	/**
	 * Fallback text to display in slack notifications. Supports &lt;a href="https://api.slack.com/reference/surfaces/formatting"&gt;markdown&lt;/a&gt; by default - this can be disabled in "Options".
	 */
	text?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	/**
	 * Other options to set
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
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * Timestamp of the message to add, get or remove
	 */
	timestamp: number | Expression<number>;
	/**
	 * Emoji code to use for the message reaction. Use emoji codes like +1, not an actual emoji like 👍. &lt;a target="_blank" href=" https://www.webfx.com/tools/emoji-cheat-sheet/"&gt;List of common emoji codes&lt;/a&gt;
	 */
	name: string | Expression<string>;
};

/** Get information about a channel */
export type SlackV24ReactionGetConfig = {
	resource: 'reaction';
	operation: 'get';
	/**
	 * The Slack channel to get the reactions from
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * Timestamp of the message to add, get or remove
	 */
	timestamp: number | Expression<number>;
};

/** Remove a reaction of a message */
export type SlackV24ReactionRemoveConfig = {
	resource: 'reaction';
	operation: 'remove';
	/**
	 * The Slack channel to get the reactions from
	 * @default {"mode":"list","value":""}
	 */
	channelId: ResourceLocatorValue;
	/**
	 * Timestamp of the message to add, get or remove
	 */
	timestamp: number | Expression<number>;
	/**
	 * Emoji code to use for the message reaction. Use emoji codes like +1, not an actual emoji like 👍. &lt;a target="_blank" href=" https://www.webfx.com/tools/emoji-cheat-sheet/"&gt;List of common emoji codes&lt;/a&gt;
	 */
	name: string | Expression<string>;
};

/** Add a star to an item */
export type SlackV24StarAddConfig = {
	resource: 'star';
	operation: 'add';
	/**
	 * Choose whether to add a star to a message or a file
	 */
	target: 'message' | 'file' | Expression<string>;
	/**
	 * The Slack channel to add a star to
	 * @default {"mode":"list","value":""}
	 */
	channelId?: ResourceLocatorValue;
	/**
	 * File to add star to
	 */
	fileId?: string | Expression<string>;
	/**
	 * Timestamp of the message to add
	 */
	timestamp?: number | Expression<number>;
	/**
	 * Options to set
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

export type SlackV24StarDeleteConfig = {
	resource: 'star';
	operation: 'delete';
	/**
	 * Options to set
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	name: string | Expression<string>;
	Options?: Record<string, unknown>;
};

export type SlackV24UserGroupDisableConfig = {
	resource: 'userGroup';
	operation: 'disable';
	/**
	 * The encoded ID of the User Group to update
	 */
	userGroupId: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type SlackV24UserGroupEnableConfig = {
	resource: 'userGroup';
	operation: 'enable';
	/**
	 * The encoded ID of the User Group to update
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

export type SlackV24UserGroupUpdateConfig = {
	resource: 'userGroup';
	operation: 'update';
	/**
	 * The encoded ID of the User Group to update
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
	| SlackV24UserGroupUpdateConfig;

/** Archives a conversation */
export type SlackV1ChannelArchiveConfig = {
	resource: 'channel';
	operation: 'archive';
	/**
	 * The name of the channel to archive. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
};

/** Closes a direct message or multi-person direct message */
export type SlackV1ChannelCloseConfig = {
	resource: 'channel';
	operation: 'close';
	/**
	 * The name of the channel to close. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
};

/** Initiates a public or private channel-based conversation */
export type SlackV1ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
	/**
	 * The name of the channel to create
	 */
	channelId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get information about a channel */
export type SlackV1ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
	/**
	 * Channel ID to learn more about
	 */
	channelId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many channels in a Slack team */
export type SlackV1ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get a conversation's history of messages and events */
export type SlackV1ChannelHistoryConfig = {
	resource: 'channel';
	operation: 'history';
	/**
	 * The name of the channel to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Invite a user to a channel */
export type SlackV1ChannelInviteConfig = {
	resource: 'channel';
	operation: 'invite';
	/**
	 * The ID of the channel to invite user to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * The ID of the user to invite into channel. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	userIds: string[];
};

/** Joins an existing conversation */
export type SlackV1ChannelJoinConfig = {
	resource: 'channel';
	operation: 'join';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	channelId: string | Expression<string>;
};

/** Removes a user from a channel */
export type SlackV1ChannelKickConfig = {
	resource: 'channel';
	operation: 'kick';
	/**
	 * The name of the channel to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	userId?: string | Expression<string>;
};

/** Leaves a conversation */
export type SlackV1ChannelLeaveConfig = {
	resource: 'channel';
	operation: 'leave';
	/**
	 * The name of the channel to leave. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
};

/** List members of a conversation */
export type SlackV1ChannelMemberConfig = {
	resource: 'channel';
	operation: 'member';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	channelId: string | Expression<string>;
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
	 * Whether to resolve the data automatically. By default the response only contain the ID to resource.
	 * @default false
	 */
	resolveData?: boolean | Expression<boolean>;
};

/** Opens or resumes a direct message or multi-person direct message */
export type SlackV1ChannelOpenConfig = {
	resource: 'channel';
	operation: 'open';
	options?: Record<string, unknown>;
};

/** Renames a conversation */
export type SlackV1ChannelRenameConfig = {
	resource: 'channel';
	operation: 'rename';
	/**
	 * The name of the channel to rename. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * New name for conversation
	 */
	name: string | Expression<string>;
};

/** Get a thread of messages posted to a channel */
export type SlackV1ChannelRepliesConfig = {
	resource: 'channel';
	operation: 'replies';
	/**
	 * The name of the channel to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * Unique identifier of a thread's parent message
	 */
	ts: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Sets the purpose for a conversation */
export type SlackV1ChannelSetPurposeConfig = {
	resource: 'channel';
	operation: 'setPurpose';
	/**
	 * Conversation to set the purpose of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * A new, specialer purpose
	 */
	purpose: string | Expression<string>;
};

/** Sets the topic for a conversation */
export type SlackV1ChannelSetTopicConfig = {
	resource: 'channel';
	operation: 'setTopic';
	/**
	 * Conversation to set the topic of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * The new topic string. Does not support formatting or linkification.
	 */
	topic: string | Expression<string>;
};

/** Unarchives a conversation */
export type SlackV1ChannelUnarchiveConfig = {
	resource: 'channel';
	operation: 'unarchive';
	/**
	 * The ID of the channel to unarchive. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
};

/** Get information about a channel */
export type SlackV1FileGetConfig = {
	resource: 'file';
	operation: 'get';
	fileId?: string | Expression<string>;
};

/** Get many channels in a Slack team */
export type SlackV1FileGetAllConfig = {
	resource: 'file';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Create or upload an existing file */
export type SlackV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	/**
	 * Whether the data to upload should be taken from binary field
	 * @default false
	 */
	binaryData?: boolean | Expression<boolean>;
	/**
	 * The text content of the file to upload
	 */
	fileContent?: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	/**
	 * Other options to set
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

/** Deletes a message */
export type SlackV1MessageDeleteConfig = {
	resource: 'message';
	operation: 'delete';
	/**
	 * Channel containing the message to be deleted. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * Timestamp of the message to be deleted
	 */
	timestamp: string | Expression<string>;
};

/** Get Permanent Link of a message */
export type SlackV1MessageGetPermalinkConfig = {
	resource: 'message';
	operation: 'getPermalink';
	/**
	 * Channel containing the message. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * Timestamp of the message to get permanent link
	 */
	timestamp: string | Expression<string>;
};

/** Post a message into a channel */
export type SlackV1MessagePostConfig = {
	resource: 'message';
	operation: 'post';
	/**
	 * The channel to send the message to
	 */
	channel: string | Expression<string>;
	/**
	 * The text to send
	 */
	text?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Other options to set
	 * @default {}
	 */
	otherOptions?: Record<string, unknown>;
	/**
	 * The attachment to add
	 * @default {}
	 */
	attachments?: Record<string, unknown>;
	/**
	 * The blocks to add
	 * @default {}
	 */
	blocksUi?: Record<string, unknown>;
	/**
	 * The attachments to add
	 */
	attachmentsJson?: IDataObject | string | Expression<string>;
	/**
	 * The blocks to add
	 */
	blocksJson?: IDataObject | string | Expression<string>;
};

/** Post an ephemeral message to a user in channel */
export type SlackV1MessagePostEphemeralConfig = {
	resource: 'message';
	operation: 'postEphemeral';
	/**
	 * The channel to send the message to
	 */
	channel: string | Expression<string>;
	/**
	 * The user ID to send the message to
	 */
	user: string | Expression<string>;
	/**
	 * The text to send
	 */
	text?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Other options to set
	 * @default {}
	 */
	otherOptions?: Record<string, unknown>;
	/**
	 * The attachment to add
	 * @default {}
	 */
	attachments?: Record<string, unknown>;
};

/** Updates a message */
export type SlackV1MessageUpdateConfig = {
	resource: 'message';
	operation: 'update';
	/**
	 * Channel containing the message to be updated. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * New text for the message, using the default formatting rules. It's not required when presenting attachments.
	 */
	text?: string | Expression<string>;
	/**
	 * Timestamp of the message to be updated
	 */
	ts: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
	/**
	 * The attachments to add
	 */
	attachmentsJson?: IDataObject | string | Expression<string>;
	/**
	 * The blocks to add
	 */
	blocksJson?: IDataObject | string | Expression<string>;
	/**
	 * The attachment to add
	 * @default {}
	 */
	attachments?: Record<string, unknown>;
};

/** Add a star to an item */
export type SlackV1ReactionAddConfig = {
	resource: 'reaction';
	operation: 'add';
	/**
	 * Channel containing the message. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * Name of emoji
	 */
	name: string | Expression<string>;
	/**
	 * Timestamp of the message
	 */
	timestamp: string | Expression<string>;
};

/** Get information about a channel */
export type SlackV1ReactionGetConfig = {
	resource: 'reaction';
	operation: 'get';
	/**
	 * Channel containing the message. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * Timestamp of the message
	 */
	timestamp: string | Expression<string>;
};

/** Remove a reaction of a message */
export type SlackV1ReactionRemoveConfig = {
	resource: 'reaction';
	operation: 'remove';
	/**
	 * Channel containing the message. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	channelId: string | Expression<string>;
	/**
	 * Name of emoji
	 */
	name: string | Expression<string>;
	/**
	 * Timestamp of the message
	 */
	timestamp: string | Expression<string>;
};

/** Add a star to an item */
export type SlackV1StarAddConfig = {
	resource: 'star';
	operation: 'add';
	/**
	 * Options to set
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

/** Deletes a message */
export type SlackV1StarDeleteConfig = {
	resource: 'star';
	operation: 'delete';
	/**
	 * Options to set
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

/** Get many channels in a Slack team */
export type SlackV1StarGetAllConfig = {
	resource: 'star';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Get information about a user */
export type SlackV1UserInfoConfig = {
	resource: 'user';
	operation: 'info';
	/**
	 * The ID of the user to get information about
	 */
	user: string | Expression<string>;
};

/** Get many channels in a Slack team */
export type SlackV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Get online status of a user */
export type SlackV1UserGetPresenceConfig = {
	resource: 'user';
	operation: 'getPresence';
	/**
	 * The ID of the user to get the online status of
	 */
	user: string | Expression<string>;
};

/** Initiates a public or private channel-based conversation */
export type SlackV1UserGroupCreateConfig = {
	resource: 'userGroup';
	operation: 'create';
	/**
	 * A name for the User Group. Must be unique among User Groups.
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Disable a user group */
export type SlackV1UserGroupDisableConfig = {
	resource: 'userGroup';
	operation: 'disable';
	/**
	 * The encoded ID of the User Group to update
	 */
	userGroupId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Enable a user group */
export type SlackV1UserGroupEnableConfig = {
	resource: 'userGroup';
	operation: 'enable';
	/**
	 * The encoded ID of the User Group to update
	 */
	userGroupId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many channels in a Slack team */
export type SlackV1UserGroupGetAllConfig = {
	resource: 'userGroup';
	operation: 'getAll';
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
	additionalFields?: Record<string, unknown>;
};

/** Updates a message */
export type SlackV1UserGroupUpdateConfig = {
	resource: 'userGroup';
	operation: 'update';
	/**
	 * The encoded ID of the User Group to update
	 */
	userGroupId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Get information about a channel */
export type SlackV1UserProfileGetConfig = {
	resource: 'userProfile';
	operation: 'get';
	additionalFields?: Record<string, unknown>;
};

/** Updates a message */
export type SlackV1UserProfileUpdateConfig = {
	resource: 'userProfile';
	operation: 'update';
	additionalFields?: Record<string, unknown>;
};

export type SlackV1Params =
	| SlackV1ChannelArchiveConfig
	| SlackV1ChannelCloseConfig
	| SlackV1ChannelCreateConfig
	| SlackV1ChannelGetConfig
	| SlackV1ChannelGetAllConfig
	| SlackV1ChannelHistoryConfig
	| SlackV1ChannelInviteConfig
	| SlackV1ChannelJoinConfig
	| SlackV1ChannelKickConfig
	| SlackV1ChannelLeaveConfig
	| SlackV1ChannelMemberConfig
	| SlackV1ChannelOpenConfig
	| SlackV1ChannelRenameConfig
	| SlackV1ChannelRepliesConfig
	| SlackV1ChannelSetPurposeConfig
	| SlackV1ChannelSetTopicConfig
	| SlackV1ChannelUnarchiveConfig
	| SlackV1FileGetConfig
	| SlackV1FileGetAllConfig
	| SlackV1FileUploadConfig
	| SlackV1MessageDeleteConfig
	| SlackV1MessageGetPermalinkConfig
	| SlackV1MessagePostConfig
	| SlackV1MessagePostEphemeralConfig
	| SlackV1MessageUpdateConfig
	| SlackV1ReactionAddConfig
	| SlackV1ReactionGetConfig
	| SlackV1ReactionRemoveConfig
	| SlackV1StarAddConfig
	| SlackV1StarDeleteConfig
	| SlackV1StarGetAllConfig
	| SlackV1UserInfoConfig
	| SlackV1UserGetAllConfig
	| SlackV1UserGetPresenceConfig
	| SlackV1UserGroupCreateConfig
	| SlackV1UserGroupDisableConfig
	| SlackV1UserGroupEnableConfig
	| SlackV1UserGroupGetAllConfig
	| SlackV1UserGroupUpdateConfig
	| SlackV1UserProfileGetConfig
	| SlackV1UserProfileUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SlackV24Credentials {
	slackApi: CredentialReference;
	slackOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SlackNode = {
	type: 'n8n-nodes-base.slack';
	version: 1 | 2 | 2.1 | 2.2 | 2.3 | 2.4;
	config: NodeConfig<SlackV24Params>;
	credentials?: SlackV24Credentials;
};
