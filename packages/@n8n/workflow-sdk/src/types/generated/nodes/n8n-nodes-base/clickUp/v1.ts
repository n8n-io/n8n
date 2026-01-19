/**
 * ClickUp Node - Version 1
 * Consume ClickUp API (Beta)
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a checklist */
export type ClickUpV1ChecklistCreateConfig = {
	resource: 'checklist';
	operation: 'create';
	task: string | Expression<string>;
	name: string | Expression<string>;
};

/** Delete a checklist */
export type ClickUpV1ChecklistDeleteConfig = {
	resource: 'checklist';
	operation: 'delete';
	checklist: string | Expression<string>;
};

/** Update a checklist */
export type ClickUpV1ChecklistUpdateConfig = {
	resource: 'checklist';
	operation: 'update';
	checklist: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a checklist */
export type ClickUpV1ChecklistItemCreateConfig = {
	resource: 'checklistItem';
	operation: 'create';
	checklist: string | Expression<string>;
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a checklist */
export type ClickUpV1ChecklistItemDeleteConfig = {
	resource: 'checklistItem';
	operation: 'delete';
	checklist: string | Expression<string>;
	checklistItem: string | Expression<string>;
};

/** Update a checklist */
export type ClickUpV1ChecklistItemUpdateConfig = {
	resource: 'checklistItem';
	operation: 'update';
	checklist: string | Expression<string>;
	checklistItem: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a checklist */
export type ClickUpV1CommentCreateConfig = {
	resource: 'comment';
	operation: 'create';
	commentOn?: 'list' | 'task' | 'view' | Expression<string>;
	id: string | Expression<string>;
	commentText?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a checklist */
export type ClickUpV1CommentDeleteConfig = {
	resource: 'comment';
	operation: 'delete';
	comment: string | Expression<string>;
};

/** Get many comments */
export type ClickUpV1CommentGetAllConfig = {
	resource: 'comment';
	operation: 'getAll';
	commentsOn?: 'list' | 'task' | 'view' | Expression<string>;
	id: string | Expression<string>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["comment"], operation: ["getAll"] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a checklist */
export type ClickUpV1CommentUpdateConfig = {
	resource: 'comment';
	operation: 'update';
	comment: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a checklist */
export type ClickUpV1FolderCreateConfig = {
	resource: 'folder';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["create"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["create"] }
 */
		space: string | Expression<string>;
	name: string | Expression<string>;
};

/** Delete a checklist */
export type ClickUpV1FolderDeleteConfig = {
	resource: 'folder';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["delete"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["delete"] }
 */
		space: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["delete"] }
 */
		folder: string | Expression<string>;
};

/** Get a folder */
export type ClickUpV1FolderGetConfig = {
	resource: 'folder';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["get"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["get"] }
 */
		space: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["get"] }
 */
		folder: string | Expression<string>;
};

/** Get many comments */
export type ClickUpV1FolderGetAllConfig = {
	resource: 'folder';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["getAll"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["getAll"] }
 */
		space: string | Expression<string>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["folder"], operation: ["getAll"] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a checklist */
export type ClickUpV1FolderUpdateConfig = {
	resource: 'folder';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["update"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["update"] }
 */
		space: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["folder"], operation: ["update"] }
 */
		folder: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a checklist */
export type ClickUpV1GoalCreateConfig = {
	resource: 'goal';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["goal"], operation: ["create"] }
 */
		team: string | Expression<string>;
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a checklist */
export type ClickUpV1GoalDeleteConfig = {
	resource: 'goal';
	operation: 'delete';
	goal: string | Expression<string>;
};

/** Get a folder */
export type ClickUpV1GoalGetConfig = {
	resource: 'goal';
	operation: 'get';
	goal: string | Expression<string>;
};

/** Get many comments */
export type ClickUpV1GoalGetAllConfig = {
	resource: 'goal';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["goal"], operation: ["getAll"] }
 */
		team: string | Expression<string>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["goal"], operation: ["getAll"] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a checklist */
export type ClickUpV1GoalUpdateConfig = {
	resource: 'goal';
	operation: 'update';
	goal: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a checklist */
export type ClickUpV1GoalKeyResultCreateConfig = {
	resource: 'goalKeyResult';
	operation: 'create';
	goal: string | Expression<string>;
	name: string | Expression<string>;
	type: 'automatic' | 'boolean' | 'currency' | 'number' | 'percentage' | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a checklist */
export type ClickUpV1GoalKeyResultDeleteConfig = {
	resource: 'goalKeyResult';
	operation: 'delete';
	keyResult: string | Expression<string>;
};

/** Update a checklist */
export type ClickUpV1GoalKeyResultUpdateConfig = {
	resource: 'goalKeyResult';
	operation: 'update';
	keyResult: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a checklist */
export type ClickUpV1ListCreateConfig = {
	resource: 'list';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["create"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["create"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["create"], folderless: [false] }
 */
		folder: string | Expression<string>;
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Retrieve list's custom fields */
export type ClickUpV1ListCustomFieldsConfig = {
	resource: 'list';
	operation: 'customFields';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["customFields"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["customFields"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["customFields"], folderless: [false] }
 */
		folder: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["customFields"], folderless: [true] }
 */
		list: string | Expression<string>;
};

/** Delete a checklist */
export type ClickUpV1ListDeleteConfig = {
	resource: 'list';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["delete"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["delete"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["delete"], folderless: [false] }
 */
		folder: string | Expression<string>;
	list: string | Expression<string>;
};

/** Get a folder */
export type ClickUpV1ListGetConfig = {
	resource: 'list';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["get"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["get"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["get"], folderless: [false] }
 */
		folder: string | Expression<string>;
	list: string | Expression<string>;
};

/** Get many comments */
export type ClickUpV1ListGetAllConfig = {
	resource: 'list';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["getAll"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["getAll"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["getAll"], folderless: [false] }
 */
		folder: string | Expression<string>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["list"], operation: ["getAll"] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get task members */
export type ClickUpV1ListMemberConfig = {
	resource: 'list';
	operation: 'member';
/**
 * Task ID
 * @displayOptions.show { resource: ["list"], operation: ["member"] }
 */
		id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["list"], operation: ["member"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["list"], operation: ["member"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a checklist */
export type ClickUpV1ListUpdateConfig = {
	resource: 'list';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["update"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["update"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["list"], operation: ["update"], folderless: [false] }
 */
		folder: string | Expression<string>;
	list: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a checklist */
export type ClickUpV1SpaceTagCreateConfig = {
	resource: 'spaceTag';
	operation: 'create';
	space: string | Expression<string>;
	name: string | Expression<string>;
	foregroundColor: string | Expression<string>;
	backgroundColor: string | Expression<string>;
};

/** Delete a checklist */
export type ClickUpV1SpaceTagDeleteConfig = {
	resource: 'spaceTag';
	operation: 'delete';
	space: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["spaceTag"], operation: ["delete", "update"] }
 */
		name: string | Expression<string>;
};

/** Get many comments */
export type ClickUpV1SpaceTagGetAllConfig = {
	resource: 'spaceTag';
	operation: 'getAll';
	space: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["spaceTag"], operation: ["getAll"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["spaceTag"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Update a checklist */
export type ClickUpV1SpaceTagUpdateConfig = {
	resource: 'spaceTag';
	operation: 'update';
	space: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["spaceTag"], operation: ["delete", "update"] }
 */
		name: string | Expression<string>;
/**
 * New name to set for the tag
 * @displayOptions.show { resource: ["spaceTag"], operation: ["update"] }
 */
		newName: string | Expression<string>;
	foregroundColor: string | Expression<string>;
	backgroundColor: string | Expression<string>;
};

/** Create a checklist */
export type ClickUpV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"], operation: ["create"], folderless: [false] }
 */
		folder: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"], operation: ["create"], folderless: [true] }
 */
		list: string | Expression<string>;
/**
 * The first name on the task
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a checklist */
export type ClickUpV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	id: string | Expression<string>;
};

/** Get a folder */
export type ClickUpV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	id: string | Expression<string>;
/**
 * Whether to also fetch and include subtasks for this task
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 * @default false
 */
		includeSubtasks?: boolean | Expression<boolean>;
/**
 * Whether to include the markdown_description field in the response. This is important for preserving links in the description.
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 * @default false
 */
		includeMarkdownDescription?: boolean | Expression<boolean>;
};

/** Get many comments */
export type ClickUpV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], folderless: [false] }
 */
		folder: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], folderless: [true] }
 */
		list: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get task members */
export type ClickUpV1TaskMemberConfig = {
	resource: 'task';
	operation: 'member';
	id: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["member"] }
 * @default true
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["member"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
};

/** Set a custom field */
export type ClickUpV1TaskSetCustomFieldConfig = {
	resource: 'task';
	operation: 'setCustomField';
/**
 * The ID of the task to add custom field to
 * @displayOptions.show { resource: ["task"], operation: ["setCustomField"] }
 */
		task: string | Expression<string>;
/**
 * The ID of the field to add custom field to
 * @displayOptions.show { resource: ["task"], operation: ["setCustomField"] }
 */
		field: string | Expression<string>;
/**
 * The value is JSON and will be parsed as such. Is needed if for example needed for labels which expects the value to be an array.
 * @displayOptions.show { resource: ["task"], operation: ["setCustomField"] }
 * @default false
 */
		jsonParse?: boolean | Expression<boolean>;
/**
 * The value to set on custom field
 * @displayOptions.show { resource: ["task"], operation: ["setCustomField"] }
 */
		value: string | Expression<string>;
};

/** Update a checklist */
export type ClickUpV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a checklist */
export type ClickUpV1TaskDependencyCreateConfig = {
	resource: 'taskDependency';
	operation: 'create';
	task: string | Expression<string>;
	dependsOnTask: string | Expression<string>;
};

/** Delete a checklist */
export type ClickUpV1TaskDependencyDeleteConfig = {
	resource: 'taskDependency';
	operation: 'delete';
	task: string | Expression<string>;
	dependsOnTask: string | Expression<string>;
};

/** Add a tag to a task */
export type ClickUpV1TaskListAddConfig = {
	resource: 'taskList';
	operation: 'add';
	taskId: string | Expression<string>;
	listId: string | Expression<string>;
};

/** Remove a tag from a task */
export type ClickUpV1TaskListRemoveConfig = {
	resource: 'taskList';
	operation: 'remove';
	taskId: string | Expression<string>;
	listId: string | Expression<string>;
};

/** Add a tag to a task */
export type ClickUpV1TaskTagAddConfig = {
	resource: 'taskTag';
	operation: 'add';
	taskId: string | Expression<string>;
	tagName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Remove a tag from a task */
export type ClickUpV1TaskTagRemoveConfig = {
	resource: 'taskTag';
	operation: 'remove';
	taskId: string | Expression<string>;
	tagName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a checklist */
export type ClickUpV1TimeEntryCreateConfig = {
	resource: 'timeEntry';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["create"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["create"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["create"], folderless: [false] }
 */
		folder: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["create"], folderless: [true] }
 */
		list: string | Expression<string>;
	start: string | Expression<string>;
/**
 * Duration in minutes
 * @displayOptions.show { resource: ["timeEntry"], operation: ["create"] }
 * @default 0
 */
		duration: number | Expression<number>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["create"] }
 */
		task?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a checklist */
export type ClickUpV1TimeEntryDeleteConfig = {
	resource: 'timeEntry';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["delete"] }
 */
		team: string | Expression<string>;
	timeEntry: string | Expression<string>;
};

/** Get a folder */
export type ClickUpV1TimeEntryGetConfig = {
	resource: 'timeEntry';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["get"] }
 */
		team: string | Expression<string>;
/**
 * Whether to return just the current running time entry
 * @displayOptions.show { resource: ["timeEntry"], operation: ["get"] }
 * @default false
 */
		running?: boolean | Expression<boolean>;
	timeEntry: string | Expression<string>;
};

/** Get many comments */
export type ClickUpV1TimeEntryGetAllConfig = {
	resource: 'timeEntry';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["getAll"] }
 */
		team: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["timeEntry"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["timeEntry"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Start a time entry */
export type ClickUpV1TimeEntryStartConfig = {
	resource: 'timeEntry';
	operation: 'start';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["start"] }
 */
		team: string | Expression<string>;
	task: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Stop the current running timer */
export type ClickUpV1TimeEntryStopConfig = {
	resource: 'timeEntry';
	operation: 'stop';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["stop"] }
 */
		team: string | Expression<string>;
};

/** Update a checklist */
export type ClickUpV1TimeEntryUpdateConfig = {
	resource: 'timeEntry';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["update"] }
 */
		team: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["update"] }
 */
		space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["update"], folderless: [false] }
 */
		folder: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntry"], operation: ["update"], folderless: [true] }
 */
		list: string | Expression<string>;
	archived: boolean | Expression<boolean>;
	timeEntry: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add a tag to a task */
export type ClickUpV1TimeEntryTagAddConfig = {
	resource: 'timeEntryTag';
	operation: 'add';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntryTag"], operation: ["add"] }
 */
		team: string | Expression<string>;
	timeEntryIds: string | Expression<string>;
	tagsUi?: {
		tagsValues?: Array<{
			/** Name
			 */
			name?: string | Expression<string>;
			/** Background Color
			 * @default #ff0000
			 */
			tag_bg?: string | Expression<string>;
			/** Foreground Color
			 * @default #ff0000
			 */
			tag_fg?: string | Expression<string>;
		}>;
	};
};

/** Get many comments */
export type ClickUpV1TimeEntryTagGetAllConfig = {
	resource: 'timeEntryTag';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntryTag"], operation: ["getAll"] }
 */
		team: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["timeEntryTag"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["timeEntryTag"], operation: ["getAll"], returnAll: [false] }
 * @default 5
 */
		limit?: number | Expression<number>;
};

/** Remove a tag from a task */
export type ClickUpV1TimeEntryTagRemoveConfig = {
	resource: 'timeEntryTag';
	operation: 'remove';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntryTag"], operation: ["remove"] }
 */
		team: string | Expression<string>;
	timeEntryIds: string | Expression<string>;
/**
 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["timeEntryTag"], operation: ["remove"] }
 * @default []
 */
		tagNames: string[];
};


// ===========================================================================
// Output Types
// ===========================================================================

export type ClickUpV1ChecklistCreateOutput = {
	id?: string;
	name?: string;
	orderindex?: number;
	resolved?: number;
	task_id?: string;
	unresolved?: number;
};

export type ClickUpV1ChecklistItemCreateOutput = {
	creator?: number;
	date_created?: string;
	id?: string;
	items?: Array<{
		assignee?: null;
		date_created?: string;
		due_date?: null;
		due_date_time?: boolean;
		group_assignee?: null;
		id?: string;
		parent?: null;
		resolved?: boolean;
		sent_due_date_notif?: null;
		start_date?: null;
		start_date_time?: boolean;
	}>;
	name?: string;
	orderindex?: number;
	resolved?: number;
	task_id?: string;
	unresolved?: number;
};

export type ClickUpV1CommentCreateOutput = {
	date?: number;
	hist_id?: string;
	id?: number;
	version?: {
		data?: {
			changes?: Array<{
				after?: number;
				field?: string;
			}>;
			context?: {
				audit_context?: {
					current_time?: number;
					route?: string;
					userid?: number;
				};
				originating_service?: string;
			};
			relationships?: Array<{
				object_type?: string;
				type?: string;
				workspace_id?: string;
			}>;
		};
		date_created?: number;
		date_updated?: number;
		deleted?: boolean;
		event_publish_time?: number;
		master_id?: number;
		object_id?: string;
		object_type?: string;
		operation?: string;
		traceparent?: string;
		version?: number;
		workspace_id?: number;
	};
};

export type ClickUpV1CommentGetAllOutput = {
	comment?: Array<{
		attributes?: {
			'block-id'?: string;
		};
		text?: string;
	}>;
	comment_text?: string;
	date?: string;
	group_assignee?: null;
	id?: string;
	reactions?: Array<{
		date?: string;
		reaction?: string;
		user?: {
			email?: string;
			id?: number;
			initials?: string;
			username?: string;
		};
	}>;
	reply_count?: number;
	user?: {
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	};
};

export type ClickUpV1FolderCreateOutput = {
	archived?: boolean;
	deleted?: boolean;
	hidden?: boolean;
	id?: string;
	lists?: Array<{
		archived?: boolean;
		assignee?: null;
		content?: string;
		due_date?: null;
		id?: string;
		name?: string;
		orderindex?: number;
		override_statuses?: boolean;
		permission_level?: string;
		priority?: null;
		start_date?: null;
		status?: null;
		statuses?: Array<{
			color?: string;
			id?: string;
			orderindex?: number;
			status?: string;
			status_group?: string;
			type?: string;
		}>;
		task_count?: number;
	}>;
	name?: string;
	orderindex?: number;
	override_statuses?: boolean;
	permission_level?: string;
	space?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	task_count?: string;
};

export type ClickUpV1FolderGetOutput = {
	archived?: boolean;
	hidden?: boolean;
	id?: string;
	lists?: Array<{
		archived?: boolean;
		content?: string;
		id?: string;
		name?: string;
		orderindex?: number;
		permission_level?: string;
		statuses?: Array<{
			color?: string;
			id?: string;
			orderindex?: number;
			status?: string;
			status_group?: string;
			type?: string;
		}>;
		task_count?: number;
	}>;
	name?: string;
	orderindex?: number;
	override_statuses?: boolean;
	permission_level?: string;
	space?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	statuses?: Array<{
		color?: string;
		id?: string;
		orderindex?: number;
		status?: string;
		type?: string;
	}>;
	task_count?: string;
};

export type ClickUpV1FolderGetAllOutput = {
	archived?: boolean;
	hidden?: boolean;
	id?: string;
	lists?: Array<{
		archived?: boolean;
		content?: string;
		id?: string;
		name?: string;
		orderindex?: number;
		permission_level?: string;
		space?: {
			access?: boolean;
			id?: string;
			name?: string;
		};
		statuses?: Array<{
			color?: string;
			id?: string;
			orderindex?: number;
			status?: string;
			status_group?: string;
			type?: string;
		}>;
		task_count?: number;
	}>;
	name?: string;
	permission_level?: string;
	space?: {
		id?: string;
		name?: string;
	};
	statuses?: Array<{
		color?: string;
		id?: string;
		orderindex?: number;
		status?: string;
		type?: string;
	}>;
	task_count?: string;
};

export type ClickUpV1ListCreateOutput = {
	archived?: boolean;
	assignee?: null;
	content?: string;
	deleted?: boolean;
	folder?: {
		access?: boolean;
		hidden?: boolean;
		id?: string;
		name?: string;
	};
	id?: string;
	inbound_address?: string;
	name?: string;
	orderindex?: number;
	override_statuses?: boolean;
	permission_level?: string;
	space?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	start_date?: null;
	statuses?: Array<{
		color?: string;
		id?: string;
		orderindex?: number;
		status?: string;
		status_group?: string;
		type?: string;
	}>;
};

export type ClickUpV1ListCustomFieldsOutput = {
	date_created?: string;
	hide_from_guests?: boolean;
	id?: string;
	name?: string;
	type?: string;
	type_config?: {
		options?: Array<{
			id?: string;
			name?: string;
			orderindex?: number;
		}>;
	};
};

export type ClickUpV1ListGetOutput = {
	archived?: boolean;
	content?: string;
	deleted?: boolean;
	folder?: {
		access?: boolean;
		hidden?: boolean;
		id?: string;
		name?: string;
	};
	id?: string;
	inbound_address?: string;
	name?: string;
	permission_level?: string;
	priority?: null;
	space?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	statuses?: Array<{
		color?: string;
		id?: string;
		orderindex?: number;
		status?: string;
		status_group?: string;
		type?: string;
	}>;
};

export type ClickUpV1ListGetAllOutput = {
	archived?: boolean;
	content?: string;
	folder?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	id?: string;
	name?: string;
	permission_level?: string;
	space?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	task_count?: number;
};

export type ClickUpV1ListMemberOutput = {
	email?: string;
	id?: number;
	initials?: string;
	profileInfo?: {
		verified_consultant?: null;
		viewed_verified_consultant?: null;
	};
};

export type ClickUpV1TaskCreateOutput = {
	archived?: boolean;
	assignees?: Array<{
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	}>;
	creator?: {
		email?: string;
		id?: number;
		username?: string;
	};
	custom_fields?: Array<{
		date_created?: string;
		hide_from_guests?: boolean;
		id?: string;
		name?: string;
		type?: string;
		type_config?: {
			new_drop_down?: boolean;
			options?: Array<{
				id?: string;
				name?: string;
				orderindex?: number;
			}>;
			sorting?: string;
		};
	}>;
	custom_id?: null;
	custom_item_id?: number;
	date_created?: string;
	date_updated?: string;
	description?: string;
	folder?: {
		access?: boolean;
		hidden?: boolean;
		id?: string;
		name?: string;
	};
	id?: string;
	list?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	name?: string;
	orderindex?: string;
	permission_level?: string;
	points?: null;
	project?: {
		access?: boolean;
		hidden?: boolean;
		id?: string;
		name?: string;
	};
	sharing?: {
		public?: boolean;
		public_fields?: Array<string>;
		public_share_expires_on?: null;
		seo_optimized?: boolean;
		token?: null;
	};
	space?: {
		id?: string;
	};
	status?: {
		color?: string;
		id?: string;
		orderindex?: number;
		status?: string;
		type?: string;
	};
	tags?: Array<{
		creator?: number;
		name?: string;
		tag_bg?: string;
		tag_fg?: string;
	}>;
	team_id?: string;
	text_content?: string;
	time_spent?: number;
	url?: string;
	watchers?: Array<{
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	}>;
};

export type ClickUpV1TaskDeleteOutput = {
	success?: boolean;
};

export type ClickUpV1TaskGetOutput = {
	archived?: boolean;
	assignees?: Array<{
		color?: string;
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	}>;
	attachments?: Array<{
		date?: string;
		deleted?: boolean;
		email_data?: null;
		extension?: string;
		hidden?: boolean;
		id?: string;
		is_folder?: null;
		mimetype?: string;
		orientation?: null;
		parent_id?: string;
		resolved_comments?: number;
		size?: number;
		source?: number;
		title?: string;
		total_comments?: number;
		type?: number;
		url?: string;
		url_w_host?: string;
		url_w_query?: string;
		user?: {
			color?: string;
			email?: string;
			id?: number;
			initials?: string;
			username?: string;
		};
		version?: number;
		workspace_id?: null;
	}>;
	creator?: {
		color?: string;
		email?: string;
		id?: number;
		username?: string;
	};
	custom_fields?: Array<{
		date_created?: string;
		hide_from_guests?: boolean;
		id?: string;
		name?: string;
		type?: string;
		type_config?: {
			field_inverted_name?: string;
			fields?: Array<{
				field?: string;
				hidden?: boolean;
				name?: string;
				width?: number;
			}>;
			linked_subcategory_access?: boolean;
			options?: Array<{
				id?: string;
				name?: string;
				orderindex?: number;
			}>;
			subcategory_id?: string;
			subcategory_inverted_name?: string;
		};
	}>;
	custom_item_id?: number;
	date_created?: string;
	date_updated?: string;
	dependencies?: Array<{
		chain_id?: null;
		date_created?: string;
		depends_on?: string;
		task_id?: string;
		type?: number;
		userid?: string;
		workspace_id?: string;
	}>;
	folder?: {
		access?: boolean;
		hidden?: boolean;
		id?: string;
		name?: string;
	};
	id?: string;
	linked_tasks?: Array<{
		date_created?: string;
		link_id?: string;
		task_id?: string;
		userid?: string;
		workspace_id?: string;
	}>;
	list?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	name?: string;
	orderindex?: string;
	permission_level?: string;
	points?: null;
	project?: {
		access?: boolean;
		hidden?: boolean;
		id?: string;
		name?: string;
	};
	sharing?: {
		public?: boolean;
		public_fields?: Array<string>;
		public_share_expires_on?: null;
		seo_optimized?: boolean;
		token?: null;
	};
	space?: {
		id?: string;
	};
	status?: {
		color?: string;
		id?: string;
		orderindex?: number;
		status?: string;
		type?: string;
	};
	tags?: Array<{
		creator?: number;
		name?: string;
		tag_bg?: string;
		tag_fg?: string;
	}>;
	team_id?: string;
	time_spent?: number;
	url?: string;
	watchers?: Array<{
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	}>;
};

export type ClickUpV1TaskGetAllOutput = {
	archived?: boolean;
	assignees?: Array<{
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	}>;
	checklists?: Array<{
		creator?: number;
		date_created?: string;
		id?: string;
		name?: string;
		orderindex?: number;
		resolved?: number;
		task_id?: string;
		unresolved?: number;
	}>;
	creator?: {
		email?: string;
		id?: number;
		username?: string;
	};
	custom_fields?: Array<{
		date_created?: string;
		hide_from_guests?: boolean;
		id?: string;
		name?: string;
		type?: string;
		type_config?: {
			options?: Array<{
				id?: string;
				name?: string;
				orderindex?: number;
			}>;
			sorting?: string;
		};
	}>;
	custom_item_id?: number;
	date_created?: string;
	date_updated?: string;
	dependencies?: Array<{
		date_created?: string;
		depends_on?: string;
		task_id?: string;
		type?: number;
		userid?: string;
		workspace_id?: string;
	}>;
	folder?: {
		access?: boolean;
		hidden?: boolean;
		id?: string;
		name?: string;
	};
	id?: string;
	linked_tasks?: Array<{
		date_created?: string;
		link_id?: string;
		task_id?: string;
		userid?: string;
		workspace_id?: string;
	}>;
	list?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	locations?: Array<{
		id?: string;
		name?: string;
	}>;
	name?: string;
	orderindex?: string;
	permission_level?: string;
	project?: {
		access?: boolean;
		hidden?: boolean;
		id?: string;
		name?: string;
	};
	sharing?: {
		public?: boolean;
		public_fields?: Array<string>;
		public_share_expires_on?: null;
		seo_optimized?: boolean;
		token?: null;
	};
	space?: {
		id?: string;
	};
	status?: {
		color?: string;
		id?: string;
		orderindex?: number;
		status?: string;
		type?: string;
	};
	tags?: Array<{
		creator?: number;
		name?: string;
		tag_bg?: string;
		tag_fg?: string;
	}>;
	team_id?: string;
	url?: string;
	watchers?: Array<{
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	}>;
};

export type ClickUpV1TaskUpdateOutput = {
	archived?: boolean;
	assignees?: Array<{
		color?: string;
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	}>;
	attachments?: Array<{
		date?: string;
		deleted?: boolean;
		email_data?: null;
		extension?: string;
		hidden?: boolean;
		id?: string;
		is_folder?: null;
		mimetype?: string;
		parent_id?: string;
		resolved_comments?: number;
		size?: number;
		source?: number;
		title?: string;
		total_comments?: number;
		type?: number;
		url?: string;
		url_w_host?: string;
		url_w_query?: string;
		user?: {
			color?: string;
			email?: string;
			id?: number;
			initials?: string;
			username?: string;
		};
		version?: number;
		workspace_id?: null;
	}>;
	checklists?: Array<{
		creator?: number;
		date_created?: string;
		id?: string;
		items?: Array<{
			date_created?: string;
			due_date?: null;
			group_assignee?: null;
			id?: string;
			name?: string;
			parent?: null;
			resolved?: boolean;
			sent_due_date_notif?: null;
			start_date?: null;
		}>;
		name?: string;
		orderindex?: number;
		resolved?: number;
		task_id?: string;
		unresolved?: number;
	}>;
	creator?: {
		email?: string;
		id?: number;
		username?: string;
	};
	custom_fields?: Array<{
		date_created?: string;
		hide_from_guests?: boolean;
		id?: string;
		name?: string;
		type?: string;
		type_config?: {
			options?: Array<{
				id?: string;
				name?: string;
				orderindex?: number;
			}>;
			sorting?: string;
		};
	}>;
	custom_item_id?: number;
	date_created?: string;
	date_updated?: string;
	dependencies?: Array<{
		chain_id?: null;
		date_created?: string;
		depends_on?: string;
		task_id?: string;
		type?: number;
		userid?: string;
		workspace_id?: string;
	}>;
	folder?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	id?: string;
	linked_tasks?: Array<{
		date_created?: string;
		link_id?: string;
		task_id?: string;
		userid?: string;
		workspace_id?: string;
	}>;
	list?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	locations?: Array<{
		id?: string;
		name?: string;
	}>;
	name?: string;
	orderindex?: string;
	permission_level?: string;
	project?: {
		access?: boolean;
		id?: string;
		name?: string;
	};
	sharing?: {
		public?: boolean;
		public_fields?: Array<string>;
		public_share_expires_on?: null;
		seo_optimized?: boolean;
		token?: null;
	};
	space?: {
		id?: string;
	};
	status?: {
		color?: string;
		id?: string;
		orderindex?: number;
		status?: string;
		type?: string;
	};
	tags?: Array<{
		name?: string;
		tag_bg?: string;
		tag_fg?: string;
	}>;
	team_id?: string;
	time_spent?: number;
	url?: string;
	watchers?: Array<{
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	}>;
};

export type ClickUpV1TaskTagAddOutput = {
	success?: boolean;
};

export type ClickUpV1TimeEntryGetAllOutput = {
	approval_id?: null;
	at?: string;
	billable?: boolean;
	description?: string;
	duration?: string;
	end?: string;
	id?: string;
	is_locked?: boolean;
	source?: string;
	start?: string;
	tags?: Array<{
		creator?: number;
		name?: string;
		tag_bg?: string;
		tag_fg?: string;
	}>;
	task?: {
		id?: string;
		name?: string;
		status?: {
			color?: string;
			orderindex?: number;
			status?: string;
			type?: string;
		};
	};
	task_location?: {
		folder_id?: string;
		list_id?: string;
		space_id?: string;
	};
	task_url?: string;
	user?: {
		color?: string;
		email?: string;
		id?: number;
		initials?: string;
		username?: string;
	};
	wid?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ClickUpV1Credentials {
	clickUpApi: CredentialReference;
	clickUpOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ClickUpV1NodeBase {
	type: 'n8n-nodes-base.clickUp';
	version: 1;
	credentials?: ClickUpV1Credentials;
}

export type ClickUpV1ChecklistCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ChecklistCreateConfig>;
	output?: ClickUpV1ChecklistCreateOutput;
};

export type ClickUpV1ChecklistDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ChecklistDeleteConfig>;
};

export type ClickUpV1ChecklistUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ChecklistUpdateConfig>;
};

export type ClickUpV1ChecklistItemCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ChecklistItemCreateConfig>;
	output?: ClickUpV1ChecklistItemCreateOutput;
};

export type ClickUpV1ChecklistItemDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ChecklistItemDeleteConfig>;
};

export type ClickUpV1ChecklistItemUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ChecklistItemUpdateConfig>;
};

export type ClickUpV1CommentCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1CommentCreateConfig>;
	output?: ClickUpV1CommentCreateOutput;
};

export type ClickUpV1CommentDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1CommentDeleteConfig>;
};

export type ClickUpV1CommentGetAllNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1CommentGetAllConfig>;
	output?: ClickUpV1CommentGetAllOutput;
};

export type ClickUpV1CommentUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1CommentUpdateConfig>;
};

export type ClickUpV1FolderCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1FolderCreateConfig>;
	output?: ClickUpV1FolderCreateOutput;
};

export type ClickUpV1FolderDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1FolderDeleteConfig>;
};

export type ClickUpV1FolderGetNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1FolderGetConfig>;
	output?: ClickUpV1FolderGetOutput;
};

export type ClickUpV1FolderGetAllNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1FolderGetAllConfig>;
	output?: ClickUpV1FolderGetAllOutput;
};

export type ClickUpV1FolderUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1FolderUpdateConfig>;
};

export type ClickUpV1GoalCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1GoalCreateConfig>;
};

export type ClickUpV1GoalDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1GoalDeleteConfig>;
};

export type ClickUpV1GoalGetNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1GoalGetConfig>;
};

export type ClickUpV1GoalGetAllNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1GoalGetAllConfig>;
};

export type ClickUpV1GoalUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1GoalUpdateConfig>;
};

export type ClickUpV1GoalKeyResultCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1GoalKeyResultCreateConfig>;
};

export type ClickUpV1GoalKeyResultDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1GoalKeyResultDeleteConfig>;
};

export type ClickUpV1GoalKeyResultUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1GoalKeyResultUpdateConfig>;
};

export type ClickUpV1ListCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ListCreateConfig>;
	output?: ClickUpV1ListCreateOutput;
};

export type ClickUpV1ListCustomFieldsNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ListCustomFieldsConfig>;
	output?: ClickUpV1ListCustomFieldsOutput;
};

export type ClickUpV1ListDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ListDeleteConfig>;
};

export type ClickUpV1ListGetNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ListGetConfig>;
	output?: ClickUpV1ListGetOutput;
};

export type ClickUpV1ListGetAllNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ListGetAllConfig>;
	output?: ClickUpV1ListGetAllOutput;
};

export type ClickUpV1ListMemberNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ListMemberConfig>;
	output?: ClickUpV1ListMemberOutput;
};

export type ClickUpV1ListUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1ListUpdateConfig>;
};

export type ClickUpV1SpaceTagCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1SpaceTagCreateConfig>;
};

export type ClickUpV1SpaceTagDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1SpaceTagDeleteConfig>;
};

export type ClickUpV1SpaceTagGetAllNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1SpaceTagGetAllConfig>;
};

export type ClickUpV1SpaceTagUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1SpaceTagUpdateConfig>;
};

export type ClickUpV1TaskCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskCreateConfig>;
	output?: ClickUpV1TaskCreateOutput;
};

export type ClickUpV1TaskDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskDeleteConfig>;
	output?: ClickUpV1TaskDeleteOutput;
};

export type ClickUpV1TaskGetNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskGetConfig>;
	output?: ClickUpV1TaskGetOutput;
};

export type ClickUpV1TaskGetAllNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskGetAllConfig>;
	output?: ClickUpV1TaskGetAllOutput;
};

export type ClickUpV1TaskMemberNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskMemberConfig>;
};

export type ClickUpV1TaskSetCustomFieldNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskSetCustomFieldConfig>;
};

export type ClickUpV1TaskUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskUpdateConfig>;
	output?: ClickUpV1TaskUpdateOutput;
};

export type ClickUpV1TaskDependencyCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskDependencyCreateConfig>;
};

export type ClickUpV1TaskDependencyDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskDependencyDeleteConfig>;
};

export type ClickUpV1TaskListAddNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskListAddConfig>;
};

export type ClickUpV1TaskListRemoveNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskListRemoveConfig>;
};

export type ClickUpV1TaskTagAddNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskTagAddConfig>;
	output?: ClickUpV1TaskTagAddOutput;
};

export type ClickUpV1TaskTagRemoveNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TaskTagRemoveConfig>;
};

export type ClickUpV1TimeEntryCreateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryCreateConfig>;
};

export type ClickUpV1TimeEntryDeleteNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryDeleteConfig>;
};

export type ClickUpV1TimeEntryGetNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryGetConfig>;
};

export type ClickUpV1TimeEntryGetAllNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryGetAllConfig>;
	output?: ClickUpV1TimeEntryGetAllOutput;
};

export type ClickUpV1TimeEntryStartNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryStartConfig>;
};

export type ClickUpV1TimeEntryStopNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryStopConfig>;
};

export type ClickUpV1TimeEntryUpdateNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryUpdateConfig>;
};

export type ClickUpV1TimeEntryTagAddNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryTagAddConfig>;
};

export type ClickUpV1TimeEntryTagGetAllNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryTagGetAllConfig>;
};

export type ClickUpV1TimeEntryTagRemoveNode = ClickUpV1NodeBase & {
	config: NodeConfig<ClickUpV1TimeEntryTagRemoveConfig>;
};

export type ClickUpV1Node =
	| ClickUpV1ChecklistCreateNode
	| ClickUpV1ChecklistDeleteNode
	| ClickUpV1ChecklistUpdateNode
	| ClickUpV1ChecklistItemCreateNode
	| ClickUpV1ChecklistItemDeleteNode
	| ClickUpV1ChecklistItemUpdateNode
	| ClickUpV1CommentCreateNode
	| ClickUpV1CommentDeleteNode
	| ClickUpV1CommentGetAllNode
	| ClickUpV1CommentUpdateNode
	| ClickUpV1FolderCreateNode
	| ClickUpV1FolderDeleteNode
	| ClickUpV1FolderGetNode
	| ClickUpV1FolderGetAllNode
	| ClickUpV1FolderUpdateNode
	| ClickUpV1GoalCreateNode
	| ClickUpV1GoalDeleteNode
	| ClickUpV1GoalGetNode
	| ClickUpV1GoalGetAllNode
	| ClickUpV1GoalUpdateNode
	| ClickUpV1GoalKeyResultCreateNode
	| ClickUpV1GoalKeyResultDeleteNode
	| ClickUpV1GoalKeyResultUpdateNode
	| ClickUpV1ListCreateNode
	| ClickUpV1ListCustomFieldsNode
	| ClickUpV1ListDeleteNode
	| ClickUpV1ListGetNode
	| ClickUpV1ListGetAllNode
	| ClickUpV1ListMemberNode
	| ClickUpV1ListUpdateNode
	| ClickUpV1SpaceTagCreateNode
	| ClickUpV1SpaceTagDeleteNode
	| ClickUpV1SpaceTagGetAllNode
	| ClickUpV1SpaceTagUpdateNode
	| ClickUpV1TaskCreateNode
	| ClickUpV1TaskDeleteNode
	| ClickUpV1TaskGetNode
	| ClickUpV1TaskGetAllNode
	| ClickUpV1TaskMemberNode
	| ClickUpV1TaskSetCustomFieldNode
	| ClickUpV1TaskUpdateNode
	| ClickUpV1TaskDependencyCreateNode
	| ClickUpV1TaskDependencyDeleteNode
	| ClickUpV1TaskListAddNode
	| ClickUpV1TaskListRemoveNode
	| ClickUpV1TaskTagAddNode
	| ClickUpV1TaskTagRemoveNode
	| ClickUpV1TimeEntryCreateNode
	| ClickUpV1TimeEntryDeleteNode
	| ClickUpV1TimeEntryGetNode
	| ClickUpV1TimeEntryGetAllNode
	| ClickUpV1TimeEntryStartNode
	| ClickUpV1TimeEntryStopNode
	| ClickUpV1TimeEntryUpdateNode
	| ClickUpV1TimeEntryTagAddNode
	| ClickUpV1TimeEntryTagGetAllNode
	| ClickUpV1TimeEntryTagRemoveNode
	;