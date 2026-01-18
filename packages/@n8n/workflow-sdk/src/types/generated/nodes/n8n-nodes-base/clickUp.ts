/**
 * ClickUp Node Types
 *
 * Consume ClickUp API (Beta)
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/clickup/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	folder: string | Expression<string>;
};

/** Get a folder */
export type ClickUpV1FolderGetConfig = {
	resource: 'folder';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	folder: string | Expression<string>;
};

/** Get many comments */
export type ClickUpV1FolderGetAllConfig = {
	resource: 'folder';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	/**
	 * Max number of results to return
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	team: string | Expression<string>;
	/**
	 * Max number of results to return
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	folder: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	list: string | Expression<string>;
};

/** Delete a checklist */
export type ClickUpV1ListDeleteConfig = {
	resource: 'list';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	folder: string | Expression<string>;
	/**
	 * Max number of results to return
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
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	name: string | Expression<string>;
	/**
	 * New name to set for the tag
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	folder: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	list: string | Expression<string>;
	/**
	 * The first name on the task
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
	 * @default false
	 */
	includeSubtasks?: boolean | Expression<boolean>;
	/**
	 * Whether to include the markdown_description field in the response. This is important for preserving links in the description.
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	folder: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	list: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 * @default true
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	task: string | Expression<string>;
	/**
	 * The ID of the field to add custom field to
	 */
	field: string | Expression<string>;
	/**
	 * The value is JSON and will be parsed as such. Is needed if for example needed for labels which expects the value to be an array.
	 * @default false
	 */
	jsonParse?: boolean | Expression<boolean>;
	/**
	 * The value to set on custom field
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
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	folder: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	list: string | Expression<string>;
	start: string | Expression<string>;
	/**
	 * Duration in minutes
	 * @default 0
	 */
	duration: number | Expression<number>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	team: string | Expression<string>;
	/**
	 * Whether to return just the current running time entry
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
	 */
	team: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	team: string | Expression<string>;
};

/** Update a checklist */
export type ClickUpV1TimeEntryUpdateConfig = {
	resource: 'timeEntry';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	team: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	space: string | Expression<string>;
	folderless: boolean | Expression<boolean>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	folder: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
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
	 */
	team: string | Expression<string>;
	timeEntryIds: string | Expression<string>;
	tagsUi?: {
		tagsValues?: Array<{
			name?: string | Expression<string>;
			tag_bg?: string | Expression<string>;
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
	 */
	team: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	team: string | Expression<string>;
	timeEntryIds: string | Expression<string>;
	/**
	 * Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @default []
	 */
	tagNames: string[];
};

export type ClickUpV1Params =
	| ClickUpV1ChecklistCreateConfig
	| ClickUpV1ChecklistDeleteConfig
	| ClickUpV1ChecklistUpdateConfig
	| ClickUpV1ChecklistItemCreateConfig
	| ClickUpV1ChecklistItemDeleteConfig
	| ClickUpV1ChecklistItemUpdateConfig
	| ClickUpV1CommentCreateConfig
	| ClickUpV1CommentDeleteConfig
	| ClickUpV1CommentGetAllConfig
	| ClickUpV1CommentUpdateConfig
	| ClickUpV1FolderCreateConfig
	| ClickUpV1FolderDeleteConfig
	| ClickUpV1FolderGetConfig
	| ClickUpV1FolderGetAllConfig
	| ClickUpV1FolderUpdateConfig
	| ClickUpV1GoalCreateConfig
	| ClickUpV1GoalDeleteConfig
	| ClickUpV1GoalGetConfig
	| ClickUpV1GoalGetAllConfig
	| ClickUpV1GoalUpdateConfig
	| ClickUpV1GoalKeyResultCreateConfig
	| ClickUpV1GoalKeyResultDeleteConfig
	| ClickUpV1GoalKeyResultUpdateConfig
	| ClickUpV1ListCreateConfig
	| ClickUpV1ListCustomFieldsConfig
	| ClickUpV1ListDeleteConfig
	| ClickUpV1ListGetConfig
	| ClickUpV1ListGetAllConfig
	| ClickUpV1ListMemberConfig
	| ClickUpV1ListUpdateConfig
	| ClickUpV1SpaceTagCreateConfig
	| ClickUpV1SpaceTagDeleteConfig
	| ClickUpV1SpaceTagGetAllConfig
	| ClickUpV1SpaceTagUpdateConfig
	| ClickUpV1TaskCreateConfig
	| ClickUpV1TaskDeleteConfig
	| ClickUpV1TaskGetConfig
	| ClickUpV1TaskGetAllConfig
	| ClickUpV1TaskMemberConfig
	| ClickUpV1TaskSetCustomFieldConfig
	| ClickUpV1TaskUpdateConfig
	| ClickUpV1TaskDependencyCreateConfig
	| ClickUpV1TaskDependencyDeleteConfig
	| ClickUpV1TaskListAddConfig
	| ClickUpV1TaskListRemoveConfig
	| ClickUpV1TaskTagAddConfig
	| ClickUpV1TaskTagRemoveConfig
	| ClickUpV1TimeEntryCreateConfig
	| ClickUpV1TimeEntryDeleteConfig
	| ClickUpV1TimeEntryGetConfig
	| ClickUpV1TimeEntryGetAllConfig
	| ClickUpV1TimeEntryStartConfig
	| ClickUpV1TimeEntryStopConfig
	| ClickUpV1TimeEntryUpdateConfig
	| ClickUpV1TimeEntryTagAddConfig
	| ClickUpV1TimeEntryTagGetAllConfig
	| ClickUpV1TimeEntryTagRemoveConfig;

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

export type ClickUpV1Node = {
	type: 'n8n-nodes-base.clickUp';
	version: 1;
	config: NodeConfig<ClickUpV1Params>;
	credentials?: ClickUpV1Credentials;
};

export type ClickUpNode = ClickUpV1Node;
