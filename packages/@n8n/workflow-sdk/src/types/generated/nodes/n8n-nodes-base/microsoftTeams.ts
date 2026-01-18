/**
 * Microsoft Teams Node Types
 *
 * Consume Microsoft Teams API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/microsoftteams/
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

/** Create a channel */
export type MicrosoftTeamsV2ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
	/**
	 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
	 * @displayOptions.show { resource: ["channel"], operation: ["create"] }
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * The name of the new channel you want to create
	 * @displayOptions.show { resource: ["channel"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a channel */
export type MicrosoftTeamsV2ChannelDeleteChannelConfig = {
	resource: 'channel';
	operation: 'deleteChannel';
	/**
	 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
	 * @displayOptions.show { resource: ["channel"], operation: ["deleteChannel"] }
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
	 * @displayOptions.show { resource: ["channel"], operation: ["deleteChannel"] }
	 * @default {"mode":"list","value":""}
	 */
	channelId: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV2ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
	/**
	 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
	 * @displayOptions.show { resource: ["channel"], operation: ["get"] }
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
	 * @displayOptions.show { resource: ["channel"], operation: ["get"] }
	 * @default {"mode":"list","value":""}
	 */
	channelId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV2ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
	/**
	 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
	 * @displayOptions.show { resource: ["channel"], operation: ["getAll"] }
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["channel"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { returnAll: [false], resource: ["channel"], operation: ["getAll"] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Update a channel */
export type MicrosoftTeamsV2ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
	/**
	 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
	 * @displayOptions.show { resource: ["channel"], operation: ["update"] }
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
	 * @displayOptions.show { resource: ["channel"], operation: ["update"] }
	 * @default {"mode":"list","value":""}
	 */
	channelId: string | Expression<string>;
	/**
	 * The name of the channel
	 * @displayOptions.show { resource: ["channel"], operation: ["update"] }
	 */
	name?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a channel */
export type MicrosoftTeamsV2ChannelMessageCreateConfig = {
	resource: 'channelMessage';
	operation: 'create';
	/**
	 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
	 * @displayOptions.show { resource: ["channelMessage"], operation: ["create"] }
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
	 * @displayOptions.show { resource: ["channelMessage"], operation: ["create"] }
	 * @default {"mode":"list","value":""}
	 */
	channelId: string | Expression<string>;
	/**
	 * Whether the message is plain text or HTML
	 * @displayOptions.show { resource: ["channelMessage"], operation: ["create"] }
	 * @default text
	 */
	contentType: 'text' | 'html' | Expression<string>;
	/**
	 * The content of the message to be sent
	 * @displayOptions.show { resource: ["channelMessage"], operation: ["create"] }
	 */
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many channels */
export type MicrosoftTeamsV2ChannelMessageGetAllConfig = {
	resource: 'channelMessage';
	operation: 'getAll';
	/**
	 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
	 * @displayOptions.show { resource: ["channelMessage"], operation: ["getAll"] }
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
	 * @displayOptions.show { resource: ["channelMessage"], operation: ["getAll"] }
	 * @default {"mode":"list","value":""}
	 */
	channelId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["channelMessage"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { returnAll: [false], resource: ["channelMessage"], operation: ["getAll"] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Create a channel */
export type MicrosoftTeamsV2ChatMessageCreateConfig = {
	resource: 'chatMessage';
	operation: 'create';
	/**
	 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
	 * @displayOptions.show { resource: ["chatMessage"], operation: ["create"] }
	 * @default {"mode":"list","value":""}
	 */
	chatId: ResourceLocatorValue;
	/**
	 * Whether the message is plain text or HTML
	 * @displayOptions.show { resource: ["chatMessage"], operation: ["create"] }
	 * @default text
	 */
	contentType: 'text' | 'html' | Expression<string>;
	/**
	 * The content of the message to be sent
	 * @displayOptions.show { resource: ["chatMessage"], operation: ["create"] }
	 */
	message: string | Expression<string>;
	/**
	 * Other options to set
	 * @displayOptions.show { resource: ["chatMessage"], operation: ["create"] }
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

/** Get a channel */
export type MicrosoftTeamsV2ChatMessageGetConfig = {
	resource: 'chatMessage';
	operation: 'get';
	/**
	 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
	 * @displayOptions.show { resource: ["chatMessage"], operation: ["get"] }
	 * @default {"mode":"list","value":""}
	 */
	chatId: ResourceLocatorValue;
	/**
	 * The ID of the message to retrieve
	 * @displayOptions.show { resource: ["chatMessage"], operation: ["get"] }
	 */
	messageId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV2ChatMessageGetAllConfig = {
	resource: 'chatMessage';
	operation: 'getAll';
	/**
	 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
	 * @displayOptions.show { resource: ["chatMessage"], operation: ["getAll"] }
	 * @default {"mode":"list","value":""}
	 */
	chatId: ResourceLocatorValue;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["chatMessage"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { returnAll: [false], resource: ["chatMessage"], operation: ["getAll"] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Send a message and wait for response */
export type MicrosoftTeamsV2ChatMessageSendAndWaitConfig = {
	resource: 'chatMessage';
	operation: 'sendAndWait';
	/**
	 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
	 * @displayOptions.show { resource: ["chatMessage"], operation: ["sendAndWait"] }
	 * @default {"mode":"list","value":""}
	 */
	chatId: ResourceLocatorValue;
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

/** Create a channel */
export type MicrosoftTeamsV2TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	groupId: string | Expression<string>;
	/**
	 * The plan for the task to belong to
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
	 * @default {"mode":"list","value":""}
	 */
	planId: string | Expression<string>;
	/**
	 * The bucket for the task to belong to
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
	 * @default {"mode":"list","value":""}
	 */
	bucketId: string | Expression<string>;
	/**
	 * Title of the task
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
	 */
	title: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a task */
export type MicrosoftTeamsV2TaskDeleteTaskConfig = {
	resource: 'task';
	operation: 'deleteTask';
	/**
	 * The ID of the task to delete
	 * @displayOptions.show { resource: ["task"], operation: ["deleteTask"] }
	 */
	taskId: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV2TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * The ID of the task to retrieve
	 * @displayOptions.show { resource: ["task"], operation: ["get"] }
	 */
	taskId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV2TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * Whether to retrieve the tasks for a user or for a plan
	 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
	 * @default member
	 */
	tasksFor: 'member' | 'plan' | Expression<string>;
	groupId: string | Expression<string>;
	/**
	 * The plan for the task to belong to
	 * @displayOptions.show { tasksFor: ["plan"], resource: ["task"], operation: ["getAll"] }
	 * @default {"mode":"list","value":""}
	 */
	planId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { returnAll: [false], resource: ["task"], operation: ["getAll"] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Update a channel */
export type MicrosoftTeamsV2TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * The ID of the task to update
	 * @displayOptions.show { resource: ["task"], operation: ["update"] }
	 */
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MicrosoftTeamsV2Params =
	| MicrosoftTeamsV2ChannelCreateConfig
	| MicrosoftTeamsV2ChannelDeleteChannelConfig
	| MicrosoftTeamsV2ChannelGetConfig
	| MicrosoftTeamsV2ChannelGetAllConfig
	| MicrosoftTeamsV2ChannelUpdateConfig
	| MicrosoftTeamsV2ChannelMessageCreateConfig
	| MicrosoftTeamsV2ChannelMessageGetAllConfig
	| MicrosoftTeamsV2ChatMessageCreateConfig
	| MicrosoftTeamsV2ChatMessageGetConfig
	| MicrosoftTeamsV2ChatMessageGetAllConfig
	| MicrosoftTeamsV2ChatMessageSendAndWaitConfig
	| MicrosoftTeamsV2TaskCreateConfig
	| MicrosoftTeamsV2TaskDeleteTaskConfig
	| MicrosoftTeamsV2TaskGetConfig
	| MicrosoftTeamsV2TaskGetAllConfig
	| MicrosoftTeamsV2TaskUpdateConfig;

/** Create a channel */
export type MicrosoftTeamsV11ChannelCreateConfig = {
	resource: 'channel';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * Channel name as it will appear to the user in Microsoft Teams
	 * @displayOptions.show { operation: ["create"], resource: ["channel"] }
	 */
	name: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a channel */
export type MicrosoftTeamsV11ChannelDeleteConfig = {
	resource: 'channel';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["delete"], resource: ["channel"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["delete"], resource: ["channel"] }
	 */
	channelId?: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV11ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["get"], resource: ["channel"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["get"], resource: ["channel"] }
	 */
	channelId?: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV11ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["getAll"], resource: ["channel"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["channel"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["channel"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update a channel */
export type MicrosoftTeamsV11ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["update"], resource: ["channel"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["update"], resource: ["channel"] }
	 */
	channelId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a channel */
export type MicrosoftTeamsV11ChannelMessageCreateConfig = {
	resource: 'channelMessage';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["create"], resource: ["channelMessage"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["create"], resource: ["channelMessage"] }
	 */
	channelId?: string | Expression<string>;
	/**
	 * The type of the content
	 * @displayOptions.show { operation: ["create"], resource: ["channelMessage"] }
	 * @default text
	 */
	messageType: 'text' | 'html' | Expression<string>;
	/**
	 * The content of the item
	 * @displayOptions.show { operation: ["create"], resource: ["channelMessage"] }
	 */
	message: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many channels */
export type MicrosoftTeamsV11ChannelMessageGetAllConfig = {
	resource: 'channelMessage';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["getAll"], resource: ["channelMessage"] }
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["getAll"], resource: ["channelMessage"] }
	 */
	channelId?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["channelMessage"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["channelMessage"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Create a channel */
export type MicrosoftTeamsV11ChatMessageCreateConfig = {
	resource: 'chatMessage';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["create", "get"], resource: ["chatMessage"] }
	 */
	chatId: string | Expression<string>;
	/**
	 * The type of the content
	 * @displayOptions.show { operation: ["create"], resource: ["chatMessage"] }
	 * @default text
	 */
	messageType: 'text' | 'html' | Expression<string>;
	/**
	 * The content of the item
	 * @displayOptions.show { operation: ["create"], resource: ["chatMessage"] }
	 */
	message: string | Expression<string>;
	/**
	 * Other options to set
	 * @displayOptions.show { operation: ["create"], resource: ["chatMessage"] }
	 * @default {}
	 */
	options?: Record<string, unknown>;
};

/** Get a channel */
export type MicrosoftTeamsV11ChatMessageGetConfig = {
	resource: 'chatMessage';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["create", "get"], resource: ["chatMessage"] }
	 */
	chatId: string | Expression<string>;
	messageId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV11ChatMessageGetAllConfig = {
	resource: 'chatMessage';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["getAll"], resource: ["chatMessage"] }
	 */
	chatId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["chatMessage"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["chatMessage"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Create a channel */
export type MicrosoftTeamsV11TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	groupSource: 'all' | 'mine' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["create"], resource: ["task"] }
	 */
	groupId: string | Expression<string>;
	/**
	 * The plan for the task to belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["create"], resource: ["task"] }
	 */
	planId: string | Expression<string>;
	/**
	 * The bucket for the task to belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { operation: ["create"], resource: ["task"] }
	 */
	bucketId: string | Expression<string>;
	/**
	 * Title of the task
	 * @displayOptions.show { operation: ["create"], resource: ["task"] }
	 */
	title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a channel */
export type MicrosoftTeamsV11TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	taskId: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV11TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	taskId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV11TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	groupSource: 'all' | 'mine' | Expression<string>;
	tasksFor: 'member' | 'plan' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["getAll"], resource: ["task"] }
	 */
	groupId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["getAll"], resource: ["task"], tasksFor: ["member"] }
	 */
	memberId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { operation: ["getAll"], resource: ["task"], tasksFor: ["plan"] }
	 */
	planId?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { operation: ["getAll"], resource: ["task"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { operation: ["getAll"], resource: ["task"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update a channel */
export type MicrosoftTeamsV11TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	groupSource: 'all' | 'mine' | Expression<string>;
	/**
	 * The ID of the Task
	 * @displayOptions.show { operation: ["update"], resource: ["task"] }
	 */
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MicrosoftTeamsV11Params =
	| MicrosoftTeamsV11ChannelCreateConfig
	| MicrosoftTeamsV11ChannelDeleteConfig
	| MicrosoftTeamsV11ChannelGetConfig
	| MicrosoftTeamsV11ChannelGetAllConfig
	| MicrosoftTeamsV11ChannelUpdateConfig
	| MicrosoftTeamsV11ChannelMessageCreateConfig
	| MicrosoftTeamsV11ChannelMessageGetAllConfig
	| MicrosoftTeamsV11ChatMessageCreateConfig
	| MicrosoftTeamsV11ChatMessageGetConfig
	| MicrosoftTeamsV11ChatMessageGetAllConfig
	| MicrosoftTeamsV11TaskCreateConfig
	| MicrosoftTeamsV11TaskDeleteConfig
	| MicrosoftTeamsV11TaskGetConfig
	| MicrosoftTeamsV11TaskGetAllConfig
	| MicrosoftTeamsV11TaskUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MicrosoftTeamsV2Credentials {
	microsoftTeamsOAuth2Api: CredentialReference;
}

export interface MicrosoftTeamsV11Credentials {
	microsoftTeamsOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MicrosoftTeamsV2Node = {
	type: 'n8n-nodes-base.microsoftTeams';
	version: 2;
	config: NodeConfig<MicrosoftTeamsV2Params>;
	credentials?: MicrosoftTeamsV2Credentials;
};

export type MicrosoftTeamsV11Node = {
	type: 'n8n-nodes-base.microsoftTeams';
	version: 1 | 1.1;
	config: NodeConfig<MicrosoftTeamsV11Params>;
	credentials?: MicrosoftTeamsV11Credentials;
};

export type MicrosoftTeamsNode = MicrosoftTeamsV2Node | MicrosoftTeamsV11Node;
