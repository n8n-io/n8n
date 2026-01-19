/**
 * Todoist Node - Version 2
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
export type TodoistV2TaskCloseConfig = {
	resource: 'task';
	operation: 'close';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV2TaskCreateConfig = {
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
export type TodoistV2TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV2TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV2TaskGetAllConfig = {
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
export type TodoistV2TaskMoveConfig = {
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
export type TodoistV2TaskQuickAddConfig = {
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
export type TodoistV2TaskReopenConfig = {
	resource: 'task';
	operation: 'reopen';
	taskId: string | Expression<string>;
};

/** Task resource */
export type TodoistV2TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Project resource */
export type TodoistV2ProjectArchiveConfig = {
	resource: 'project';
	operation: 'archive';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV2ProjectCreateConfig = {
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
export type TodoistV2ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV2ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV2ProjectGetCollaboratorsConfig = {
	resource: 'project';
	operation: 'getCollaborators';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV2ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
};

/** Project resource */
export type TodoistV2ProjectUnarchiveConfig = {
	resource: 'project';
	operation: 'unarchive';
/**
 * The project ID - can be either a string or number
 * @displayOptions.show { resource: ["project"], operation: ["archive", "delete", "get", "getCollaborators", "unarchive", "update"] }
 */
		projectId: string | Expression<string>;
};

/** Project resource */
export type TodoistV2ProjectUpdateConfig = {
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
export type TodoistV2SectionCreateConfig = {
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
export type TodoistV2SectionDeleteConfig = {
	resource: 'section';
	operation: 'delete';
	sectionId: string | Expression<string>;
};

/** Section resource */
export type TodoistV2SectionGetConfig = {
	resource: 'section';
	operation: 'get';
	sectionId: string | Expression<string>;
};

/** Section resource */
export type TodoistV2SectionGetAllConfig = {
	resource: 'section';
	operation: 'getAll';
	sectionFilters?: Record<string, unknown>;
};

/** Section resource */
export type TodoistV2SectionUpdateConfig = {
	resource: 'section';
	operation: 'update';
	sectionId: string | Expression<string>;
	sectionUpdateFields?: Record<string, unknown>;
};

/** Comment resource */
export type TodoistV2CommentCreateConfig = {
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
export type TodoistV2CommentDeleteConfig = {
	resource: 'comment';
	operation: 'delete';
	commentId: string | Expression<string>;
};

/** Comment resource */
export type TodoistV2CommentGetConfig = {
	resource: 'comment';
	operation: 'get';
	commentId: string | Expression<string>;
};

/** Comment resource */
export type TodoistV2CommentGetAllConfig = {
	resource: 'comment';
	operation: 'getAll';
	commentFilters?: Record<string, unknown>;
};

/** Comment resource */
export type TodoistV2CommentUpdateConfig = {
	resource: 'comment';
	operation: 'update';
	commentId: string | Expression<string>;
	commentUpdateFields?: Record<string, unknown>;
};

/** Label resource */
export type TodoistV2LabelCreateConfig = {
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
export type TodoistV2LabelDeleteConfig = {
	resource: 'label';
	operation: 'delete';
	labelId: string | Expression<string>;
};

/** Label resource */
export type TodoistV2LabelGetConfig = {
	resource: 'label';
	operation: 'get';
	labelId: string | Expression<string>;
};

/** Label resource */
export type TodoistV2LabelGetAllConfig = {
	resource: 'label';
	operation: 'getAll';
};

/** Label resource */
export type TodoistV2LabelUpdateConfig = {
	resource: 'label';
	operation: 'update';
	labelId: string | Expression<string>;
	labelUpdateFields?: Record<string, unknown>;
};

/** Reminder resource */
export type TodoistV2ReminderCreateConfig = {
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
export type TodoistV2ReminderDeleteConfig = {
	resource: 'reminder';
	operation: 'delete';
	reminderId: string | Expression<string>;
};

/** Reminder resource */
export type TodoistV2ReminderGetAllConfig = {
	resource: 'reminder';
	operation: 'getAll';
};

/** Reminder resource */
export type TodoistV2ReminderUpdateConfig = {
	resource: 'reminder';
	operation: 'update';
	reminderId: string | Expression<string>;
	reminderUpdateFields?: Record<string, unknown>;
};

export type TodoistV2Params =
	| TodoistV2TaskCloseConfig
	| TodoistV2TaskCreateConfig
	| TodoistV2TaskDeleteConfig
	| TodoistV2TaskGetConfig
	| TodoistV2TaskGetAllConfig
	| TodoistV2TaskMoveConfig
	| TodoistV2TaskQuickAddConfig
	| TodoistV2TaskReopenConfig
	| TodoistV2TaskUpdateConfig
	| TodoistV2ProjectArchiveConfig
	| TodoistV2ProjectCreateConfig
	| TodoistV2ProjectDeleteConfig
	| TodoistV2ProjectGetConfig
	| TodoistV2ProjectGetCollaboratorsConfig
	| TodoistV2ProjectGetAllConfig
	| TodoistV2ProjectUnarchiveConfig
	| TodoistV2ProjectUpdateConfig
	| TodoistV2SectionCreateConfig
	| TodoistV2SectionDeleteConfig
	| TodoistV2SectionGetConfig
	| TodoistV2SectionGetAllConfig
	| TodoistV2SectionUpdateConfig
	| TodoistV2CommentCreateConfig
	| TodoistV2CommentDeleteConfig
	| TodoistV2CommentGetConfig
	| TodoistV2CommentGetAllConfig
	| TodoistV2CommentUpdateConfig
	| TodoistV2LabelCreateConfig
	| TodoistV2LabelDeleteConfig
	| TodoistV2LabelGetConfig
	| TodoistV2LabelGetAllConfig
	| TodoistV2LabelUpdateConfig
	| TodoistV2ReminderCreateConfig
	| TodoistV2ReminderDeleteConfig
	| TodoistV2ReminderGetAllConfig
	| TodoistV2ReminderUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type TodoistV2TaskCloseOutput = {
	success?: boolean;
};

export type TodoistV2TaskCreateOutput = {
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

export type TodoistV2TaskGetOutput = {
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

export type TodoistV2TaskGetAllOutput = {
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

export type TodoistV2TaskMoveOutput = {
	success?: boolean;
};

export type TodoistV2TaskUpdateOutput = {
	success?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface TodoistV2Credentials {
	todoistApi: CredentialReference;
	todoistOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TodoistV2NodeBase {
	type: 'n8n-nodes-base.todoist';
	version: 2;
	credentials?: TodoistV2Credentials;
}

export type TodoistV2TaskCloseNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2TaskCloseConfig>;
	output?: TodoistV2TaskCloseOutput;
};

export type TodoistV2TaskCreateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2TaskCreateConfig>;
	output?: TodoistV2TaskCreateOutput;
};

export type TodoistV2TaskDeleteNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2TaskDeleteConfig>;
};

export type TodoistV2TaskGetNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2TaskGetConfig>;
	output?: TodoistV2TaskGetOutput;
};

export type TodoistV2TaskGetAllNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2TaskGetAllConfig>;
	output?: TodoistV2TaskGetAllOutput;
};

export type TodoistV2TaskMoveNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2TaskMoveConfig>;
	output?: TodoistV2TaskMoveOutput;
};

export type TodoistV2TaskQuickAddNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2TaskQuickAddConfig>;
};

export type TodoistV2TaskReopenNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2TaskReopenConfig>;
};

export type TodoistV2TaskUpdateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2TaskUpdateConfig>;
	output?: TodoistV2TaskUpdateOutput;
};

export type TodoistV2ProjectArchiveNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ProjectArchiveConfig>;
};

export type TodoistV2ProjectCreateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ProjectCreateConfig>;
};

export type TodoistV2ProjectDeleteNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ProjectDeleteConfig>;
};

export type TodoistV2ProjectGetNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ProjectGetConfig>;
};

export type TodoistV2ProjectGetCollaboratorsNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ProjectGetCollaboratorsConfig>;
};

export type TodoistV2ProjectGetAllNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ProjectGetAllConfig>;
};

export type TodoistV2ProjectUnarchiveNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ProjectUnarchiveConfig>;
};

export type TodoistV2ProjectUpdateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ProjectUpdateConfig>;
};

export type TodoistV2SectionCreateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2SectionCreateConfig>;
};

export type TodoistV2SectionDeleteNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2SectionDeleteConfig>;
};

export type TodoistV2SectionGetNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2SectionGetConfig>;
};

export type TodoistV2SectionGetAllNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2SectionGetAllConfig>;
};

export type TodoistV2SectionUpdateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2SectionUpdateConfig>;
};

export type TodoistV2CommentCreateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2CommentCreateConfig>;
};

export type TodoistV2CommentDeleteNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2CommentDeleteConfig>;
};

export type TodoistV2CommentGetNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2CommentGetConfig>;
};

export type TodoistV2CommentGetAllNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2CommentGetAllConfig>;
};

export type TodoistV2CommentUpdateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2CommentUpdateConfig>;
};

export type TodoistV2LabelCreateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2LabelCreateConfig>;
};

export type TodoistV2LabelDeleteNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2LabelDeleteConfig>;
};

export type TodoistV2LabelGetNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2LabelGetConfig>;
};

export type TodoistV2LabelGetAllNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2LabelGetAllConfig>;
};

export type TodoistV2LabelUpdateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2LabelUpdateConfig>;
};

export type TodoistV2ReminderCreateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ReminderCreateConfig>;
};

export type TodoistV2ReminderDeleteNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ReminderDeleteConfig>;
};

export type TodoistV2ReminderGetAllNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ReminderGetAllConfig>;
};

export type TodoistV2ReminderUpdateNode = TodoistV2NodeBase & {
	config: NodeConfig<TodoistV2ReminderUpdateConfig>;
};

export type TodoistV2Node =
	| TodoistV2TaskCloseNode
	| TodoistV2TaskCreateNode
	| TodoistV2TaskDeleteNode
	| TodoistV2TaskGetNode
	| TodoistV2TaskGetAllNode
	| TodoistV2TaskMoveNode
	| TodoistV2TaskQuickAddNode
	| TodoistV2TaskReopenNode
	| TodoistV2TaskUpdateNode
	| TodoistV2ProjectArchiveNode
	| TodoistV2ProjectCreateNode
	| TodoistV2ProjectDeleteNode
	| TodoistV2ProjectGetNode
	| TodoistV2ProjectGetCollaboratorsNode
	| TodoistV2ProjectGetAllNode
	| TodoistV2ProjectUnarchiveNode
	| TodoistV2ProjectUpdateNode
	| TodoistV2SectionCreateNode
	| TodoistV2SectionDeleteNode
	| TodoistV2SectionGetNode
	| TodoistV2SectionGetAllNode
	| TodoistV2SectionUpdateNode
	| TodoistV2CommentCreateNode
	| TodoistV2CommentDeleteNode
	| TodoistV2CommentGetNode
	| TodoistV2CommentGetAllNode
	| TodoistV2CommentUpdateNode
	| TodoistV2LabelCreateNode
	| TodoistV2LabelDeleteNode
	| TodoistV2LabelGetNode
	| TodoistV2LabelGetAllNode
	| TodoistV2LabelUpdateNode
	| TodoistV2ReminderCreateNode
	| TodoistV2ReminderDeleteNode
	| TodoistV2ReminderGetAllNode
	| TodoistV2ReminderUpdateNode
	;