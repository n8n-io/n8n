/**
 * Clockify Node - Version 1
 * Consume Clockify REST API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a client */
export type ClockifyV1ClientCreateConfig = {
	resource: 'client';
	operation: 'create';
/**
 * Name of client being created
 * @displayOptions.show { resource: ["client"], operation: ["create"] }
 */
		name: string | Expression<string>;
};

/** Delete a client */
export type ClockifyV1ClientDeleteConfig = {
	resource: 'client';
	operation: 'delete';
	clientId?: string | Expression<string>;
};

/** Get a client */
export type ClockifyV1ClientGetConfig = {
	resource: 'client';
	operation: 'get';
	clientId?: string | Expression<string>;
};

/** Get many clients */
export type ClockifyV1ClientGetAllConfig = {
	resource: 'client';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["client"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["client"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1ClientUpdateConfig = {
	resource: 'client';
	operation: 'update';
	clientId?: string | Expression<string>;
	name: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type ClockifyV1ProjectCreateConfig = {
	resource: 'project';
	operation: 'create';
/**
 * Name of project being created
 * @displayOptions.show { resource: ["project"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type ClockifyV1ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
	projectId: string | Expression<string>;
};

/** Get a client */
export type ClockifyV1ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
	projectId: string | Expression<string>;
};

/** Get many clients */
export type ClockifyV1ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
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
	additionalFields?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1ProjectUpdateConfig = {
	resource: 'project';
	operation: 'update';
	projectId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type ClockifyV1TagCreateConfig = {
	resource: 'tag';
	operation: 'create';
/**
 * Name of tag being created
 * @displayOptions.show { resource: ["tag"], operation: ["create"] }
 */
		name: string | Expression<string>;
};

/** Delete a client */
export type ClockifyV1TagDeleteConfig = {
	resource: 'tag';
	operation: 'delete';
	tagId: string | Expression<string>;
};

/** Get many clients */
export type ClockifyV1TagGetAllConfig = {
	resource: 'tag';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["tag"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["tag"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1TagUpdateConfig = {
	resource: 'tag';
	operation: 'update';
	tagId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type ClockifyV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * Name of task to create
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type ClockifyV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * ID of task to delete
 * @displayOptions.show { resource: ["task"], operation: ["delete"] }
 */
		taskId: string | Expression<string>;
};

/** Get a client */
export type ClockifyV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * ID of task to get
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 */
		taskId: string | Expression<string>;
};

/** Get many clients */
export type ClockifyV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
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
	filters?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["task"] }
 */
		projectId: string | Expression<string>;
/**
 * ID of task to update
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
 */
		taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type ClockifyV1TimeEntryCreateConfig = {
	resource: 'timeEntry';
	operation: 'create';
	start: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type ClockifyV1TimeEntryDeleteConfig = {
	resource: 'timeEntry';
	operation: 'delete';
	timeEntryId: string | Expression<string>;
};

/** Get a client */
export type ClockifyV1TimeEntryGetConfig = {
	resource: 'timeEntry';
	operation: 'get';
	timeEntryId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Update a client */
export type ClockifyV1TimeEntryUpdateConfig = {
	resource: 'timeEntry';
	operation: 'update';
	timeEntryId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Get many clients */
export type ClockifyV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["user"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["user"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
};

/** Get many clients */
export type ClockifyV1WorkspaceGetAllConfig = {
	resource: 'workspace';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["workspace"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["workspace"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

export type ClockifyV1Params =
	| ClockifyV1ClientCreateConfig
	| ClockifyV1ClientDeleteConfig
	| ClockifyV1ClientGetConfig
	| ClockifyV1ClientGetAllConfig
	| ClockifyV1ClientUpdateConfig
	| ClockifyV1ProjectCreateConfig
	| ClockifyV1ProjectDeleteConfig
	| ClockifyV1ProjectGetConfig
	| ClockifyV1ProjectGetAllConfig
	| ClockifyV1ProjectUpdateConfig
	| ClockifyV1TagCreateConfig
	| ClockifyV1TagDeleteConfig
	| ClockifyV1TagGetAllConfig
	| ClockifyV1TagUpdateConfig
	| ClockifyV1TaskCreateConfig
	| ClockifyV1TaskDeleteConfig
	| ClockifyV1TaskGetConfig
	| ClockifyV1TaskGetAllConfig
	| ClockifyV1TaskUpdateConfig
	| ClockifyV1TimeEntryCreateConfig
	| ClockifyV1TimeEntryDeleteConfig
	| ClockifyV1TimeEntryGetConfig
	| ClockifyV1TimeEntryUpdateConfig
	| ClockifyV1UserGetAllConfig
	| ClockifyV1WorkspaceGetAllConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type ClockifyV1ClientGetAllOutput = {
	archived?: boolean;
	currencyCode?: string;
	currencyId?: string;
	id?: string;
	name?: string;
	workspaceId?: string;
};

export type ClockifyV1ProjectGetOutput = {
	archived?: boolean;
	billable?: boolean;
	clientId?: string;
	clientName?: string;
	color?: string;
	costRate?: null;
	duration?: string;
	estimate?: {
		estimate?: string;
		type?: string;
	};
	hourlyRate?: {
		amount?: number;
		currency?: string;
	};
	id?: string;
	memberships?: Array<{
		costRate?: null;
		membershipStatus?: string;
		membershipType?: string;
		targetId?: string;
		userId?: string;
	}>;
	name?: string;
	public?: boolean;
	template?: boolean;
	timeEstimate?: {
		active?: boolean;
		estimate?: string;
		includeNonBillable?: boolean;
		type?: string;
	};
	workspaceId?: string;
};

export type ClockifyV1ProjectGetAllOutput = {
	archived?: boolean;
	billable?: boolean;
	clientId?: string;
	clientName?: string;
	color?: string;
	estimate?: {
		estimate?: string;
		type?: string;
	};
	estimateReset?: null;
	hourlyRate?: {
		amount?: number;
		currency?: string;
	};
	id?: string;
	memberships?: Array<{
		costRate?: null;
		hourlyRate?: null;
		membershipStatus?: string;
		membershipType?: string;
		targetId?: string;
		userId?: string;
	}>;
	name?: string;
	note?: string;
	public?: boolean;
	template?: boolean;
	timeEstimate?: {
		active?: boolean;
		estimate?: string;
		includeNonBillable?: boolean;
		resetOption?: null;
		type?: string;
	};
	workspaceId?: string;
};

export type ClockifyV1TimeEntryCreateOutput = {
	billable?: boolean;
	customFieldValues?: Array<{
		customFieldId?: string;
		name?: string;
		timeEntryId?: string;
		type?: string;
		value?: null;
	}>;
	id?: string;
	isLocked?: boolean;
	kioskId?: null;
	timeInterval?: {
		start?: string;
	};
	type?: string;
	userId?: string;
	workspaceId?: string;
};

export type ClockifyV1UserGetAllOutput = {
	activeWorkspace?: string;
	customFields?: Array<{
		customFieldId?: string;
		customFieldName?: string;
		customFieldType?: string;
		userId?: string;
	}>;
	defaultWorkspace?: string;
	email?: string;
	id?: string;
	settings?: {
		alerts?: boolean;
		approval?: boolean;
		collapseAllProjectLists?: boolean;
		dashboardPinToTop?: boolean;
		dashboardSelection?: string;
		dashboardViewType?: string;
		dateFormat?: string;
		groupSimilarEntriesDisabled?: boolean;
		isCompactViewOn?: boolean;
		lang?: string;
		longRunning?: boolean;
		multiFactorEnabled?: boolean;
		myStartOfDay?: string;
		onboarding?: boolean;
		projectPickerTaskFilter?: boolean;
		pto?: boolean;
		reminders?: boolean;
		scheduledReports?: boolean;
		scheduling?: boolean;
		sendNewsletter?: boolean;
		showOnlyWorkingDays?: boolean;
		summaryReportSettings?: {
			group?: string;
			subgroup?: string;
		};
		theme?: string;
		timeFormat?: string;
		timeTrackingManual?: boolean;
		timeZone?: string;
		weeklyUpdates?: boolean;
		weekStart?: string;
	};
	status?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ClockifyV1Credentials {
	clockifyApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ClockifyV1NodeBase {
	type: 'n8n-nodes-base.clockify';
	version: 1;
	credentials?: ClockifyV1Credentials;
}

export type ClockifyV1ClientCreateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ClientCreateConfig>;
};

export type ClockifyV1ClientDeleteNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ClientDeleteConfig>;
};

export type ClockifyV1ClientGetNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ClientGetConfig>;
};

export type ClockifyV1ClientGetAllNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ClientGetAllConfig>;
	output?: ClockifyV1ClientGetAllOutput;
};

export type ClockifyV1ClientUpdateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ClientUpdateConfig>;
};

export type ClockifyV1ProjectCreateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ProjectCreateConfig>;
};

export type ClockifyV1ProjectDeleteNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ProjectDeleteConfig>;
};

export type ClockifyV1ProjectGetNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ProjectGetConfig>;
	output?: ClockifyV1ProjectGetOutput;
};

export type ClockifyV1ProjectGetAllNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ProjectGetAllConfig>;
	output?: ClockifyV1ProjectGetAllOutput;
};

export type ClockifyV1ProjectUpdateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1ProjectUpdateConfig>;
};

export type ClockifyV1TagCreateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TagCreateConfig>;
};

export type ClockifyV1TagDeleteNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TagDeleteConfig>;
};

export type ClockifyV1TagGetAllNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TagGetAllConfig>;
};

export type ClockifyV1TagUpdateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TagUpdateConfig>;
};

export type ClockifyV1TaskCreateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TaskCreateConfig>;
};

export type ClockifyV1TaskDeleteNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TaskDeleteConfig>;
};

export type ClockifyV1TaskGetNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TaskGetConfig>;
};

export type ClockifyV1TaskGetAllNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TaskGetAllConfig>;
};

export type ClockifyV1TaskUpdateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TaskUpdateConfig>;
};

export type ClockifyV1TimeEntryCreateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TimeEntryCreateConfig>;
	output?: ClockifyV1TimeEntryCreateOutput;
};

export type ClockifyV1TimeEntryDeleteNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TimeEntryDeleteConfig>;
};

export type ClockifyV1TimeEntryGetNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TimeEntryGetConfig>;
};

export type ClockifyV1TimeEntryUpdateNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1TimeEntryUpdateConfig>;
};

export type ClockifyV1UserGetAllNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1UserGetAllConfig>;
	output?: ClockifyV1UserGetAllOutput;
};

export type ClockifyV1WorkspaceGetAllNode = ClockifyV1NodeBase & {
	config: NodeConfig<ClockifyV1WorkspaceGetAllConfig>;
};

export type ClockifyV1Node =
	| ClockifyV1ClientCreateNode
	| ClockifyV1ClientDeleteNode
	| ClockifyV1ClientGetNode
	| ClockifyV1ClientGetAllNode
	| ClockifyV1ClientUpdateNode
	| ClockifyV1ProjectCreateNode
	| ClockifyV1ProjectDeleteNode
	| ClockifyV1ProjectGetNode
	| ClockifyV1ProjectGetAllNode
	| ClockifyV1ProjectUpdateNode
	| ClockifyV1TagCreateNode
	| ClockifyV1TagDeleteNode
	| ClockifyV1TagGetAllNode
	| ClockifyV1TagUpdateNode
	| ClockifyV1TaskCreateNode
	| ClockifyV1TaskDeleteNode
	| ClockifyV1TaskGetNode
	| ClockifyV1TaskGetAllNode
	| ClockifyV1TaskUpdateNode
	| ClockifyV1TimeEntryCreateNode
	| ClockifyV1TimeEntryDeleteNode
	| ClockifyV1TimeEntryGetNode
	| ClockifyV1TimeEntryUpdateNode
	| ClockifyV1UserGetAllNode
	| ClockifyV1WorkspaceGetAllNode
	;