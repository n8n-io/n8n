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
	 * Whether the data to upload should be taken from binary field
	 * @displayOptions.show { operation: ["upload"], resource: ["file"], @version: [2, 2.1] }
	 * @default false
	 */
	binaryData?: boolean | Expression<boolean>;
	fileContent?: string | Expression<string>;
	/**
	 * Name of the binary property which contains the data for the file to be uploaded
	 * @displayOptions.show { operation: ["upload"], resource: ["file"], binaryData: [true], @version: [2, 2.1] }
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
	formFields?: {
		values?: Array<{
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [2.4] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** Label that appears above the input field
			 * @displayOptions.show { @version: [{"_cnd":{"lt":2.4}}] }
			 * @displayOptions.hide { fieldType: ["hiddenField", "html"] }
			 */
			fieldLabel?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { fieldType: ["hiddenField"], @version: [{"_cnd":{"lt":2.4}}] }
			 */
			fieldName?: string | Expression<string>;
			/** The type of field to add to the form
			 * @default text
			 */
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
			/** Optional field. It can be used to include the html in the output.
			 * @displayOptions.show { fieldType: ["html"] }
			 */
			elementName?: string | Expression<string>;
			/** The name of the field, used in input attributes and referenced by the workflow
			 * @displayOptions.show { @version: [{"_cnd":{"gte":2.5}}] }
			 * @displayOptions.hide { fieldType: ["html"] }
			 */
			fieldName?: string | Expression<string>;
			/** Sample text to display inside the field
			 * @displayOptions.hide { fieldType: ["dropdown", "date", "file", "html", "hiddenField", "radio", "checkbox"] }
			 */
			placeholder?: string | Expression<string>;
			/** Default value that will be pre-filled in the form field
			 * @displayOptions.show { fieldType: ["text", "number", "email", "textarea"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default date value that will be pre-filled in the form field (format: YYYY-MM-DD)
			 * @displayOptions.show { fieldType: ["date"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value that will be pre-selected. Must match one of the option labels.
			 * @displayOptions.show { fieldType: ["dropdown", "radio"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Default value(s) that will be pre-selected. Must match one or multiple of the option labels. Separate multiple pre-selected options with a comma.
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 */
			defaultValue?: string | Expression<string>;
			/** Input value can be set here or will be passed as a query parameter via Field Name if no value is set
			 * @displayOptions.show { fieldType: ["hiddenField"] }
			 */
			fieldValue?: string | Expression<string>;
			/** List of options that can be selected from the dropdown
			 * @displayOptions.show { fieldType: ["dropdown"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Option
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Checkboxes
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Checkbox Label
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Radio Buttons
			 * @displayOptions.show { fieldType: ["radio"] }
			 * @default {"values":[{"option":""}]}
			 */
			fieldOptions?: {
				values?: Array<{
					/** Radio Button Label
					 */
					option?: string | Expression<string>;
				}>;
			};
			/** Whether to allow the user to select multiple options from the dropdown list
			 * @displayOptions.show { fieldType: ["dropdown"], @version: [{"_cnd":{"lt":2.3}}] }
			 * @default false
			 */
			multiselect?: boolean | Expression<boolean>;
			/** Limit Selection
			 * @displayOptions.show { fieldType: ["checkbox"] }
			 * @default unlimited
			 */
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			/** Number of Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["exact"] }
			 * @default 1
			 */
			numberOfSelections?: number | Expression<number>;
			/** Minimum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 0
			 */
			minSelections?: number | Expression<number>;
			/** Maximum Selections
			 * @displayOptions.show { fieldType: ["checkbox"], limitSelection: ["range"] }
			 * @default 1
			 */
			maxSelections?: number | Expression<number>;
			/** HTML elements to display on the form page
			 * @hint Does not accept &lt;code&gt;&lt;script&gt;&lt;/code&gt;, &lt;code&gt;&lt;style&gt;&lt;/code&gt; or &lt;code&gt;&lt;input&gt;&lt;/code&gt; tags
			 * @displayOptions.show { fieldType: ["html"] }
			 * @default <!-- Your custom HTML here --->



			 */
			html?: string | Expression<string>;
			/** Whether to allow the user to select multiple files from the file input or just one
			 * @displayOptions.show { fieldType: ["file"] }
			 * @default true
			 */
			multipleFiles?: boolean | Expression<boolean>;
			/** Comma-separated list of allowed file extensions
			 * @hint Leave empty to allow all file types
			 * @displayOptions.show { fieldType: ["file"] }
			 */
			acceptFileTypes?: string | Expression<string>;
			/** Whether to require the user to enter a value for this field before submitting the form
			 * @displayOptions.hide { fieldType: ["html", "hiddenField"] }
			 * @default false
			 */
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
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
	| SlackV24UserGroupUpdateConfig;

/** Archives a conversation */
export type SlackV1ChannelArchiveConfig = {
	resource: 'channel';
	operation: 'archive';
	/**
	 * The name of the channel to archive. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["archive"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
};

/** Closes a direct message or multi-person direct message */
export type SlackV1ChannelCloseConfig = {
	resource: 'channel';
	operation: 'close';
	/**
	 * The name of the channel to close. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["close"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
};

/** Initiates a public or private channel-based conversation */
export type SlackV1ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
	/**
	 * The name of the channel to create
	 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
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
	 * @displayOptions.show { operation: ["get"], resource: ["channel"] }
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
export type SlackV1ChannelHistoryConfig = {
	resource: 'channel';
	operation: 'history';
	/**
	 * The name of the channel to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["history"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
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
export type SlackV1ChannelInviteConfig = {
	resource: 'channel';
	operation: 'invite';
	/**
	 * The ID of the channel to invite user to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["invite"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * The ID of the user to invite into channel. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["invite"], resource: ["channel"] }
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
	 * @displayOptions.show { operation: ["join"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
};

/** Removes a user from a channel */
export type SlackV1ChannelKickConfig = {
	resource: 'channel';
	operation: 'kick';
	/**
	 * The name of the channel to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["kick"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["kick"], resource: ["channel"] }
	 */
	userId?: string | Expression<string>;
};

/** Leaves a conversation */
export type SlackV1ChannelLeaveConfig = {
	resource: 'channel';
	operation: 'leave';
	/**
	 * The name of the channel to leave. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["leave"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
};

/** List members of a conversation */
export type SlackV1ChannelMemberConfig = {
	resource: 'channel';
	operation: 'member';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["member"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
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
	 * @displayOptions.show { operation: ["rename"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * New name for conversation
	 * @displayOptions.show { operation: ["rename"], resource: ["channel"] }
	 */
	name: string | Expression<string>;
};

/** Get a thread of messages posted to a channel */
export type SlackV1ChannelRepliesConfig = {
	resource: 'channel';
	operation: 'replies';
	/**
	 * The name of the channel to create. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["replies"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * Unique identifier of a thread's parent message
	 * @displayOptions.show { operation: ["replies"], resource: ["channel"] }
	 */
	ts: string | Expression<string>;
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
export type SlackV1ChannelSetPurposeConfig = {
	resource: 'channel';
	operation: 'setPurpose';
	/**
	 * Conversation to set the purpose of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["setPurpose"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * A new, specialer purpose
	 * @displayOptions.show { operation: ["setPurpose"], resource: ["channel"] }
	 */
	purpose: string | Expression<string>;
};

/** Sets the topic for a conversation */
export type SlackV1ChannelSetTopicConfig = {
	resource: 'channel';
	operation: 'setTopic';
	/**
	 * Conversation to set the topic of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["setTopic"], resource: ["channel"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * The new topic string. Does not support formatting or linkification.
	 * @displayOptions.show { operation: ["setTopic"], resource: ["channel"] }
	 */
	topic: string | Expression<string>;
};

/** Unarchives a conversation */
export type SlackV1ChannelUnarchiveConfig = {
	resource: 'channel';
	operation: 'unarchive';
	/**
	 * The ID of the channel to unarchive. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["unarchive"], resource: ["channel"] }
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
export type SlackV1FileUploadConfig = {
	resource: 'file';
	operation: 'upload';
	/**
	 * Whether the data to upload should be taken from binary field
	 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
	 * @default false
	 */
	binaryData?: boolean | Expression<boolean>;
	/**
	 * The text content of the file to upload
	 * @displayOptions.show { operation: ["upload"], resource: ["file"], binaryData: [false] }
	 */
	fileContent?: string | Expression<string>;
	binaryPropertyName: string | Expression<string>;
	/**
	 * Other options to set
	 * @displayOptions.show { operation: ["upload"], resource: ["file"] }
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
	 * @displayOptions.show { resource: ["message"], operation: ["delete"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * Timestamp of the message to be deleted
	 * @displayOptions.show { resource: ["message"], operation: ["delete"] }
	 */
	timestamp: string | Expression<string>;
};

/** Get Permanent Link of a message */
export type SlackV1MessageGetPermalinkConfig = {
	resource: 'message';
	operation: 'getPermalink';
	/**
	 * Channel containing the message. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["message"], operation: ["getPermalink"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * Timestamp of the message to get permanent link
	 * @displayOptions.show { resource: ["message"], operation: ["getPermalink"] }
	 */
	timestamp: string | Expression<string>;
};

/** Post a message into a channel */
export type SlackV1MessagePostConfig = {
	resource: 'message';
	operation: 'post';
	/**
	 * The channel to send the message to
	 * @displayOptions.show { operation: ["post", "postEphemeral"], resource: ["message"] }
	 */
	channel: string | Expression<string>;
	/**
	 * The text to send
	 * @displayOptions.show { operation: ["post", "postEphemeral"], resource: ["message"] }
	 */
	text?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Other options to set
	 * @displayOptions.show { operation: ["post", "postEphemeral"], resource: ["message"] }
	 * @default {}
	 */
	otherOptions?: Record<string, unknown>;
	/**
	 * The attachment to add
	 * @displayOptions.show { operation: ["post", "postEphemeral"], resource: ["message"] }
	 * @default {}
	 */
	attachments?: Record<string, unknown>;
	/**
	 * The blocks to add
	 * @displayOptions.show { operation: ["post"], resource: ["message"], jsonParameters: [false] }
	 * @default {}
	 */
	blocksUi?: {
		blocksValues?: Array<{
			/** Type
			 * @default actions
			 */
			type?: 'actions' | 'section' | Expression<string>;
			/** A string acting as a unique identifier for a block. You can use this block_id when you receive an interaction payload to identify the source of the action. If not specified, a block_id will be generated. Maximum length for this field is 255 characters.
			 * @displayOptions.show { type: ["actions"] }
			 */
			blockId?: string | Expression<string>;
			/** Elements
			 * @displayOptions.show { type: ["actions"] }
			 * @default {}
			 */
			elementsUi?: {
				elementsValues?: Array<{
					/** The type of element
					 * @default button
					 */
					type?: 'button' | Expression<string>;
					/** The text for the block
					 * @displayOptions.show { type: ["button"] }
					 */
					text?: string | Expression<string>;
					/** Whether emojis in a text field should be escaped into the colon emoji format
					 * @displayOptions.show { type: ["button"] }
					 * @default false
					 */
					emoji?: boolean | Expression<boolean>;
					/** An identifier for this action. You can use this when you receive an interaction payload to identify the source of the action. Should be unique among all other action_ids used elsewhere by your app.
					 * @displayOptions.show { type: ["button"] }
					 */
					actionId?: string | Expression<string>;
					/** A URL to load in the user's browser when the button is clicked. Maximum length for this field is 3000 characters. If you're using URL, you'll still receive an interaction payload and will need to send an acknowledgement response.
					 * @displayOptions.show { type: ["button"] }
					 */
					url?: string | Expression<string>;
					/** The value to send along with the interaction payload
					 * @displayOptions.show { type: ["button"] }
					 */
					value?: string | Expression<string>;
					/** Decorates buttons with alternative visual color schemes
					 * @displayOptions.show { type: ["button"] }
					 * @default default
					 */
					style?: 'danger' | 'default' | 'primary' | Expression<string>;
					/** Defines an optional confirmation dialog after the button is clicked
					 * @default {}
					 */
					confirmUi?: {
						confirmValue?: {
							/** Defines the dialog's title
							 * @default {}
							 */
							titleUi?: {
								titleValue?: {
									/** Text of the title
									 */
									text?: string | Expression<string>;
									/** Whether emojis in a text field should be escaped into the colon emoji format
									 * @default false
									 */
									emoji?: boolean | Expression<boolean>;
								};
							};
							/** Defines the explanatory text that appears in the confirm dialog
							 * @default {}
							 */
							textUi?: {
								textValue?: {
									/** The text for the block
									 */
									text?: string | Expression<string>;
									/** Whether emojis in a text field should be escaped into the colon emoji format
									 * @default false
									 */
									emoji?: boolean | Expression<boolean>;
								};
							};
							/** Defines the text of the button that confirms the action
							 * @default {}
							 */
							confirmTextUi?: {
								confirmValue?: {
									/** Defines the explanatory text that appears in the confirm dialog
									 */
									text?: string | Expression<string>;
									/** Whether emojis in a text field should be escaped into the colon emoji format
									 * @default false
									 */
									emoji?: boolean | Expression<boolean>;
								};
							};
							/** Defines the text of the button that cancels the action
							 * @default {}
							 */
							denyUi?: {
								denyValue?: {
									/** Defines the text of the button that cancels the action
									 */
									text?: string | Expression<string>;
									/** Whether emojis in a text field should be escaped into the colon emoji format
									 * @default false
									 */
									emoji?: boolean | Expression<boolean>;
								};
							};
							/** Defines the color scheme applied to the confirm button
							 * @default default
							 */
							style?: 'danger' | 'default' | 'primary' | Expression<string>;
						};
					};
				}>;
			};
			/** A string acting as a unique identifier for a block. You can use this block_id when you receive an interaction payload to identify the source of the action. If not specified, a block_id will be generated. Maximum length for this field is 255 characters.
			 * @displayOptions.show { type: ["section"] }
			 */
			blockId?: string | Expression<string>;
			/** Define the text of the button that cancels the action
			 * @displayOptions.show { type: ["section"] }
			 * @default {}
			 */
			textUi?: {
				textValue?: {
					/** The formatting to use for this text object
					 * @default mrkwdn
					 */
					type?: 'mrkwdn' | 'plainText' | Expression<string>;
					/** The text for the block. This field accepts any of the standard text formatting markup when type is mrkdwn.
					 */
					text?: string | Expression<string>;
					/** Whether emojis in a text field should be escaped into the colon emoji format. This field is only usable when type is plain_text.
					 * @displayOptions.show { type: ["plainText"] }
					 * @default false
					 */
					emoji?: boolean | Expression<boolean>;
					/** Whether to set to false (as is default) URLs will be auto-converted into links, conversation names will be link-ified, and certain mentions will be automatically parsed
					 * @displayOptions.show { type: ["mrkwdn"] }
					 * @default false
					 */
					verbatim?: boolean | Expression<boolean>;
				};
			};
			/** An array of text objects. Any text objects included with fields will be rendered in a compact format that allows for 2 columns of side-by-side text. Maximum number of items is 10.
			 * @displayOptions.show { type: ["section"] }
			 * @default {}
			 */
			fieldsUi?: {
				fieldsValues?: Array<{
					/** The formatting to use for this text object
					 * @default mrkwdn
					 */
					type?: 'mrkwdn' | 'plainText' | Expression<string>;
					/** The text for the block. This field accepts any of the standard text formatting markup when type is mrkdwn.
					 */
					text?: string | Expression<string>;
					/** Whether emojis in a text field should be escaped into the colon emoji format. This field is only usable when type is plain_text.
					 * @displayOptions.show { type: ["plainText"] }
					 * @default false
					 */
					emoji?: boolean | Expression<boolean>;
					/** When set to false (as is default) URLs will be auto-converted into links, conversation names will be link-ified, and certain mentions will be automatically parsed
					 * @displayOptions.show { type: ["mrkwdn"] }
					 * @default false
					 */
					verbatim?: boolean | Expression<boolean>;
				}>;
			};
			/** Accessory
			 * @displayOptions.show { type: ["section"] }
			 * @default {}
			 */
			accessoryUi?: {
				accessoriesValues?: {
					/** The type of element
					 * @default button
					 */
					type?: 'button' | Expression<string>;
					/** The text for the block
					 * @displayOptions.show { type: ["button"] }
					 */
					text?: string | Expression<string>;
					/** Whether emojis in a text field should be escaped into the colon emoji format
					 * @displayOptions.show { type: ["button"] }
					 * @default false
					 */
					emoji?: boolean | Expression<boolean>;
					/** An identifier for this action. You can use this when you receive an interaction payload to identify the source of the action. Should be unique among all other action_ids used elsewhere by your app.
					 * @displayOptions.show { type: ["button"] }
					 */
					actionId?: string | Expression<string>;
					/** A URL to load in the user's browser when the button is clicked. Maximum length for this field is 3000 characters. If you're using URL, you'll still receive an interaction payload and will need to send an acknowledgement response.
					 * @displayOptions.show { type: ["button"] }
					 */
					url?: string | Expression<string>;
					/** The value to send along with the interaction payload
					 * @displayOptions.show { type: ["button"] }
					 */
					value?: string | Expression<string>;
					/** Decorates buttons with alternative visual color schemes
					 * @displayOptions.show { type: ["button"] }
					 * @default default
					 */
					style?: 'danger' | 'default' | 'primary' | Expression<string>;
					/** Defines an optional confirmation dialog after the button is clicked
					 * @displayOptions.show { type: ["button"] }
					 * @default {}
					 */
					confirmUi?: {
						confirmValue?: {
							/** Defines an optional confirmation dialog after the button is clicked
							 * @default {}
							 */
							titleUi?: {
								titleValue?: {
									/** Text of the title
									 */
									text?: string | Expression<string>;
									/** Whether emojis in a text field should be escaped into the colon emoji format
									 * @default false
									 */
									emoji?: boolean | Expression<boolean>;
								};
							};
							/** Defines the explanatory text that appears in the confirm dialog
							 * @default {}
							 */
							textUi?: {
								textValue?: {
									/** The text for the block
									 */
									text?: string | Expression<string>;
									/** Whether emojis in a text field should be escaped into the colon emoji format
									 * @default false
									 */
									emoji?: boolean | Expression<boolean>;
								};
							};
							/** Defines the explanatory text that appears in the confirm dialog
							 * @default {}
							 */
							confirmTextUi?: {
								confirmValue?: {
									/** Defines the explanatory text that appears in the confirm dialog
									 */
									text?: string | Expression<string>;
									/** Whether emojis in a text field should be escaped into the colon emoji format
									 * @default false
									 */
									emoji?: boolean | Expression<boolean>;
								};
							};
							/** Define the text of the button that cancels the action
							 * @default {}
							 */
							denyUi?: {
								denyValue?: {
									/** Define the text of the button that cancels the action
									 */
									text?: string | Expression<string>;
									/** Whether emojis in a text field should be escaped into the colon emoji format
									 * @default false
									 */
									emoji?: boolean | Expression<boolean>;
								};
							};
							/** Defines the color scheme applied to the confirm button
							 * @default default
							 */
							style?: 'danger' | 'default' | 'primary' | Expression<string>;
						};
					};
				};
			};
		}>;
	};
	/**
	 * The attachments to add
	 * @displayOptions.show { resource: ["message"], operation: ["post"], jsonParameters: [true] }
	 */
	attachmentsJson?: IDataObject | string | Expression<string>;
	/**
	 * The blocks to add
	 * @displayOptions.show { resource: ["message"], operation: ["post"], jsonParameters: [true] }
	 */
	blocksJson?: IDataObject | string | Expression<string>;
};

/** Post an ephemeral message to a user in channel */
export type SlackV1MessagePostEphemeralConfig = {
	resource: 'message';
	operation: 'postEphemeral';
	/**
	 * The channel to send the message to
	 * @displayOptions.show { operation: ["post", "postEphemeral"], resource: ["message"] }
	 */
	channel: string | Expression<string>;
	/**
	 * The user ID to send the message to
	 * @displayOptions.show { operation: ["postEphemeral"], resource: ["message"] }
	 */
	user: string | Expression<string>;
	/**
	 * The text to send
	 * @displayOptions.show { operation: ["post", "postEphemeral"], resource: ["message"] }
	 */
	text?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Other options to set
	 * @displayOptions.show { operation: ["post", "postEphemeral"], resource: ["message"] }
	 * @default {}
	 */
	otherOptions?: Record<string, unknown>;
	/**
	 * The attachment to add
	 * @displayOptions.show { operation: ["post", "postEphemeral"], resource: ["message"] }
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
	 * @displayOptions.show { resource: ["message"], operation: ["update"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * New text for the message, using the default formatting rules. It's not required when presenting attachments.
	 * @displayOptions.show { resource: ["message"], operation: ["update"] }
	 */
	text?: string | Expression<string>;
	/**
	 * Timestamp of the message to be updated
	 * @displayOptions.show { resource: ["message"], operation: ["update"] }
	 */
	ts: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
	/**
	 * The attachments to add
	 * @displayOptions.show { resource: ["message"], operation: ["update"], jsonParameters: [true] }
	 */
	attachmentsJson?: IDataObject | string | Expression<string>;
	/**
	 * The blocks to add
	 * @displayOptions.show { resource: ["message"], operation: ["update"], jsonParameters: [true] }
	 */
	blocksJson?: IDataObject | string | Expression<string>;
	/**
	 * The attachment to add
	 * @displayOptions.show { jsonParameters: [false], operation: ["update"], resource: ["message"] }
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
	 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * Name of emoji
	 * @displayOptions.show { resource: ["reaction"], operation: ["add", "remove"] }
	 */
	name: string | Expression<string>;
	/**
	 * Timestamp of the message
	 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
	 */
	timestamp: string | Expression<string>;
};

/** Get information about a channel */
export type SlackV1ReactionGetConfig = {
	resource: 'reaction';
	operation: 'get';
	/**
	 * Channel containing the message. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * Timestamp of the message
	 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
	 */
	timestamp: string | Expression<string>;
};

/** Remove a reaction of a message */
export type SlackV1ReactionRemoveConfig = {
	resource: 'reaction';
	operation: 'remove';
	/**
	 * Channel containing the message. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
	 */
	channelId: string | Expression<string>;
	/**
	 * Name of emoji
	 * @displayOptions.show { resource: ["reaction"], operation: ["add", "remove"] }
	 */
	name: string | Expression<string>;
	/**
	 * Timestamp of the message
	 * @displayOptions.show { resource: ["reaction"], operation: ["add", "get", "remove"] }
	 */
	timestamp: string | Expression<string>;
};

/** Add a star to an item */
export type SlackV1StarAddConfig = {
	resource: 'star';
	operation: 'add';
	/**
	 * Options to set
	 * @displayOptions.show { operation: ["add"], resource: ["star"] }
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
	 * @displayOptions.show { operation: ["delete"], resource: ["star"] }
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
export type SlackV1UserInfoConfig = {
	resource: 'user';
	operation: 'info';
	/**
	 * The ID of the user to get information about
	 * @displayOptions.show { operation: ["info"], resource: ["user"] }
	 */
	user: string | Expression<string>;
};

/** Get many channels in a Slack team */
export type SlackV1UserGetAllConfig = {
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

/** Get online status of a user */
export type SlackV1UserGetPresenceConfig = {
	resource: 'user';
	operation: 'getPresence';
	/**
	 * The ID of the user to get the online status of
	 * @displayOptions.show { operation: ["getPresence"], resource: ["user"] }
	 */
	user: string | Expression<string>;
};

/** Initiates a public or private channel-based conversation */
export type SlackV1UserGroupCreateConfig = {
	resource: 'userGroup';
	operation: 'create';
	/**
	 * A name for the User Group. Must be unique among User Groups.
	 * @displayOptions.show { operation: ["create"], resource: ["userGroup"] }
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
	 * @displayOptions.show { operation: ["disable"], resource: ["userGroup"] }
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
	 * @displayOptions.show { operation: ["enable"], resource: ["userGroup"] }
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
	additionalFields?: Record<string, unknown>;
};

/** Updates a message */
export type SlackV1UserGroupUpdateConfig = {
	resource: 'userGroup';
	operation: 'update';
	/**
	 * The encoded ID of the User Group to update
	 * @displayOptions.show { operation: ["update"], resource: ["userGroup"] }
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

export interface SlackV1Credentials {
	slackApi: CredentialReference;
	slackOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SlackV24Node = {
	type: 'n8n-nodes-base.slack';
	version: 2 | 2.1 | 2.2 | 2.3 | 2.4;
	config: NodeConfig<SlackV24Params>;
	credentials?: SlackV24Credentials;
};

export type SlackV1Node = {
	type: 'n8n-nodes-base.slack';
	version: 1;
	config: NodeConfig<SlackV1Params>;
	credentials?: SlackV1Credentials;
};

export type SlackNode = SlackV24Node | SlackV1Node;
