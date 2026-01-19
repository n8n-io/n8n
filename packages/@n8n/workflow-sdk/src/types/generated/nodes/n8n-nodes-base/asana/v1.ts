/**
 * Asana Node - Version 1
 * Consume Asana REST API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a subtask */
export type AsanaV1ProjectCreateConfig = {
	resource: 'project';
	operation: 'create';
/**
 * The name of the project to create
 * @displayOptions.show { operation: ["create"], resource: ["project"] }
 */
		name: string | Expression<string>;
/**
 * The workspace to create the project in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["project"] }
 */
		workspace: string | Expression<string>;
/**
 * The team this project will be assigned to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["project"] }
 */
		team?: string | Expression<string>;
/**
 * Other properties to set
 * @displayOptions.show { resource: ["project"], operation: ["create"] }
 * @default {}
 */
		additionalFields?: Record<string, unknown>;
};

/** Delete a task */
export type AsanaV1ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
	id: string | Expression<string>;
};

/** Get a task */
export type AsanaV1ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
	id: string | Expression<string>;
};

/** Get many subtasks */
export type AsanaV1ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
/**
 * The workspace in which to get users. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["project"] }
 */
		workspace: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["project"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["project"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Other properties to set
 * @displayOptions.show { resource: ["project"], operation: ["getAll"] }
 * @default {}
 */
		additionalFields?: Record<string, unknown>;
};

/** Update a task */
export type AsanaV1ProjectUpdateConfig = {
	resource: 'project';
	operation: 'update';
/**
 * The workspace in which to get users. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["update"], resource: ["project"] }
 */
		workspace: string | Expression<string>;
/**
 * The ID of the project to update the data of
 * @displayOptions.show { operation: ["update"], resource: ["project"] }
 */
		id: string | Expression<string>;
/**
 * Other properties to set
 * @displayOptions.show { resource: ["project"], operation: ["update"] }
 * @default {}
 */
		updateFields?: Record<string, unknown>;
};

/** Create a subtask */
export type AsanaV1SubtaskCreateConfig = {
	resource: 'subtask';
	operation: 'create';
/**
 * The task to operate on
 * @displayOptions.show { operation: ["create"], resource: ["subtask"] }
 */
		taskId: string | Expression<string>;
/**
 * The name of the subtask to create
 * @displayOptions.show { operation: ["create"], resource: ["subtask"] }
 */
		name: string | Expression<string>;
	otherProperties?: Record<string, unknown>;
};

/** Get many subtasks */
export type AsanaV1SubtaskGetAllConfig = {
	resource: 'subtask';
	operation: 'getAll';
/**
 * The task to operate on
 * @displayOptions.show { operation: ["getAll"], resource: ["subtask"] }
 */
		taskId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["subtask"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["subtask"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Create a subtask */
export type AsanaV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * The workspace to create the task in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		workspace: string | Expression<string>;
/**
 * The name of the task to create
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
 */
		name: string | Expression<string>;
	otherProperties?: Record<string, unknown>;
};

/** Delete a task */
export type AsanaV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
/**
 * The ID of the task to delete
 * @displayOptions.show { operation: ["delete"], resource: ["task"] }
 */
		id: string | Expression<string>;
};

/** Get a task */
export type AsanaV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * The ID of the task to get the data of
 * @displayOptions.show { operation: ["get"], resource: ["task"] }
 */
		id: string | Expression<string>;
};

/** Get many subtasks */
export type AsanaV1TaskGetAllConfig = {
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
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * Properties to search for
 * @displayOptions.show { operation: ["getAll"], resource: ["task"] }
 * @default {}
 */
		filters?: Record<string, unknown>;
};

/** Move a task */
export type AsanaV1TaskMoveConfig = {
	resource: 'task';
	operation: 'move';
/**
 * The ID of the task to be moved
 * @displayOptions.show { operation: ["move"], resource: ["task"] }
 */
		id: string | Expression<string>;
/**
 * Project to show the sections of. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["move"], resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * The Section to move the task to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["move"], resource: ["task"] }
 */
		section: string | Expression<string>;
};

/** Search for tasks */
export type AsanaV1TaskSearchConfig = {
	resource: 'task';
	operation: 'search';
/**
 * The workspace in which the task is searched. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["search"], resource: ["task"] }
 */
		workspace: string | Expression<string>;
/**
 * Properties to search for
 * @displayOptions.show { operation: ["search"], resource: ["task"] }
 * @default {}
 */
		searchTaskProperties?: Record<string, unknown>;
};

/** Update a task */
export type AsanaV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * The ID of the task to update the data of
 * @displayOptions.show { operation: ["update"], resource: ["task"] }
 */
		id: string | Expression<string>;
	otherProperties?: Record<string, unknown>;
};

/** Add a comment to a task */
export type AsanaV1TaskCommentAddConfig = {
	resource: 'taskComment';
	operation: 'add';
/**
 * The ID of the task to add the comment to
 * @displayOptions.show { operation: ["add"], resource: ["taskComment"] }
 */
		id: string | Expression<string>;
/**
 * Whether body is HTML or simple text
 * @displayOptions.show { operation: ["add"], resource: ["taskComment"] }
 * @default false
 */
		isTextHtml?: boolean | Expression<boolean>;
/**
 * The plain text of the comment to add
 * @displayOptions.show { operation: ["add"], resource: ["taskComment"], isTextHtml: [false] }
 */
		text: string | Expression<string>;
/**
 * Properties of the task comment
 * @displayOptions.show { operation: ["add"], resource: ["taskComment"] }
 * @default {}
 */
		additionalFields?: Record<string, unknown>;
};

/** Remove a comment from a task */
export type AsanaV1TaskCommentRemoveConfig = {
	resource: 'taskComment';
	operation: 'remove';
/**
 * The ID of the comment to be removed
 * @displayOptions.show { operation: ["remove"], resource: ["taskComment"] }
 */
		id: string | Expression<string>;
};

/** Add a comment to a task */
export type AsanaV1TaskProjectAddConfig = {
	resource: 'taskProject';
	operation: 'add';
/**
 * The ID of the task to add the project to
 * @displayOptions.show { operation: ["add"], resource: ["taskProject"] }
 */
		id: string | Expression<string>;
/**
 * The project where the task will be added. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["add"], resource: ["taskProject"] }
 */
		project: string | Expression<string>;
/**
 * Other properties to set
 * @displayOptions.show { resource: ["taskProject"], operation: ["add"] }
 * @default {}
 */
		additionalFields?: Record<string, unknown>;
};

/** Remove a comment from a task */
export type AsanaV1TaskProjectRemoveConfig = {
	resource: 'taskProject';
	operation: 'remove';
/**
 * The ID of the task to add the project to
 * @displayOptions.show { operation: ["remove"], resource: ["taskProject"] }
 */
		id: string | Expression<string>;
/**
 * The project where the task will be removed from. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["remove"], resource: ["taskProject"] }
 */
		project: string | Expression<string>;
};

/** Add a comment to a task */
export type AsanaV1TaskTagAddConfig = {
	resource: 'taskTag';
	operation: 'add';
/**
 * The ID of the task to add the tag to
 * @displayOptions.show { operation: ["add"], resource: ["taskTag"] }
 */
		id: string | Expression<string>;
/**
 * The tag that should be added. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["add"], resource: ["taskTag"] }
 */
		tag: string | Expression<string>;
};

/** Remove a comment from a task */
export type AsanaV1TaskTagRemoveConfig = {
	resource: 'taskTag';
	operation: 'remove';
/**
 * The ID of the task to add the tag to
 * @displayOptions.show { operation: ["remove"], resource: ["taskTag"] }
 */
		id: string | Expression<string>;
/**
 * The tag that should be added. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["remove"], resource: ["taskTag"] }
 */
		tag: string | Expression<string>;
};

/** Get a task */
export type AsanaV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * An identifier for the user to get data of. Can be one of an email address,the globally unique identifier for the user, or the keyword me to indicate the current user making the request.
 * @displayOptions.show { operation: ["get"], resource: ["user"] }
 */
		userId: string | Expression<string>;
};

/** Get many subtasks */
export type AsanaV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * The workspace in which to get users. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { operation: ["getAll"], resource: ["user"] }
 */
		workspace: string | Expression<string>;
};

export type AsanaV1Params =
	| AsanaV1ProjectCreateConfig
	| AsanaV1ProjectDeleteConfig
	| AsanaV1ProjectGetConfig
	| AsanaV1ProjectGetAllConfig
	| AsanaV1ProjectUpdateConfig
	| AsanaV1SubtaskCreateConfig
	| AsanaV1SubtaskGetAllConfig
	| AsanaV1TaskCreateConfig
	| AsanaV1TaskDeleteConfig
	| AsanaV1TaskGetConfig
	| AsanaV1TaskGetAllConfig
	| AsanaV1TaskMoveConfig
	| AsanaV1TaskSearchConfig
	| AsanaV1TaskUpdateConfig
	| AsanaV1TaskCommentAddConfig
	| AsanaV1TaskCommentRemoveConfig
	| AsanaV1TaskProjectAddConfig
	| AsanaV1TaskProjectRemoveConfig
	| AsanaV1TaskTagAddConfig
	| AsanaV1TaskTagRemoveConfig
	| AsanaV1UserGetConfig
	| AsanaV1UserGetAllConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type AsanaV1ProjectCreateOutput = {
	archived?: boolean;
	completed?: boolean;
	completed_at?: null;
	completed_by?: null;
	created_at?: string;
	current_status?: null;
	current_status_update?: null;
	default_access_level?: string;
	default_view?: string;
	followers?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	gid?: string;
	icon?: string;
	members?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	minimum_access_level_for_customization?: string;
	minimum_access_level_for_sharing?: string;
	modified_at?: string;
	name?: string;
	notes?: string;
	owner?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
	permalink_url?: string;
	privacy_setting?: string;
	public?: boolean;
	resource_type?: string;
	start_on?: null;
	team?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
	workspace?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
};

export type AsanaV1ProjectGetOutput = {
	gid: string;
	archived: boolean;
	completed: boolean;
	completed_at: null;
	created_at: string;
	custom_fields: Array<{
		gid: string;
		enabled: boolean;
		enum_options?: Array<{
			gid: string;
			color: string;
			enabled: boolean;
			name: string;
			resource_type: string;
		}>;
		name: string;
		description: string;
		created_by: {
			gid: string;
			name: string;
			resource_type: string;
		};
		resource_subtype: string;
		resource_type: string;
		is_formula_field: boolean;
		is_value_read_only: boolean;
		type: string;
	}>;
	custom_field_settings?: Array<{
		gid: string;
		custom_field: {
			gid: string;
			enum_options?: Array<{
				gid: string;
				color: string;
				enabled: boolean;
				name: string;
				resource_type: string;
			}>;
			name: string;
			resource_subtype: string;
			resource_type: string;
			type: string;
			privacy_setting?: string;
			default_access_level?: string;
			is_formula_field: boolean;
			precision?: number;
		};
		is_important: boolean;
		parent: {
			gid: string;
			name: string;
			resource_type: string;
		};
		project: {
			gid: string;
			name: string;
			resource_type: string;
		};
		resource_type: string;
	}>;
	default_access_level: string;
	default_view: string;
	followers: Array<{
		gid: string;
		name: string;
		resource_type: string;
	}>;
	members: Array<{
		gid: string;
		name: string;
		resource_type: string;
	}>;
	minimum_access_level_for_customization: string;
	minimum_access_level_for_sharing: string;
	modified_at: string;
	name: string;
	notes: string;
	owner: {
		gid: string;
		name: string;
		resource_type: string;
	};
	permalink_url: string;
	privacy_setting: string;
	public: boolean;
	resource_type: string;
	team: {
		gid: string;
		name: string;
		resource_type: string;
	};
	workspace: {
		gid: string;
		name: string;
		resource_type: string;
	};
};

export type AsanaV1ProjectGetAllOutput = {
	gid?: string;
	name?: string;
	resource_type?: string;
};

export type AsanaV1SubtaskCreateOutput = {
	actual_time_minutes?: number;
	assignee_status?: string;
	completed?: boolean;
	created_at?: string;
	custom_fields?: Array<{
		created_by?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
		enabled?: boolean;
		enum_options?: Array<{
			color?: string;
			enabled?: boolean;
			gid?: string;
			name?: string;
			resource_type?: string;
		}>;
		enum_value?: null;
		gid?: string;
		is_formula_field?: boolean;
		name?: string;
		number_value?: null;
		precision?: number;
		resource_subtype?: string;
		resource_type?: string;
		type?: string;
	}>;
	due_at?: null;
	followers?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	gid?: string;
	hearted?: boolean;
	liked?: boolean;
	modified_at?: string;
	name?: string;
	notes?: string;
	num_hearts?: number;
	num_likes?: number;
	parent?: {
		gid?: string;
		name?: string;
		resource_subtype?: string;
		resource_type?: string;
	};
	permalink_url?: string;
	resource_subtype?: string;
	resource_type?: string;
	start_at?: null;
	start_on?: null;
	workspace?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
};

export type AsanaV1SubtaskGetAllOutput = {
	gid?: string;
	name?: string;
	resource_subtype?: string;
	resource_type?: string;
};

export type AsanaV1TaskCreateOutput = {
	actual_time_minutes?: number;
	assignee_status?: string;
	completed?: boolean;
	created_at?: string;
	custom_fields?: Array<{
		created_by?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
		enabled?: boolean;
		enum_options?: Array<{
			color?: string;
			enabled?: boolean;
			gid?: string;
			name?: string;
			resource_type?: string;
		}>;
		enum_value?: null;
		gid?: string;
		is_formula_field?: boolean;
		name?: string;
		resource_subtype?: string;
		resource_type?: string;
		type?: string;
	}>;
	due_at?: null;
	followers?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	gid?: string;
	hearted?: boolean;
	hearts?: Array<{
		gid?: string;
		resource_type?: string;
		user?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
	}>;
	liked?: boolean;
	likes?: Array<{
		gid?: string;
		resource_type?: string;
		user?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
	}>;
	memberships?: Array<{
		project?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
		section?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
	}>;
	modified_at?: string;
	name?: string;
	notes?: string;
	num_hearts?: number;
	num_likes?: number;
	parent?: null;
	permalink_url?: string;
	projects?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	resource_subtype?: string;
	resource_type?: string;
	start_at?: null;
	start_on?: null;
	workspace?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
};

export type AsanaV1TaskGetOutput = {
	assignee?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
	assignee_status?: string;
	completed?: boolean;
	created_at?: string;
	custom_fields?: Array<{
		description?: string;
		enabled?: boolean;
		enum_options?: Array<{
			color?: string;
			enabled?: boolean;
			gid?: string;
			name?: string;
			resource_type?: string;
		}>;
		gid?: string;
		is_formula_field?: boolean;
		is_value_read_only?: boolean;
		multi_enum_values?: Array<{
			color?: string;
			enabled?: boolean;
			gid?: string;
			name?: string;
			resource_type?: string;
		}>;
		name?: string;
		precision?: number;
		resource_subtype?: string;
		resource_type?: string;
		type?: string;
	}>;
	due_at?: null;
	followers?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	gid?: string;
	hearted?: boolean;
	liked?: boolean;
	memberships?: Array<{
		project?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
		section?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
	}>;
	modified_at?: string;
	name?: string;
	notes?: string;
	num_hearts?: number;
	num_likes?: number;
	permalink_url?: string;
	projects?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	resource_subtype?: string;
	resource_type?: string;
	start_at?: null;
	tags?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	workspace?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
};

export type AsanaV1TaskGetAllOutput = {
	gid?: string;
	name?: string;
	resource_subtype?: string;
	resource_type?: string;
};

export type AsanaV1TaskMoveOutput = {
	success?: boolean;
};

export type AsanaV1TaskSearchOutput = {
	gid?: string;
	name?: string;
	resource_subtype?: string;
	resource_type?: string;
};

export type AsanaV1TaskUpdateOutput = {
	actual_time_minutes?: number;
	assignee?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
	assignee_status?: string;
	completed?: boolean;
	created_at?: string;
	custom_fields?: Array<{
		created_by?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
		enabled?: boolean;
		enum_options?: Array<{
			color?: string;
			enabled?: boolean;
			gid?: string;
			name?: string;
			resource_type?: string;
		}>;
		gid?: string;
		name?: string;
		precision?: number;
		resource_subtype?: string;
		resource_type?: string;
		type?: string;
	}>;
	due_at?: null;
	followers?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	gid?: string;
	hearted?: boolean;
	liked?: boolean;
	memberships?: Array<{
		project?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
		section?: {
			gid?: string;
			name?: string;
			resource_type?: string;
		};
	}>;
	modified_at?: string;
	name?: string;
	notes?: string;
	num_hearts?: number;
	num_likes?: number;
	permalink_url?: string;
	projects?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	resource_subtype?: string;
	resource_type?: string;
	start_at?: null;
	tags?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
	workspace?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
};

export type AsanaV1TaskCommentAddOutput = {
	created_at?: string;
	created_by?: {
		gid?: string;
		name?: string;
		resource_type?: string;
	};
	gid?: string;
	hearted?: boolean;
	is_editable?: boolean;
	is_edited?: boolean;
	is_pinned?: boolean;
	liked?: boolean;
	num_hearts?: number;
	num_likes?: number;
	resource_subtype?: string;
	resource_type?: string;
	source?: string;
	target?: {
		gid?: string;
		name?: string;
		resource_subtype?: string;
		resource_type?: string;
	};
	text?: string;
	type?: string;
};

export type AsanaV1TaskProjectAddOutput = {
	success?: boolean;
};

export type AsanaV1UserGetOutput = {
	email?: string;
	gid?: string;
	name?: string;
	resource_type?: string;
	workspaces?: Array<{
		gid?: string;
		name?: string;
		resource_type?: string;
	}>;
};

export type AsanaV1UserGetAllOutput = {
	gid?: string;
	name?: string;
	resource_type?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface AsanaV1Credentials {
	asanaApi: CredentialReference;
	asanaOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AsanaV1NodeBase {
	type: 'n8n-nodes-base.asana';
	version: 1;
	credentials?: AsanaV1Credentials;
}

export type AsanaV1ProjectCreateNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1ProjectCreateConfig>;
	output?: AsanaV1ProjectCreateOutput;
};

export type AsanaV1ProjectDeleteNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1ProjectDeleteConfig>;
};

export type AsanaV1ProjectGetNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1ProjectGetConfig>;
	output?: AsanaV1ProjectGetOutput;
};

export type AsanaV1ProjectGetAllNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1ProjectGetAllConfig>;
	output?: AsanaV1ProjectGetAllOutput;
};

export type AsanaV1ProjectUpdateNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1ProjectUpdateConfig>;
};

export type AsanaV1SubtaskCreateNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1SubtaskCreateConfig>;
	output?: AsanaV1SubtaskCreateOutput;
};

export type AsanaV1SubtaskGetAllNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1SubtaskGetAllConfig>;
	output?: AsanaV1SubtaskGetAllOutput;
};

export type AsanaV1TaskCreateNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskCreateConfig>;
	output?: AsanaV1TaskCreateOutput;
};

export type AsanaV1TaskDeleteNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskDeleteConfig>;
};

export type AsanaV1TaskGetNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskGetConfig>;
	output?: AsanaV1TaskGetOutput;
};

export type AsanaV1TaskGetAllNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskGetAllConfig>;
	output?: AsanaV1TaskGetAllOutput;
};

export type AsanaV1TaskMoveNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskMoveConfig>;
	output?: AsanaV1TaskMoveOutput;
};

export type AsanaV1TaskSearchNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskSearchConfig>;
	output?: AsanaV1TaskSearchOutput;
};

export type AsanaV1TaskUpdateNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskUpdateConfig>;
	output?: AsanaV1TaskUpdateOutput;
};

export type AsanaV1TaskCommentAddNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskCommentAddConfig>;
	output?: AsanaV1TaskCommentAddOutput;
};

export type AsanaV1TaskCommentRemoveNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskCommentRemoveConfig>;
};

export type AsanaV1TaskProjectAddNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskProjectAddConfig>;
	output?: AsanaV1TaskProjectAddOutput;
};

export type AsanaV1TaskProjectRemoveNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskProjectRemoveConfig>;
};

export type AsanaV1TaskTagAddNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskTagAddConfig>;
};

export type AsanaV1TaskTagRemoveNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1TaskTagRemoveConfig>;
};

export type AsanaV1UserGetNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1UserGetConfig>;
	output?: AsanaV1UserGetOutput;
};

export type AsanaV1UserGetAllNode = AsanaV1NodeBase & {
	config: NodeConfig<AsanaV1UserGetAllConfig>;
	output?: AsanaV1UserGetAllOutput;
};

export type AsanaV1Node =
	| AsanaV1ProjectCreateNode
	| AsanaV1ProjectDeleteNode
	| AsanaV1ProjectGetNode
	| AsanaV1ProjectGetAllNode
	| AsanaV1ProjectUpdateNode
	| AsanaV1SubtaskCreateNode
	| AsanaV1SubtaskGetAllNode
	| AsanaV1TaskCreateNode
	| AsanaV1TaskDeleteNode
	| AsanaV1TaskGetNode
	| AsanaV1TaskGetAllNode
	| AsanaV1TaskMoveNode
	| AsanaV1TaskSearchNode
	| AsanaV1TaskUpdateNode
	| AsanaV1TaskCommentAddNode
	| AsanaV1TaskCommentRemoveNode
	| AsanaV1TaskProjectAddNode
	| AsanaV1TaskProjectRemoveNode
	| AsanaV1TaskTagAddNode
	| AsanaV1TaskTagRemoveNode
	| AsanaV1UserGetNode
	| AsanaV1UserGetAllNode
	;