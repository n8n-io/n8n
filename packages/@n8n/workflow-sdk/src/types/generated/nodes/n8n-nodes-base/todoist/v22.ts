/**
 * Todoist Node - Version 2.2
 * Consume Todoist API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Task resource */
export type TodoistV22TaskCloseConfig = {
	resource: 'task';
	operation: 'close';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV22TaskCreateConfig = {
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
export type TodoistV22TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV22TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV22TaskGetAllConfig = {
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
export type TodoistV22TaskMoveConfig = {
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
export type TodoistV22TaskQuickAddConfig = {
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
export type TodoistV22TaskReopenConfig = {
	resource: 'task';
	operation: 'reopen';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV22TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Project resource */
export type TodoistV22ProjectArchiveConfig = {
	resource: 'project';
	operation: 'archive';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV22ProjectCreateConfig = {
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
export type TodoistV22ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV22ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV22ProjectGetCollaboratorsConfig = {
	resource: 'project';
	operation: 'getCollaborators';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV22ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
};

/** Project resource */
export type TodoistV22ProjectUnarchiveConfig = {
	resource: 'project';
	operation: 'unarchive';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV22ProjectUpdateConfig = {
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
export type TodoistV22SectionCreateConfig = {
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
export type TodoistV22SectionDeleteConfig = {
	resource: 'section';
	operation: 'delete';
	sectionId: string | Expression<string>;
};

/** Section resource */
export type TodoistV22SectionGetConfig = {
	resource: 'section';
	operation: 'get';
	sectionId: string | Expression<string>;
};

/** Section resource */
export type TodoistV22SectionGetAllConfig = {
	resource: 'section';
	operation: 'getAll';
	sectionFilters?: Record<string, unknown>;
};

/** Section resource */
export type TodoistV22SectionUpdateConfig = {
	resource: 'section';
	operation: 'update';
	sectionId: string | Expression<string>;
	sectionUpdateFields?: Record<string, unknown>;
};

/** Comment resource */
export type TodoistV22CommentCreateConfig = {
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
export type TodoistV22CommentDeleteConfig = {
	resource: 'comment';
	operation: 'delete';
	commentId: string | Expression<string>;
};

/** Comment resource */
export type TodoistV22CommentGetConfig = {
	resource: 'comment';
	operation: 'get';
	commentId: string | Expression<string>;
};

/** Comment resource */
export type TodoistV22CommentGetAllConfig = {
	resource: 'comment';
	operation: 'getAll';
	commentFilters?: Record<string, unknown>;
};

/** Comment resource */
export type TodoistV22CommentUpdateConfig = {
	resource: 'comment';
	operation: 'update';
	commentId: string | Expression<string>;
	commentUpdateFields?: Record<string, unknown>;
};

/** Label resource */
export type TodoistV22LabelCreateConfig = {
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
export type TodoistV22LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
	labelId: string | Expression<string>;
};

/** Label resource */
export type TodoistV22LabelGetConfig = {
	resource: 'label';
	operation: 'get';
	labelId: string | Expression<string>;
};

/** Label resource */
export type TodoistV22LabelGetAllConfig = {
	resource: 'label';
	operation: 'getAll';
};

/** Label resource */
export type TodoistV22LabelUpdateConfig = {
	resource: 'label';
	operation: 'update';
	labelId: string | Expression<string>;
	labelUpdateFields?: Record<string, unknown>;
};

/** Reminder resource */
export type TodoistV22ReminderCreateConfig = {
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
export type TodoistV22ReminderDeleteConfig = {
	resource: 'reminder';
	operation: 'delete';
	reminderId: string | Expression<string>;
};

/** Reminder resource */
export type TodoistV22ReminderGetAllConfig = {
	resource: 'reminder';
	operation: 'getAll';
};

/** Reminder resource */
export type TodoistV22ReminderUpdateConfig = {
	resource: 'reminder';
	operation: 'update';
	reminderId: string | Expression<string>;
	reminderUpdateFields?: Record<string, unknown>;
};

export type TodoistV22Params =
	| TodoistV22TaskCloseConfig
	| TodoistV22TaskCreateConfig
	| TodoistV22TaskDeleteConfig
	| TodoistV22TaskGetConfig
	| TodoistV22TaskGetAllConfig
	| TodoistV22TaskMoveConfig
	| TodoistV22TaskQuickAddConfig
	| TodoistV22TaskReopenConfig
	| TodoistV22TaskUpdateConfig
	| TodoistV22ProjectArchiveConfig
	| TodoistV22ProjectCreateConfig
	| TodoistV22ProjectDeleteConfig
	| TodoistV22ProjectGetConfig
	| TodoistV22ProjectGetCollaboratorsConfig
	| TodoistV22ProjectGetAllConfig
	| TodoistV22ProjectUnarchiveConfig
	| TodoistV22ProjectUpdateConfig
	| TodoistV22SectionCreateConfig
	| TodoistV22SectionDeleteConfig
	| TodoistV22SectionGetConfig
	| TodoistV22SectionGetAllConfig
	| TodoistV22SectionUpdateConfig
	| TodoistV22CommentCreateConfig
	| TodoistV22CommentDeleteConfig
	| TodoistV22CommentGetConfig
	| TodoistV22CommentGetAllConfig
	| TodoistV22CommentUpdateConfig
	| TodoistV22LabelCreateConfig
	| TodoistV22LabelDeleteConfig
	| TodoistV22LabelGetConfig
	| TodoistV22LabelGetAllConfig
	| TodoistV22LabelUpdateConfig
	| TodoistV22ReminderCreateConfig
	| TodoistV22ReminderDeleteConfig
	| TodoistV22ReminderGetAllConfig
	| TodoistV22ReminderUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type TodoistV22TaskCloseOutput = {
	success?: boolean;
};

export type TodoistV22TaskCreateOutput = {
	assignee_id?: null;
	assigner_id?: null;
	comment_count?: number;
	content?: string;
	created_at?: string;
	creator_id?: string;
	deadline?: null;
	description?: string;
	duration?: null;
	id?: string;
	is_completed?: boolean;
	labels?: Array<string>;
	order?: number;
	priority?: number;
	project_id?: string;
	url?: string;
};

export type TodoistV22TaskGetOutput = {
	comment_count?: number;
	content?: string;
	created_at?: string;
	creator_id?: string;
	description?: string;
	due?: {
		date?: string;
		is_recurring?: boolean;
		lang?: string;
		string?: string;
	};
	id?: string;
	is_completed?: boolean;
	labels?: Array<string>;
	order?: number;
	priority?: number;
	project_id?: string;
	url?: string;
};

export type TodoistV22TaskGetAllOutput = {
	comment_count?: number;
	content?: string;
	created_at?: string;
	creator_id?: string;
	description?: string;
	id?: string;
	is_completed?: boolean;
	labels?: Array<string>;
	order?: number;
	priority?: number;
	project_id?: string;
	url?: string;
};

export type TodoistV22TaskMoveOutput = {
	success?: boolean;
};

export type TodoistV22TaskUpdateOutput = {
	success?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface TodoistV22Credentials {
	todoistApi: CredentialReference;
	todoistOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TodoistV22NodeBase {
	type: 'n8n-nodes-base.todoist';
	version: 2.2;
	credentials?: TodoistV22Credentials;
}

export type TodoistV22TaskCloseNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22TaskCloseConfig>;
	output?: TodoistV22TaskCloseOutput;
};

export type TodoistV22TaskCreateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22TaskCreateConfig>;
	output?: TodoistV22TaskCreateOutput;
};

export type TodoistV22TaskDeleteNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22TaskDeleteConfig>;
};

export type TodoistV22TaskGetNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22TaskGetConfig>;
	output?: TodoistV22TaskGetOutput;
};

export type TodoistV22TaskGetAllNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22TaskGetAllConfig>;
	output?: TodoistV22TaskGetAllOutput;
};

export type TodoistV22TaskMoveNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22TaskMoveConfig>;
	output?: TodoistV22TaskMoveOutput;
};

export type TodoistV22TaskQuickAddNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22TaskQuickAddConfig>;
};

export type TodoistV22TaskReopenNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22TaskReopenConfig>;
};

export type TodoistV22TaskUpdateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22TaskUpdateConfig>;
	output?: TodoistV22TaskUpdateOutput;
};

export type TodoistV22ProjectArchiveNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ProjectArchiveConfig>;
};

export type TodoistV22ProjectCreateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ProjectCreateConfig>;
};

export type TodoistV22ProjectDeleteNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ProjectDeleteConfig>;
};

export type TodoistV22ProjectGetNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ProjectGetConfig>;
};

export type TodoistV22ProjectGetCollaboratorsNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ProjectGetCollaboratorsConfig>;
};

export type TodoistV22ProjectGetAllNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ProjectGetAllConfig>;
};

export type TodoistV22ProjectUnarchiveNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ProjectUnarchiveConfig>;
};

export type TodoistV22ProjectUpdateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ProjectUpdateConfig>;
};

export type TodoistV22SectionCreateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22SectionCreateConfig>;
};

export type TodoistV22SectionDeleteNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22SectionDeleteConfig>;
};

export type TodoistV22SectionGetNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22SectionGetConfig>;
};

export type TodoistV22SectionGetAllNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22SectionGetAllConfig>;
};

export type TodoistV22SectionUpdateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22SectionUpdateConfig>;
};

export type TodoistV22CommentCreateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22CommentCreateConfig>;
};

export type TodoistV22CommentDeleteNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22CommentDeleteConfig>;
};

export type TodoistV22CommentGetNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22CommentGetConfig>;
};

export type TodoistV22CommentGetAllNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22CommentGetAllConfig>;
};

export type TodoistV22CommentUpdateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22CommentUpdateConfig>;
};

export type TodoistV22LabelCreateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22LabelCreateConfig>;
};

export type TodoistV22LabelDeleteNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22LabelDeleteConfig>;
};

export type TodoistV22LabelGetNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22LabelGetConfig>;
};

export type TodoistV22LabelGetAllNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22LabelGetAllConfig>;
};

export type TodoistV22LabelUpdateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22LabelUpdateConfig>;
};

export type TodoistV22ReminderCreateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ReminderCreateConfig>;
};

export type TodoistV22ReminderDeleteNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ReminderDeleteConfig>;
};

export type TodoistV22ReminderGetAllNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ReminderGetAllConfig>;
};

export type TodoistV22ReminderUpdateNode = TodoistV22NodeBase & {
	config: NodeConfig<TodoistV22ReminderUpdateConfig>;
};

export type TodoistV22Node =
	| TodoistV22TaskCloseNode
	| TodoistV22TaskCreateNode
	| TodoistV22TaskDeleteNode
	| TodoistV22TaskGetNode
	| TodoistV22TaskGetAllNode
	| TodoistV22TaskMoveNode
	| TodoistV22TaskQuickAddNode
	| TodoistV22TaskReopenNode
	| TodoistV22TaskUpdateNode
	| TodoistV22ProjectArchiveNode
	| TodoistV22ProjectCreateNode
	| TodoistV22ProjectDeleteNode
	| TodoistV22ProjectGetNode
	| TodoistV22ProjectGetCollaboratorsNode
	| TodoistV22ProjectGetAllNode
	| TodoistV22ProjectUnarchiveNode
	| TodoistV22ProjectUpdateNode
	| TodoistV22SectionCreateNode
	| TodoistV22SectionDeleteNode
	| TodoistV22SectionGetNode
	| TodoistV22SectionGetAllNode
	| TodoistV22SectionUpdateNode
	| TodoistV22CommentCreateNode
	| TodoistV22CommentDeleteNode
	| TodoistV22CommentGetNode
	| TodoistV22CommentGetAllNode
	| TodoistV22CommentUpdateNode
	| TodoistV22LabelCreateNode
	| TodoistV22LabelDeleteNode
	| TodoistV22LabelGetNode
	| TodoistV22LabelGetAllNode
	| TodoistV22LabelUpdateNode
	| TodoistV22ReminderCreateNode
	| TodoistV22ReminderDeleteNode
	| TodoistV22ReminderGetAllNode
	| TodoistV22ReminderUpdateNode
	;