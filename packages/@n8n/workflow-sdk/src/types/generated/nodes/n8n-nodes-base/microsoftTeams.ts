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
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * The name of the new channel you want to create
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
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
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
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
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
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
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
};

/** Update a channel */
export type MicrosoftTeamsV2ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
	/**
	 * Select the team from the list, by URL, or by ID (the ID is the "groupId" parameter in the URL you get from "Get a link to the team")
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
	 * @default {"mode":"list","value":""}
	 */
	channelId: string | Expression<string>;
	/**
	 * The name of the channel
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
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
	 * @default {"mode":"list","value":""}
	 */
	channelId: string | Expression<string>;
	/**
	 * Whether the message is plain text or HTML
	 * @default text
	 */
	contentType: 'text' | 'html' | Expression<string>;
	/**
	 * The content of the message to be sent
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
	 * @default {"mode":"list","value":""}
	 */
	teamId: ResourceLocatorValue;
	/**
	 * Select the channel from the list, by URL, or by ID (the ID is the "threadId" in the URL)
	 * @default {"mode":"list","value":""}
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
};

/** Create a channel */
export type MicrosoftTeamsV2ChatMessageCreateConfig = {
	resource: 'chatMessage';
	operation: 'create';
	/**
	 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
	 * @default {"mode":"list","value":""}
	 */
	chatId: ResourceLocatorValue;
	/**
	 * Whether the message is plain text or HTML
	 * @default text
	 */
	contentType: 'text' | 'html' | Expression<string>;
	/**
	 * The content of the message to be sent
	 */
	message: string | Expression<string>;
	/**
	 * Other options to set
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
	 * @default {"mode":"list","value":""}
	 */
	chatId: ResourceLocatorValue;
	/**
	 * The ID of the message to retrieve
	 */
	messageId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV2ChatMessageGetAllConfig = {
	resource: 'chatMessage';
	operation: 'getAll';
	/**
	 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
	 * @default {"mode":"list","value":""}
	 */
	chatId: ResourceLocatorValue;
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
};

/** Send a message and wait for response */
export type MicrosoftTeamsV2ChatMessageSendAndWaitConfig = {
	resource: 'chatMessage';
	operation: 'sendAndWait';
	/**
	 * Select the chat from the list, by URL, or by ID (find the chat ID after "conversations/" in the URL)
	 * @default {"mode":"list","value":""}
	 */
	chatId: ResourceLocatorValue;
	message: string | Expression<string>;
	responseType?: 'approval' | 'freeText' | 'customForm' | Expression<string>;
	defineForm?: 'fields' | 'json' | Expression<string>;
	jsonOutput?: IDataObject | string | Expression<string>;
	formFields?: {
		values?: Array<{
			fieldName?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldLabel?: string | Expression<string>;
			fieldName?: string | Expression<string>;
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
			elementName?: string | Expression<string>;
			fieldName?: string | Expression<string>;
			placeholder?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			defaultValue?: string | Expression<string>;
			fieldValue?: string | Expression<string>;
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			fieldOptions?: { values?: Array<{ option?: string | Expression<string> }> };
			multiselect?: boolean | Expression<boolean>;
			limitSelection?: 'exact' | 'range' | 'unlimited' | Expression<string>;
			numberOfSelections?: number | Expression<number>;
			minSelections?: number | Expression<number>;
			maxSelections?: number | Expression<number>;
			html?: string | Expression<string>;
			multipleFiles?: boolean | Expression<boolean>;
			acceptFileTypes?: string | Expression<string>;
			requiredField?: boolean | Expression<boolean>;
		}>;
	};
	approvalOptions?: {
		values?: {
			approvalType?: 'single' | 'double' | Expression<string>;
			approveLabel?: string | Expression<string>;
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
	 * @default {"mode":"list","value":""}
	 */
	planId: string | Expression<string>;
	/**
	 * The bucket for the task to belong to
	 * @default {"mode":"list","value":""}
	 */
	bucketId: string | Expression<string>;
	/**
	 * Title of the task
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
	 */
	taskId: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV2TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * The ID of the task to retrieve
	 */
	taskId: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV2TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * Whether to retrieve the tasks for a user or for a plan
	 * @default member
	 */
	tasksFor: 'member' | 'plan' | Expression<string>;
	groupId: string | Expression<string>;
	/**
	 * The plan for the task to belong to
	 * @default {"mode":"list","value":""}
	 */
	planId: string | Expression<string>;
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
};

/** Update a channel */
export type MicrosoftTeamsV2TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * The ID of the task to update
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
	 */
	teamId: string | Expression<string>;
	/**
	 * Channel name as it will appear to the user in Microsoft Teams
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
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	channelId?: string | Expression<string>;
};

/** Get a channel */
export type MicrosoftTeamsV11ChannelGetConfig = {
	resource: 'channel';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	channelId?: string | Expression<string>;
};

/** Get many channels */
export type MicrosoftTeamsV11ChannelGetAllConfig = {
	resource: 'channel';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	teamId: string | Expression<string>;
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

/** Update a channel */
export type MicrosoftTeamsV11ChannelUpdateConfig = {
	resource: 'channel';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	channelId?: string | Expression<string>;
	/**
	 * The type of the content
	 * @default text
	 */
	messageType: 'text' | 'html' | Expression<string>;
	/**
	 * The content of the item
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
	 */
	teamId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	channelId?: string | Expression<string>;
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

/** Create a channel */
export type MicrosoftTeamsV11ChatMessageCreateConfig = {
	resource: 'chatMessage';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	chatId: string | Expression<string>;
	/**
	 * The type of the content
	 * @default text
	 */
	messageType: 'text' | 'html' | Expression<string>;
	/**
	 * The content of the item
	 */
	message: string | Expression<string>;
	/**
	 * Other options to set
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
	 */
	chatId: string | Expression<string>;
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

/** Create a channel */
export type MicrosoftTeamsV11TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	groupSource: 'all' | 'mine' | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	groupId: string | Expression<string>;
	/**
	 * The plan for the task to belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	planId: string | Expression<string>;
	/**
	 * The bucket for the task to belong to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	bucketId: string | Expression<string>;
	/**
	 * Title of the task
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
	 */
	groupId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	memberId?: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	planId?: string | Expression<string>;
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

/** Update a channel */
export type MicrosoftTeamsV11TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	groupSource: 'all' | 'mine' | Expression<string>;
	/**
	 * The ID of the Task
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
