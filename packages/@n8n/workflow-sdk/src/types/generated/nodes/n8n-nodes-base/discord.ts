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
