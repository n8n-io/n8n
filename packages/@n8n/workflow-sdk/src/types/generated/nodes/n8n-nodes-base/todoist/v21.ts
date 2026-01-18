/**
 * Todoist Node - Version 2.1
 * Consume Todoist API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Task resource */
export type TodoistV21TaskCloseConfig = {
	resource: 'task';
	operation: 'close';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV21TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * The destination project. Choose from the list, or specify an ID.
 * @displayOptions.show { resource: ["task"], operation: ["create", "move"] }
 * @default {"mode":"list","value":""}
 */
		project: ResourceLocatorValue;
/**
 * Optional labels that will be assigned to a created task. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 * @default []
 */
		labels?: string[];
/**
 * Task content
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		content: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Task resource */
export type TodoistV21TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV21TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV21TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
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
	filters?: Record<string, unknown>;
};

/** Task resource */
export type TodoistV21TaskMoveConfig = {
	resource: 'task';
	operation: 'move';
	taskId: string | Expression<string>;
/**
 * The destination project. Choose from the list, or specify an ID.
 * @displayOptions.show { resource: ["task"], operation: ["create", "move"] }
 * @default {"mode":"list","value":""}
 */
		project: ResourceLocatorValue;
/**
 * Section to which you want move the task. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["move"] }
 */
		section?: string | Expression<string>;
};

/** Task resource */
export type TodoistV21TaskQuickAddConfig = {
	resource: 'task';
	operation: 'quickAdd';
/**
 * Natural language text for quick adding task (e.g., "Buy milk @Grocery #shopping tomorrow"). It can include a due date in free form text, a project name starting with the "#" character (without spaces), a label starting with the "@" character, an assignee starting with the "+" character, a priority (e.g., p1), a deadline between "{}" (e.g. {in 3 days}), or a description starting from "//" until the end of the text.
 * @displayOptions.show { resource: ["task"], operation: ["quickAdd"] }
 */
		text: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Task resource */
export type TodoistV21TaskReopenConfig = {
	resource: 'task';
	operation: 'reopen';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV21TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Project resource */
export type TodoistV21ProjectArchiveConfig = {
	resource: 'project';
	operation: 'archive';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV21ProjectCreateConfig = {
	resource: 'project';
	operation: 'create';
/**
 * Name of the project
 * @displayOptions.show { resource: ["project"], operation: ["create"] }
 */
		name: string | Expression<string>;
	projectOptions?: Record<string, unknown>;
};

/** Project resource */
export type TodoistV21ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV21ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV21ProjectGetCollaboratorsConfig = {
	resource: 'project';
	operation: 'getCollaborators';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV21ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
};

/** Project resource */
export type TodoistV21ProjectUnarchiveConfig = {
	resource: 'project';
	operation: 'unarchive';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV21ProjectUpdateConfig = {
	resource: 'project';
	operation: 'update';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
	projectUpdateFields?: Record<string, unknown>;
};

/** Section resource */
export type TodoistV21SectionCreateConfig = {
	resource: 'section';
	operation: 'create';
/**
 * The project to add the section to
 * @displayOptions.show { resource: ["section"], operation: ["create"] }
 * @default {"mode":"list","value":""}
 */
		sectionProject: ResourceLocatorValue;
/**
 * Name of the section
 * @displayOptions.show { resource: ["section"], operation: ["create"] }
 */
		sectionName: string | Expression<string>;
	sectionOptions?: Record<string, unknown>;
};

/** Section resource */
export type TodoistV21SectionDeleteConfig = {
	resource: 'section';
	operation: 'delete';
	sectionId: string | Expression<string>;
};

/** Section resource */
export type TodoistV21SectionGetConfig = {
	resource: 'section';
	operation: 'get';
	sectionId: string | Expression<string>;
};

/** Section resource */
export type TodoistV21SectionGetAllConfig = {
	resource: 'section';
	operation: 'getAll';
	sectionFilters?: Record<string, unknown>;
};

/** Section resource */
export type TodoistV21SectionUpdateConfig = {
	resource: 'section';
	operation: 'update';
	sectionId: string | Expression<string>;
	sectionUpdateFields?: Record<string, unknown>;
};

/** Comment resource */
export type TodoistV21CommentCreateConfig = {
	resource: 'comment';
	operation: 'create';
/**
 * The ID of the task to comment on
 * @displayOptions.show { resource: ["comment"], operation: ["create"] }
 */
		commentTaskId: string | Expression<string>;
/**
 * Comment content
 * @displayOptions.show { resource: ["comment"], operation: ["create"] }
 */
		commentContent: string | Expression<string>;
};

/** Comment resource */
export type TodoistV21CommentDeleteConfig = {
	resource: 'comment';
	operation: 'delete';
	commentId: string | Expression<string>;
};

/** Comment resource */
export type TodoistV21CommentGetConfig = {
	resource: 'comment';
	operation: 'get';
	commentId: string | Expression<string>;
};

/** Comment resource */
export type TodoistV21CommentGetAllConfig = {
	resource: 'comment';
	operation: 'getAll';
	commentFilters?: Record<string, unknown>;
};

/** Comment resource */
export type TodoistV21CommentUpdateConfig = {
	resource: 'comment';
	operation: 'update';
	commentId: string | Expression<string>;
	commentUpdateFields?: Record<string, unknown>;
};

/** Label resource */
export type TodoistV21LabelCreateConfig = {
	resource: 'label';
	operation: 'create';
/**
 * Name of the label
 * @displayOptions.show { resource: ["label"], operation: ["create"] }
 */
		labelName: string | Expression<string>;
	labelOptions?: Record<string, unknown>;
};

/** Label resource */
export type TodoistV21LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
	labelId: string | Expression<string>;
};

/** Label resource */
export type TodoistV21LabelGetConfig = {
	resource: 'label';
	operation: 'get';
	labelId: string | Expression<string>;
};

/** Label resource */
export type TodoistV21LabelGetAllConfig = {
	resource: 'label';
	operation: 'getAll';
};

/** Label resource */
export type TodoistV21LabelUpdateConfig = {
	resource: 'label';
	operation: 'update';
	labelId: string | Expression<string>;
	labelUpdateFields?: Record<string, unknown>;
};

/** Reminder resource */
export type TodoistV21ReminderCreateConfig = {
	resource: 'reminder';
	operation: 'create';
/**
 * The ID of the task to attach reminder to
 * @displayOptions.show { resource: ["reminder"], operation: ["create"] }
 */
		itemId: string | Expression<string>;
/**
 * How to specify when the reminder should trigger
 * @displayOptions.show { resource: ["reminder"], operation: ["create"] }
 * @default natural_language
 */
		dueDateType: 'natural_language' | 'full_day' | 'floating_time' | 'fixed_timezone' | Expression<string>;
/**
 * Human-readable date and time
 * @displayOptions.show { resource: ["reminder"], operation: ["create"], dueDateType: ["natural_language"] }
 */
		natural_language_representation: string | Expression<string>;
/**
 * Full-day date in YYYY-MM-DD format
 * @displayOptions.show { resource: ["reminder"], operation: ["create"], dueDateType: ["full_day"] }
 */
		date: string | Expression<string>;
/**
 * Floating date and time (no timezone)
 * @displayOptions.show { resource: ["reminder"], operation: ["create"], dueDateType: ["floating_time"] }
 */
		datetime: string | Expression<string>;
/**
 * Timezone for the fixed timezone date
 * @displayOptions.show { resource: ["reminder"], operation: ["create"], dueDateType: ["fixed_timezone"] }
 */
		timezone: string | Expression<string>;
	reminderOptions?: Record<string, unknown>;
};

/** Reminder resource */
export type TodoistV21ReminderDeleteConfig = {
	resource: 'reminder';
	operation: 'delete';
	reminderId: string | Expression<string>;
};

/** Reminder resource */
export type TodoistV21ReminderGetAllConfig = {
	resource: 'reminder';
	operation: 'getAll';
};

/** Reminder resource */
export type TodoistV21ReminderUpdateConfig = {
	resource: 'reminder';
	operation: 'update';
	reminderId: string | Expression<string>;
	reminderUpdateFields?: Record<string, unknown>;
};

export type TodoistV21Params =
	| TodoistV21TaskCloseConfig
	| TodoistV21TaskCreateConfig
	| TodoistV21TaskDeleteConfig
	| TodoistV21TaskGetConfig
	| TodoistV21TaskGetAllConfig
	| TodoistV21TaskMoveConfig
	| TodoistV21TaskQuickAddConfig
	| TodoistV21TaskReopenConfig
	| TodoistV21TaskUpdateConfig
	| TodoistV21ProjectArchiveConfig
	| TodoistV21ProjectCreateConfig
	| TodoistV21ProjectDeleteConfig
	| TodoistV21ProjectGetConfig
	| TodoistV21ProjectGetCollaboratorsConfig
	| TodoistV21ProjectGetAllConfig
	| TodoistV21ProjectUnarchiveConfig
	| TodoistV21ProjectUpdateConfig
	| TodoistV21SectionCreateConfig
	| TodoistV21SectionDeleteConfig
	| TodoistV21SectionGetConfig
	| TodoistV21SectionGetAllConfig
	| TodoistV21SectionUpdateConfig
	| TodoistV21CommentCreateConfig
	| TodoistV21CommentDeleteConfig
	| TodoistV21CommentGetConfig
	| TodoistV21CommentGetAllConfig
	| TodoistV21CommentUpdateConfig
	| TodoistV21LabelCreateConfig
	| TodoistV21LabelDeleteConfig
	| TodoistV21LabelGetConfig
	| TodoistV21LabelGetAllConfig
	| TodoistV21LabelUpdateConfig
	| TodoistV21ReminderCreateConfig
	| TodoistV21ReminderDeleteConfig
	| TodoistV21ReminderGetAllConfig
	| TodoistV21ReminderUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface TodoistV21Credentials {
	todoistApi: CredentialReference;
	todoistOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type TodoistV21Node = {
	type: 'n8n-nodes-base.todoist';
	version: 2.1;
	config: NodeConfig<TodoistV21Params>;
	credentials?: TodoistV21Credentials;
};