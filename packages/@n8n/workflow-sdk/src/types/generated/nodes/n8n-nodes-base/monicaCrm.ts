/**
 * Monica CRM Node Types
 *
 * Consume the Monica CRM API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/monicacrm/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an activity */
export type MonicaCrmV1ActivityCreateConfig = {
	resource: 'activity';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	activityTypeId: string | Expression<string>;
	/**
	 * Comma-separated list of IDs of the contacts to associate the activity with
	 */
	contacts: string | Expression<string>;
	/**
	 * Date when the activity happened
	 */
	happenedAt: string | Expression<string>;
	/**
	 * Brief description of the activity - max 255 characters
	 */
	summary: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type MonicaCrmV1ActivityDeleteConfig = {
	resource: 'activity';
	operation: 'delete';
	/**
	 * ID of the activity to delete
	 */
	activityId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ActivityGetConfig = {
	resource: 'activity';
	operation: 'get';
	/**
	 * ID of the activity to retrieve
	 */
	activityId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1ActivityGetAllConfig = {
	resource: 'activity';
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

/** Update an activity */
export type MonicaCrmV1ActivityUpdateConfig = {
	resource: 'activity';
	operation: 'update';
	/**
	 * ID of the activity to update
	 */
	activityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type MonicaCrmV1CallCreateConfig = {
	resource: 'call';
	operation: 'create';
	/**
	 * ID of the contact to associate the call with
	 */
	contactId: string | Expression<string>;
	/**
	 * Date when the call happened
	 */
	calledAt: string | Expression<string>;
	/**
	 * Description of the call - max 100,000 characters
	 */
	content: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1CallDeleteConfig = {
	resource: 'call';
	operation: 'delete';
	/**
	 * ID of the call to delete
	 */
	callId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1CallGetConfig = {
	resource: 'call';
	operation: 'get';
	/**
	 * ID of the call to retrieve
	 */
	callId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1CallGetAllConfig = {
	resource: 'call';
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

/** Update an activity */
export type MonicaCrmV1CallUpdateConfig = {
	resource: 'call';
	operation: 'update';
	/**
	 * ID of the call to update
	 */
	callId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type MonicaCrmV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	firstName: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	genderId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type MonicaCrmV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * ID of the contact to delete
	 */
	contactId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * ID of the contact to retrieve
	 */
	contactId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1ContactGetAllConfig = {
	resource: 'contact';
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

/** Update an activity */
export type MonicaCrmV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * ID of the contact to update
	 */
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type MonicaCrmV1ContactFieldCreateConfig = {
	resource: 'contactField';
	operation: 'create';
	/**
	 * ID of the contact to associate the contact field with
	 */
	contactId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	contactFieldTypeId: string | Expression<string>;
	/**
	 * Content of the contact field - max 255 characters
	 */
	data: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1ContactFieldDeleteConfig = {
	resource: 'contactField';
	operation: 'delete';
	/**
	 * ID of the contactField to delete
	 */
	contactFieldId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ContactFieldGetConfig = {
	resource: 'contactField';
	operation: 'get';
	/**
	 * ID of the contact field to retrieve
	 */
	contactFieldId: string | Expression<string>;
};

/** Update an activity */
export type MonicaCrmV1ContactFieldUpdateConfig = {
	resource: 'contactField';
	operation: 'update';
	/**
	 * ID of the contact to associate the contact field with
	 */
	contactId: string | Expression<string>;
	/**
	 * ID of the contact field to update
	 */
	contactFieldId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	contactFieldTypeId: string | Expression<string>;
	/**
	 * Content of the contact field - max 255 characters
	 */
	data: string | Expression<string>;
};

export type MonicaCrmV1ContactTagAddConfig = {
	resource: 'contactTag';
	operation: 'add';
	/**
	 * ID of the contact to add a tag to
	 */
	contactId: string | Expression<string>;
	/**
	 * Tags to add to the contact. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	tagsToAdd: string[];
};

export type MonicaCrmV1ContactTagRemoveConfig = {
	resource: 'contactTag';
	operation: 'remove';
	/**
	 * ID of the contact to remove the tag from
	 */
	contactId: string | Expression<string>;
	/**
	 * Tags to remove from the contact. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @default []
	 */
	tagsToRemove: string[];
};

/** Create an activity */
export type MonicaCrmV1ConversationCreateConfig = {
	resource: 'conversation';
	operation: 'create';
	/**
	 * ID of the contact to associate the conversation with
	 */
	contactId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	contactFieldTypeId: string | Expression<string>;
	/**
	 * Date when the conversation happened
	 */
	happenedAt: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1ConversationDeleteConfig = {
	resource: 'conversation';
	operation: 'delete';
	/**
	 * ID of the conversation to delete
	 */
	conversationId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ConversationGetConfig = {
	resource: 'conversation';
	operation: 'get';
	/**
	 * ID of the conversation to retrieve
	 */
	conversationId: string | Expression<string>;
};

/** Update an activity */
export type MonicaCrmV1ConversationUpdateConfig = {
	resource: 'conversation';
	operation: 'update';
	/**
	 * ID of the conversation to update
	 */
	conversationId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	contactFieldTypeId: string | Expression<string>;
	/**
	 * Date when the conversation happened
	 */
	happenedAt: string | Expression<string>;
};

export type MonicaCrmV1ConversationMessageAddConfig = {
	resource: 'conversationMessage';
	operation: 'add';
	/**
	 * ID of the contact whose conversation
	 */
	conversationId: string | Expression<string>;
	/**
	 * Content of the message
	 */
	content: string | Expression<string>;
	/**
	 * Date when the message was written
	 */
	writtenAt: string | Expression<string>;
	/**
	 * Author of the message
	 * @default true
	 */
	writtenByMe: true | false | Expression<boolean>;
};

/** Update an activity */
export type MonicaCrmV1ConversationMessageUpdateConfig = {
	resource: 'conversationMessage';
	operation: 'update';
	/**
	 * ID of the message to update
	 */
	messageId: string | Expression<string>;
	/**
	 * ID of the conversation whose message to update
	 */
	conversationId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type MonicaCrmV1JournalEntryCreateConfig = {
	resource: 'journalEntry';
	operation: 'create';
	/**
	 * Title of the journal entry - max 250 characters
	 */
	title: string | Expression<string>;
	/**
	 * Content of the journal entry - max 100,000 characters
	 */
	post: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1JournalEntryDeleteConfig = {
	resource: 'journalEntry';
	operation: 'delete';
	/**
	 * ID of the journal entry to delete
	 */
	journalId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1JournalEntryGetConfig = {
	resource: 'journalEntry';
	operation: 'get';
	/**
	 * ID of the journal entry to retrieve
	 */
	journalId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1JournalEntryGetAllConfig = {
	resource: 'journalEntry';
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

/** Update an activity */
export type MonicaCrmV1JournalEntryUpdateConfig = {
	resource: 'journalEntry';
	operation: 'update';
	/**
	 * ID of the journal entry to update
	 */
	journalId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type MonicaCrmV1NoteCreateConfig = {
	resource: 'note';
	operation: 'create';
	/**
	 * ID of the contact to associate the note with
	 */
	contactId: string | Expression<string>;
	/**
	 * Body of the note - max 100,000 characters
	 */
	body: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type MonicaCrmV1NoteDeleteConfig = {
	resource: 'note';
	operation: 'delete';
	/**
	 * ID of the note to delete
	 */
	noteId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1NoteGetConfig = {
	resource: 'note';
	operation: 'get';
	/**
	 * ID of the note to retrieve
	 */
	noteId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1NoteGetAllConfig = {
	resource: 'note';
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

/** Update an activity */
export type MonicaCrmV1NoteUpdateConfig = {
	resource: 'note';
	operation: 'update';
	/**
	 * ID of the note to update
	 */
	noteId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type MonicaCrmV1ReminderCreateConfig = {
	resource: 'reminder';
	operation: 'create';
	/**
	 * ID of the contact to associate the reminder with
	 */
	contactId?: string | Expression<string>;
	/**
	 * Type of frequency of the reminder
	 * @default one_time
	 */
	frequencyType: 'one_time' | 'week' | 'month' | 'year' | Expression<string>;
	/**
	 * Interval for the reminder
	 * @default 0
	 */
	frequencyNumber?: number | Expression<number>;
	/**
	 * Date of the reminder
	 */
	initialDate: string | Expression<string>;
	/**
	 * Title of the reminder - max 100,000 characters
	 */
	title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type MonicaCrmV1ReminderDeleteConfig = {
	resource: 'reminder';
	operation: 'delete';
	/**
	 * ID of the reminder to delete
	 */
	reminderId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ReminderGetConfig = {
	resource: 'reminder';
	operation: 'get';
	/**
	 * ID of the reminder to retrieve
	 */
	reminderId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1ReminderGetAllConfig = {
	resource: 'reminder';
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

/** Update an activity */
export type MonicaCrmV1ReminderUpdateConfig = {
	resource: 'reminder';
	operation: 'update';
	/**
	 * ID of the reminder to update
	 */
	reminderId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an activity */
export type MonicaCrmV1TagCreateConfig = {
	resource: 'tag';
	operation: 'create';
	/**
	 * Name of the tag - max 250 characters
	 */
	name: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1TagDeleteConfig = {
	resource: 'tag';
	operation: 'delete';
	/**
	 * ID of the tag to delete
	 */
	tagId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1TagGetConfig = {
	resource: 'tag';
	operation: 'get';
	/**
	 * ID of the tag to retrieve
	 */
	tagId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1TagGetAllConfig = {
	resource: 'tag';
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

/** Update an activity */
export type MonicaCrmV1TagUpdateConfig = {
	resource: 'tag';
	operation: 'update';
	/**
	 * ID of the tag to update
	 */
	tagId: string | Expression<string>;
	/**
	 * Name of the tag - max 250 characters
	 */
	name: string | Expression<string>;
};

/** Create an activity */
export type MonicaCrmV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * ID of the contact to associate the task with
	 */
	contactId: string | Expression<string>;
	/**
	 * Title of the task entry - max 250 characters
	 */
	title: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an activity */
export type MonicaCrmV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	/**
	 * ID of the task to delete
	 */
	taskId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * ID of the task to retrieve
	 */
	taskId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1TaskGetAllConfig = {
	resource: 'task';
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

/** Update an activity */
export type MonicaCrmV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * ID of the task to update
	 */
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MonicaCrmV1Params =
	| MonicaCrmV1ActivityCreateConfig
	| MonicaCrmV1ActivityDeleteConfig
	| MonicaCrmV1ActivityGetConfig
	| MonicaCrmV1ActivityGetAllConfig
	| MonicaCrmV1ActivityUpdateConfig
	| MonicaCrmV1CallCreateConfig
	| MonicaCrmV1CallDeleteConfig
	| MonicaCrmV1CallGetConfig
	| MonicaCrmV1CallGetAllConfig
	| MonicaCrmV1CallUpdateConfig
	| MonicaCrmV1ContactCreateConfig
	| MonicaCrmV1ContactDeleteConfig
	| MonicaCrmV1ContactGetConfig
	| MonicaCrmV1ContactGetAllConfig
	| MonicaCrmV1ContactUpdateConfig
	| MonicaCrmV1ContactFieldCreateConfig
	| MonicaCrmV1ContactFieldDeleteConfig
	| MonicaCrmV1ContactFieldGetConfig
	| MonicaCrmV1ContactFieldUpdateConfig
	| MonicaCrmV1ContactTagAddConfig
	| MonicaCrmV1ContactTagRemoveConfig
	| MonicaCrmV1ConversationCreateConfig
	| MonicaCrmV1ConversationDeleteConfig
	| MonicaCrmV1ConversationGetConfig
	| MonicaCrmV1ConversationUpdateConfig
	| MonicaCrmV1ConversationMessageAddConfig
	| MonicaCrmV1ConversationMessageUpdateConfig
	| MonicaCrmV1JournalEntryCreateConfig
	| MonicaCrmV1JournalEntryDeleteConfig
	| MonicaCrmV1JournalEntryGetConfig
	| MonicaCrmV1JournalEntryGetAllConfig
	| MonicaCrmV1JournalEntryUpdateConfig
	| MonicaCrmV1NoteCreateConfig
	| MonicaCrmV1NoteDeleteConfig
	| MonicaCrmV1NoteGetConfig
	| MonicaCrmV1NoteGetAllConfig
	| MonicaCrmV1NoteUpdateConfig
	| MonicaCrmV1ReminderCreateConfig
	| MonicaCrmV1ReminderDeleteConfig
	| MonicaCrmV1ReminderGetConfig
	| MonicaCrmV1ReminderGetAllConfig
	| MonicaCrmV1ReminderUpdateConfig
	| MonicaCrmV1TagCreateConfig
	| MonicaCrmV1TagDeleteConfig
	| MonicaCrmV1TagGetConfig
	| MonicaCrmV1TagGetAllConfig
	| MonicaCrmV1TagUpdateConfig
	| MonicaCrmV1TaskCreateConfig
	| MonicaCrmV1TaskDeleteConfig
	| MonicaCrmV1TaskGetConfig
	| MonicaCrmV1TaskGetAllConfig
	| MonicaCrmV1TaskUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MonicaCrmV1Credentials {
	monicaCrmApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MonicaCrmNode = {
	type: 'n8n-nodes-base.monicaCrm';
	version: 1;
	config: NodeConfig<MonicaCrmV1Params>;
	credentials?: MonicaCrmV1Credentials;
};
