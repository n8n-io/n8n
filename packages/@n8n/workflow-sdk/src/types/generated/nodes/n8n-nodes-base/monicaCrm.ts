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
	 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
	 */
	activityTypeId: string | Expression<string>;
	/**
	 * Comma-separated list of IDs of the contacts to associate the activity with
	 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
	 */
	contacts: string | Expression<string>;
	/**
	 * Date when the activity happened
	 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
	 */
	happenedAt: string | Expression<string>;
	/**
	 * Brief description of the activity - max 255 characters
	 * @displayOptions.show { resource: ["activity"], operation: ["create"] }
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
	 * @displayOptions.show { resource: ["activity"], operation: ["delete"] }
	 */
	activityId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ActivityGetConfig = {
	resource: 'activity';
	operation: 'get';
	/**
	 * ID of the activity to retrieve
	 * @displayOptions.show { resource: ["activity"], operation: ["get"] }
	 */
	activityId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1ActivityGetAllConfig = {
	resource: 'activity';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["activity"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["activity"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["activity"], operation: ["update"] }
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
	 * @displayOptions.show { resource: ["call"], operation: ["create"] }
	 */
	contactId: string | Expression<string>;
	/**
	 * Date when the call happened
	 * @displayOptions.show { resource: ["call"], operation: ["create"] }
	 */
	calledAt: string | Expression<string>;
	/**
	 * Description of the call - max 100,000 characters
	 * @displayOptions.show { resource: ["call"], operation: ["create"] }
	 */
	content: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1CallDeleteConfig = {
	resource: 'call';
	operation: 'delete';
	/**
	 * ID of the call to delete
	 * @displayOptions.show { resource: ["call"], operation: ["delete"] }
	 */
	callId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1CallGetConfig = {
	resource: 'call';
	operation: 'get';
	/**
	 * ID of the call to retrieve
	 * @displayOptions.show { resource: ["call"], operation: ["get"] }
	 */
	callId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1CallGetAllConfig = {
	resource: 'call';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["call"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["call"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["call"], operation: ["update"] }
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
	 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
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
	 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
	 */
	contactId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * ID of the contact to retrieve
	 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
	 */
	contactId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
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
	 * @displayOptions.show { resource: ["contactField"], operation: ["create"] }
	 */
	contactId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["contactField"], operation: ["create"] }
	 */
	contactFieldTypeId: string | Expression<string>;
	/**
	 * Content of the contact field - max 255 characters
	 * @displayOptions.show { resource: ["contactField"], operation: ["create"] }
	 */
	data: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1ContactFieldDeleteConfig = {
	resource: 'contactField';
	operation: 'delete';
	/**
	 * ID of the contactField to delete
	 * @displayOptions.show { resource: ["contactField"], operation: ["delete"] }
	 */
	contactFieldId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ContactFieldGetConfig = {
	resource: 'contactField';
	operation: 'get';
	/**
	 * ID of the contact field to retrieve
	 * @displayOptions.show { resource: ["contactField"], operation: ["get"] }
	 */
	contactFieldId: string | Expression<string>;
};

/** Update an activity */
export type MonicaCrmV1ContactFieldUpdateConfig = {
	resource: 'contactField';
	operation: 'update';
	/**
	 * ID of the contact to associate the contact field with
	 * @displayOptions.show { resource: ["contactField"], operation: ["update"] }
	 */
	contactId: string | Expression<string>;
	/**
	 * ID of the contact field to update
	 * @displayOptions.show { resource: ["contactField"], operation: ["update"] }
	 */
	contactFieldId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["contactField"], operation: ["update"] }
	 */
	contactFieldTypeId: string | Expression<string>;
	/**
	 * Content of the contact field - max 255 characters
	 * @displayOptions.show { resource: ["contactField"], operation: ["update"] }
	 */
	data: string | Expression<string>;
};

export type MonicaCrmV1ContactTagAddConfig = {
	resource: 'contactTag';
	operation: 'add';
	/**
	 * ID of the contact to add a tag to
	 * @displayOptions.show { resource: ["contactTag"], operation: ["add"] }
	 */
	contactId: string | Expression<string>;
	/**
	 * Tags to add to the contact. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["contactTag"], operation: ["add"] }
	 * @default []
	 */
	tagsToAdd: string[];
};

export type MonicaCrmV1ContactTagRemoveConfig = {
	resource: 'contactTag';
	operation: 'remove';
	/**
	 * ID of the contact to remove the tag from
	 * @displayOptions.show { resource: ["contactTag"], operation: ["remove"] }
	 */
	contactId: string | Expression<string>;
	/**
	 * Tags to remove from the contact. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["contactTag"], operation: ["remove"] }
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
	 * @displayOptions.show { resource: ["conversation"], operation: ["create"] }
	 */
	contactId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["conversation"], operation: ["create"] }
	 */
	contactFieldTypeId: string | Expression<string>;
	/**
	 * Date when the conversation happened
	 * @displayOptions.show { resource: ["conversation"], operation: ["create"] }
	 */
	happenedAt: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1ConversationDeleteConfig = {
	resource: 'conversation';
	operation: 'delete';
	/**
	 * ID of the conversation to delete
	 * @displayOptions.show { resource: ["conversation"], operation: ["delete"] }
	 */
	conversationId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ConversationGetConfig = {
	resource: 'conversation';
	operation: 'get';
	/**
	 * ID of the conversation to retrieve
	 * @displayOptions.show { resource: ["conversation"], operation: ["get"] }
	 */
	conversationId: string | Expression<string>;
};

/** Update an activity */
export type MonicaCrmV1ConversationUpdateConfig = {
	resource: 'conversation';
	operation: 'update';
	/**
	 * ID of the conversation to update
	 * @displayOptions.show { resource: ["conversation"], operation: ["update"] }
	 */
	conversationId: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["conversation"], operation: ["update"] }
	 */
	contactFieldTypeId: string | Expression<string>;
	/**
	 * Date when the conversation happened
	 * @displayOptions.show { resource: ["conversation"], operation: ["update"] }
	 */
	happenedAt: string | Expression<string>;
};

export type MonicaCrmV1ConversationMessageAddConfig = {
	resource: 'conversationMessage';
	operation: 'add';
	/**
	 * ID of the contact whose conversation
	 * @displayOptions.show { resource: ["conversationMessage"], operation: ["add"] }
	 */
	conversationId: string | Expression<string>;
	/**
	 * Content of the message
	 * @displayOptions.show { resource: ["conversationMessage"], operation: ["add"] }
	 */
	content: string | Expression<string>;
	/**
	 * Date when the message was written
	 * @displayOptions.show { resource: ["conversationMessage"], operation: ["add"] }
	 */
	writtenAt: string | Expression<string>;
	/**
	 * Author of the message
	 * @displayOptions.show { resource: ["conversationMessage"], operation: ["add"] }
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
	 * @displayOptions.show { resource: ["conversationMessage"], operation: ["update"] }
	 */
	messageId: string | Expression<string>;
	/**
	 * ID of the conversation whose message to update
	 * @displayOptions.show { resource: ["conversationMessage"], operation: ["update"] }
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
	 * @displayOptions.show { resource: ["journalEntry"], operation: ["create"] }
	 */
	title: string | Expression<string>;
	/**
	 * Content of the journal entry - max 100,000 characters
	 * @displayOptions.show { resource: ["journalEntry"], operation: ["create"] }
	 */
	post: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1JournalEntryDeleteConfig = {
	resource: 'journalEntry';
	operation: 'delete';
	/**
	 * ID of the journal entry to delete
	 * @displayOptions.show { resource: ["journalEntry"], operation: ["delete"] }
	 */
	journalId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1JournalEntryGetConfig = {
	resource: 'journalEntry';
	operation: 'get';
	/**
	 * ID of the journal entry to retrieve
	 * @displayOptions.show { resource: ["journalEntry"], operation: ["get"] }
	 */
	journalId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1JournalEntryGetAllConfig = {
	resource: 'journalEntry';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["journalEntry"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["journalEntry"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["journalEntry"], operation: ["update"] }
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
	 * @displayOptions.show { resource: ["note"], operation: ["create"] }
	 */
	contactId: string | Expression<string>;
	/**
	 * Body of the note - max 100,000 characters
	 * @displayOptions.show { resource: ["note"], operation: ["create"] }
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
	 * @displayOptions.show { resource: ["note"], operation: ["delete"] }
	 */
	noteId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1NoteGetConfig = {
	resource: 'note';
	operation: 'get';
	/**
	 * ID of the note to retrieve
	 * @displayOptions.show { resource: ["note"], operation: ["get"] }
	 */
	noteId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1NoteGetAllConfig = {
	resource: 'note';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["note"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["note"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["note"], operation: ["update"] }
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
	 * @displayOptions.show { resource: ["reminder"], operation: ["create"] }
	 */
	contactId?: string | Expression<string>;
	/**
	 * Type of frequency of the reminder
	 * @displayOptions.show { resource: ["reminder"], operation: ["create"] }
	 * @default one_time
	 */
	frequencyType: 'one_time' | 'week' | 'month' | 'year' | Expression<string>;
	/**
	 * Interval for the reminder
	 * @displayOptions.show { resource: ["reminder"], operation: ["create"], frequencyType: ["week", "month", "year"] }
	 * @default 0
	 */
	frequencyNumber?: number | Expression<number>;
	/**
	 * Date of the reminder
	 * @displayOptions.show { resource: ["reminder"], operation: ["create"] }
	 */
	initialDate: string | Expression<string>;
	/**
	 * Title of the reminder - max 100,000 characters
	 * @displayOptions.show { resource: ["reminder"], operation: ["create"] }
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
	 * @displayOptions.show { resource: ["reminder"], operation: ["delete"] }
	 */
	reminderId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1ReminderGetConfig = {
	resource: 'reminder';
	operation: 'get';
	/**
	 * ID of the reminder to retrieve
	 * @displayOptions.show { resource: ["reminder"], operation: ["get"] }
	 */
	reminderId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1ReminderGetAllConfig = {
	resource: 'reminder';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["reminder"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["reminder"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["reminder"], operation: ["update"] }
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
	 * @displayOptions.show { resource: ["tag"], operation: ["create"] }
	 */
	name: string | Expression<string>;
};

/** Delete an activity */
export type MonicaCrmV1TagDeleteConfig = {
	resource: 'tag';
	operation: 'delete';
	/**
	 * ID of the tag to delete
	 * @displayOptions.show { resource: ["tag"], operation: ["delete"] }
	 */
	tagId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1TagGetConfig = {
	resource: 'tag';
	operation: 'get';
	/**
	 * ID of the tag to retrieve
	 * @displayOptions.show { resource: ["tag"], operation: ["get"] }
	 */
	tagId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1TagGetAllConfig = {
	resource: 'tag';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["tag"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["tag"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["tag"], operation: ["update"] }
	 */
	tagId: string | Expression<string>;
	/**
	 * Name of the tag - max 250 characters
	 * @displayOptions.show { resource: ["tag"], operation: ["update"] }
	 */
	name: string | Expression<string>;
};

/** Create an activity */
export type MonicaCrmV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * ID of the contact to associate the task with
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
	 */
	contactId: string | Expression<string>;
	/**
	 * Title of the task entry - max 250 characters
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
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
	 * @displayOptions.show { resource: ["task"], operation: ["delete"] }
	 */
	taskId: string | Expression<string>;
};

/** Retrieve an activity */
export type MonicaCrmV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * ID of the task to retrieve
	 * @displayOptions.show { resource: ["task"], operation: ["get"] }
	 */
	taskId: string | Expression<string>;
};

/** Retrieve many activities */
export type MonicaCrmV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
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
	 * @displayOptions.show { resource: ["task"], operation: ["update"] }
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
// Node Types
// ===========================================================================

export type MonicaCrmV1Node = {
	type: 'n8n-nodes-base.monicaCrm';
	version: 1;
	config: NodeConfig<MonicaCrmV1Params>;
	credentials?: MonicaCrmV1Credentials;
};

export type MonicaCrmNode = MonicaCrmV1Node;
