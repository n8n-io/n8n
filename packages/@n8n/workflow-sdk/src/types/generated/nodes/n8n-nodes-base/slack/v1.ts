/**
 * Slack Node - Version 1
 * Consume Slack API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

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


// ===========================================================================
// Credentials
// ===========================================================================

export interface SlackV1Credentials {
	slackApi: CredentialReference;
	slackOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SlackV1NodeBase {
	type: 'n8n-nodes-base.slack';
	version: 1;
	credentials?: SlackV1Credentials;
}

export type SlackV1ChannelArchiveNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelArchiveConfig>;
};

export type SlackV1ChannelCloseNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelCloseConfig>;
};

export type SlackV1ChannelCreateNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelCreateConfig>;
};

export type SlackV1ChannelGetNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelGetConfig>;
};

export type SlackV1ChannelGetAllNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelGetAllConfig>;
};

export type SlackV1ChannelHistoryNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelHistoryConfig>;
};

export type SlackV1ChannelInviteNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelInviteConfig>;
};

export type SlackV1ChannelJoinNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelJoinConfig>;
};

export type SlackV1ChannelKickNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelKickConfig>;
};

export type SlackV1ChannelLeaveNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelLeaveConfig>;
};

export type SlackV1ChannelMemberNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelMemberConfig>;
};

export type SlackV1ChannelOpenNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelOpenConfig>;
};

export type SlackV1ChannelRenameNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelRenameConfig>;
};

export type SlackV1ChannelRepliesNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelRepliesConfig>;
};

export type SlackV1ChannelSetPurposeNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelSetPurposeConfig>;
};

export type SlackV1ChannelSetTopicNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelSetTopicConfig>;
};

export type SlackV1ChannelUnarchiveNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ChannelUnarchiveConfig>;
};

export type SlackV1FileGetNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1FileGetConfig>;
};

export type SlackV1FileGetAllNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1FileGetAllConfig>;
};

export type SlackV1FileUploadNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1FileUploadConfig>;
};

export type SlackV1MessageDeleteNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1MessageDeleteConfig>;
};

export type SlackV1MessageGetPermalinkNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1MessageGetPermalinkConfig>;
};

export type SlackV1MessagePostNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1MessagePostConfig>;
};

export type SlackV1MessagePostEphemeralNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1MessagePostEphemeralConfig>;
};

export type SlackV1MessageUpdateNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1MessageUpdateConfig>;
};

export type SlackV1ReactionAddNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ReactionAddConfig>;
};

export type SlackV1ReactionGetNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ReactionGetConfig>;
};

export type SlackV1ReactionRemoveNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1ReactionRemoveConfig>;
};

export type SlackV1StarAddNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1StarAddConfig>;
};

export type SlackV1StarDeleteNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1StarDeleteConfig>;
};

export type SlackV1StarGetAllNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1StarGetAllConfig>;
};

export type SlackV1UserInfoNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserInfoConfig>;
};

export type SlackV1UserGetAllNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserGetAllConfig>;
};

export type SlackV1UserGetPresenceNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserGetPresenceConfig>;
};

export type SlackV1UserGroupCreateNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserGroupCreateConfig>;
};

export type SlackV1UserGroupDisableNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserGroupDisableConfig>;
};

export type SlackV1UserGroupEnableNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserGroupEnableConfig>;
};

export type SlackV1UserGroupGetAllNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserGroupGetAllConfig>;
};

export type SlackV1UserGroupUpdateNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserGroupUpdateConfig>;
};

export type SlackV1UserProfileGetNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserProfileGetConfig>;
};

export type SlackV1UserProfileUpdateNode = SlackV1NodeBase & {
	config: NodeConfig<SlackV1UserProfileUpdateConfig>;
};

export type SlackV1Node =
	| SlackV1ChannelArchiveNode
	| SlackV1ChannelCloseNode
	| SlackV1ChannelCreateNode
	| SlackV1ChannelGetNode
	| SlackV1ChannelGetAllNode
	| SlackV1ChannelHistoryNode
	| SlackV1ChannelInviteNode
	| SlackV1ChannelJoinNode
	| SlackV1ChannelKickNode
	| SlackV1ChannelLeaveNode
	| SlackV1ChannelMemberNode
	| SlackV1ChannelOpenNode
	| SlackV1ChannelRenameNode
	| SlackV1ChannelRepliesNode
	| SlackV1ChannelSetPurposeNode
	| SlackV1ChannelSetTopicNode
	| SlackV1ChannelUnarchiveNode
	| SlackV1FileGetNode
	| SlackV1FileGetAllNode
	| SlackV1FileUploadNode
	| SlackV1MessageDeleteNode
	| SlackV1MessageGetPermalinkNode
	| SlackV1MessagePostNode
	| SlackV1MessagePostEphemeralNode
	| SlackV1MessageUpdateNode
	| SlackV1ReactionAddNode
	| SlackV1ReactionGetNode
	| SlackV1ReactionRemoveNode
	| SlackV1StarAddNode
	| SlackV1StarDeleteNode
	| SlackV1StarGetAllNode
	| SlackV1UserInfoNode
	| SlackV1UserGetAllNode
	| SlackV1UserGetPresenceNode
	| SlackV1UserGroupCreateNode
	| SlackV1UserGroupDisableNode
	| SlackV1UserGroupEnableNode
	| SlackV1UserGroupGetAllNode
	| SlackV1UserGroupUpdateNode
	| SlackV1UserProfileGetNode
	| SlackV1UserProfileUpdateNode
	;