/**
 * HighLevel Node - Version 2
 * Consume HighLevel API v2
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export type HighLevelV2ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
/**
 * Email or Phone are required to create contact
 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
 */
		email?: string | Expression<string>;
/**
 * Phone or Email are required to create contact. Phone number has to start with a valid &lt;a href="https://en.wikipedia.org/wiki/List_of_country_calling_codes"&gt;country code&lt;/a&gt; leading with + sign.
 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
 */
		phone?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	contactId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	contactId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2ContactGetAllConfig = {
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
	options?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityCreateConfig = {
	resource: 'opportunity';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["opportunity"], operation: ["create"] }
 */
		pipelineId?: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @hint There can only be one opportunity for each contact
 * @displayOptions.show { resource: ["opportunity"], operation: ["create"] }
 */
		contactId: string | Expression<string>;
	name: string | Expression<string>;
	status: 'open' | 'won' | 'lost' | 'abandoned' | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityDeleteConfig = {
	resource: 'opportunity';
	operation: 'delete';
	opportunityId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityGetConfig = {
	resource: 'opportunity';
	operation: 'get';
	opportunityId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityGetAllConfig = {
	resource: 'opportunity';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["opportunity"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["opportunity"], operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2OpportunityUpdateConfig = {
	resource: 'opportunity';
	operation: 'update';
	opportunityId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
/**
 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["create"] }
 */
		contactId: string | Expression<string>;
	title: string | Expression<string>;
	dueDate: string | Expression<string>;
	completed: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
/**
 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["delete"] }
 */
		contactId: string | Expression<string>;
	taskId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskGetConfig = {
	resource: 'task';
	operation: 'get';
/**
 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["get"] }
 */
		contactId: string | Expression<string>;
	taskId: string | Expression<string>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
/**
 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 */
		contactId: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
 * @default 20
 */
		limit?: number | Expression<number>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
/**
 * Contact the task belongs to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["task"], operation: ["update"] }
 */
		contactId: string | Expression<string>;
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2CalendarBookAppointmentConfig = {
	resource: 'calendar';
	operation: 'bookAppointment';
	calendarId: string | Expression<string>;
	locationId: string | Expression<string>;
	contactId: string | Expression<string>;
/**
 * Example: 2021-06-23T03:30:00+05:30
 * @displayOptions.show { resource: ["calendar"], operation: ["bookAppointment"] }
 */
		startTime: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2CalendarGetFreeSlotsConfig = {
	resource: 'calendar';
	operation: 'getFreeSlots';
	calendarId: string | Expression<string>;
/**
 * The start date for fetching free calendar slots. Example: 1548898600000.
 * @displayOptions.show { resource: ["calendar"], operation: ["getFreeSlots"] }
 */
		startDate: number | Expression<number>;
/**
 * The end date for fetching free calendar slots. Example: 1601490599999.
 * @displayOptions.show { resource: ["calendar"], operation: ["getFreeSlots"] }
 */
		endDate: number | Expression<number>;
	additionalFields?: Record<string, unknown>;
	requestOptions?: Record<string, unknown>;
};

export type HighLevelV2Params =
	| HighLevelV2ContactCreateConfig
	| HighLevelV2ContactDeleteConfig
	| HighLevelV2ContactGetConfig
	| HighLevelV2ContactGetAllConfig
	| HighLevelV2ContactUpdateConfig
	| HighLevelV2OpportunityCreateConfig
	| HighLevelV2OpportunityDeleteConfig
	| HighLevelV2OpportunityGetConfig
	| HighLevelV2OpportunityGetAllConfig
	| HighLevelV2OpportunityUpdateConfig
	| HighLevelV2TaskCreateConfig
	| HighLevelV2TaskDeleteConfig
	| HighLevelV2TaskGetConfig
	| HighLevelV2TaskGetAllConfig
	| HighLevelV2TaskUpdateConfig
	| HighLevelV2CalendarBookAppointmentConfig
	| HighLevelV2CalendarGetFreeSlotsConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type HighLevelV2ContactCreateOutput = {
	country?: string;
	createdBy?: {
		channel?: string;
		source?: string;
		sourceId?: string;
		timestamp?: string;
	};
	customFields?: Array<{
		id?: string;
	}>;
	dateAdded?: string;
	dateUpdated?: string;
	email?: string;
	emailLowerCase?: string;
	firstName?: string;
	firstNameLowerCase?: string;
	followers?: Array<string>;
	fullNameLowerCase?: string;
	id?: string;
	lastName?: string;
	lastNameLowerCase?: string;
	locationId?: string;
	tags?: Array<string>;
	type?: string;
};

export type HighLevelV2ContactGetOutput = {
	additionalPhones?: Array<{
		phone?: string;
		phoneLabel?: string;
	}>;
	attributionSource?: {
		medium?: string;
		sessionSource?: string;
	};
	country?: string;
	createdBy?: {
		channel?: string;
		source?: string;
		sourceId?: string;
		timestamp?: string;
	};
	customFields?: Array<{
		id?: string;
	}>;
	dateAdded?: string;
	dateUpdated?: string;
	email?: string;
	emailLowerCase?: string;
	firstName?: string;
	firstNameLowerCase?: string;
	fullNameLowerCase?: string;
	id?: string;
	lastName?: string;
	lastNameLowerCase?: string;
	locationId?: string;
	phone?: string;
	tags?: Array<string>;
	type?: string;
};

export type HighLevelV2ContactGetAllOutput = {
	attributions?: Array<{
		isFirst?: boolean;
		medium?: string;
		utmSessionSource?: string;
	}>;
	contactName?: string;
	customFields?: Array<{
		id?: string;
	}>;
	dateAdded?: string;
	dateUpdated?: string;
	dnd?: boolean;
	id?: string;
	locationId?: string;
	tags?: Array<string>;
};

export type HighLevelV2ContactUpdateOutput = {
	additionalPhones?: Array<{
		phone?: string;
	}>;
	country?: string;
	createdBy?: {
		channel?: string;
		source?: string;
		sourceId?: string;
		timestamp?: string;
	};
	customFields?: Array<{
		id?: string;
	}>;
	dateAdded?: string;
	dateUpdated?: string;
	email?: string;
	emailLowerCase?: string;
	firstName?: string;
	firstNameLowerCase?: string;
	followers?: Array<string>;
	fullNameLowerCase?: string;
	id?: string;
	lastName?: string;
	lastNameLowerCase?: string;
	locationId?: string;
	phone?: string;
	tags?: Array<string>;
	type?: string;
};

export type HighLevelV2OpportunityCreateOutput = {
	opportunity?: {
		contact?: {
			email?: string;
			followers?: Array<string>;
			id?: string;
			name?: string;
			phone?: string;
			tags?: Array<string>;
		};
		contactId?: string;
		createdAt?: string;
		followers?: Array<string>;
		id?: string;
		internalSource?: {
			apiVersion?: string;
			channel?: string;
			id?: string;
			source?: string;
			type?: string;
		};
		isAttribute?: boolean;
		lastActionDate?: string;
		lastStageChangeAt?: string;
		lastStatusChangeAt?: string;
		locationId?: string;
		monetaryValue?: number;
		name?: string;
		pipelineId?: string;
		pipelineStageId?: string;
		status?: string;
		updatedAt?: string;
	};
	traceId?: string;
};

export type HighLevelV2OpportunityGetOutput = {
	opportunity?: {
		contact?: {
			email?: string;
			followers?: Array<string>;
			id?: string;
			name?: string;
			phone?: string;
			tags?: Array<string>;
		};
		contactId?: string;
		createdAt?: string;
		followers?: Array<string>;
		id?: string;
		indexVersion?: number;
		internalSource?: {
			apiVersion?: string;
			channel?: string;
			id?: string;
			source?: string;
			type?: string;
		};
		isAttribute?: boolean;
		lastActionDate?: string;
		lastStageChangeAt?: string;
		lastStatusChangeAt?: string;
		locationId?: string;
		name?: string;
		pipelineId?: string;
		pipelineStageId?: string;
		status?: string;
		updatedAt?: string;
	};
	traceId?: string;
};

export type HighLevelV2OpportunityGetAllOutput = {
	attributions?: Array<{
		isFirst?: boolean;
		medium?: string;
		utmSessionSource?: string;
	}>;
	contact?: {
		id?: string;
		name?: string;
		tags?: Array<string>;
	};
	contactId?: string;
	createdAt?: string;
	customFields?: Array<{
		fieldValueString?: string;
		id?: string;
		type?: string;
	}>;
	followers?: Array<string>;
	id?: string;
	lastStageChangeAt?: string;
	lastStatusChangeAt?: string;
	locationId?: string;
	name?: string;
	pipelineId?: string;
	pipelineStageId?: string;
	pipelineStageUId?: string;
	relations?: Array<{
		associationId?: string;
		objectKey?: string;
		primary?: boolean;
		recordId?: string;
		relationId?: string;
		tags?: Array<string>;
	}>;
	status?: string;
	updatedAt?: string;
};

export type HighLevelV2OpportunityUpdateOutput = {
	opportunity?: {
		contact?: {
			email?: string;
			id?: string;
			name?: string;
			phone?: string;
			tags?: Array<string>;
		};
		contactId?: string;
		createdAt?: string;
		followers?: Array<string>;
		id?: string;
		indexVersion?: number;
		internalSource?: {
			apiVersion?: string;
			channel?: string;
			id?: string;
			source?: string;
			type?: string;
		};
		isAttribute?: boolean;
		lastActionDate?: string;
		lastStageChangeAt?: string;
		lastStatusChangeAt?: string;
		locationId?: string;
		monetaryValue?: number;
		name?: string;
		pipelineId?: string;
		pipelineStageId?: string;
		source?: string;
		status?: string;
		updatedAt?: string;
	};
	traceId?: string;
};

export type HighLevelV2TaskCreateOutput = {
	contactId?: string;
	task?: {
		businessId?: string;
		completed?: boolean;
		contactId?: string;
		dueDate?: string;
		id?: string;
		title?: string;
	};
	traceId?: string;
};

export type HighLevelV2CalendarBookAppointmentOutput = {
	address?: string;
	appoinmentStatus?: string;
	assignedUserId?: string;
	calendarId?: string;
	contactId?: string;
	id?: string;
	isRecurring?: boolean;
	status?: string;
	title?: string;
	traceId?: string;
};

export type HighLevelV2CalendarGetFreeSlotsOutput = {
	traceId?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface HighLevelV2Credentials {
	highLevelOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HighLevelV2NodeBase {
	type: 'n8n-nodes-base.highLevel';
	version: 2;
	credentials?: HighLevelV2Credentials;
}

export type HighLevelV2ContactCreateNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2ContactCreateConfig>;
	output?: HighLevelV2ContactCreateOutput;
};

export type HighLevelV2ContactDeleteNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2ContactDeleteConfig>;
};

export type HighLevelV2ContactGetNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2ContactGetConfig>;
	output?: HighLevelV2ContactGetOutput;
};

export type HighLevelV2ContactGetAllNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2ContactGetAllConfig>;
	output?: HighLevelV2ContactGetAllOutput;
};

export type HighLevelV2ContactUpdateNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2ContactUpdateConfig>;
	output?: HighLevelV2ContactUpdateOutput;
};

export type HighLevelV2OpportunityCreateNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2OpportunityCreateConfig>;
	output?: HighLevelV2OpportunityCreateOutput;
};

export type HighLevelV2OpportunityDeleteNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2OpportunityDeleteConfig>;
};

export type HighLevelV2OpportunityGetNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2OpportunityGetConfig>;
	output?: HighLevelV2OpportunityGetOutput;
};

export type HighLevelV2OpportunityGetAllNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2OpportunityGetAllConfig>;
	output?: HighLevelV2OpportunityGetAllOutput;
};

export type HighLevelV2OpportunityUpdateNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2OpportunityUpdateConfig>;
	output?: HighLevelV2OpportunityUpdateOutput;
};

export type HighLevelV2TaskCreateNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2TaskCreateConfig>;
	output?: HighLevelV2TaskCreateOutput;
};

export type HighLevelV2TaskDeleteNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2TaskDeleteConfig>;
};

export type HighLevelV2TaskGetNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2TaskGetConfig>;
};

export type HighLevelV2TaskGetAllNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2TaskGetAllConfig>;
};

export type HighLevelV2TaskUpdateNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2TaskUpdateConfig>;
};

export type HighLevelV2CalendarBookAppointmentNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2CalendarBookAppointmentConfig>;
	output?: HighLevelV2CalendarBookAppointmentOutput;
};

export type HighLevelV2CalendarGetFreeSlotsNode = HighLevelV2NodeBase & {
	config: NodeConfig<HighLevelV2CalendarGetFreeSlotsConfig>;
	output?: HighLevelV2CalendarGetFreeSlotsOutput;
};

export type HighLevelV2Node =
	| HighLevelV2ContactCreateNode
	| HighLevelV2ContactDeleteNode
	| HighLevelV2ContactGetNode
	| HighLevelV2ContactGetAllNode
	| HighLevelV2ContactUpdateNode
	| HighLevelV2OpportunityCreateNode
	| HighLevelV2OpportunityDeleteNode
	| HighLevelV2OpportunityGetNode
	| HighLevelV2OpportunityGetAllNode
	| HighLevelV2OpportunityUpdateNode
	| HighLevelV2TaskCreateNode
	| HighLevelV2TaskDeleteNode
	| HighLevelV2TaskGetNode
	| HighLevelV2TaskGetAllNode
	| HighLevelV2TaskUpdateNode
	| HighLevelV2CalendarBookAppointmentNode
	| HighLevelV2CalendarGetFreeSlotsNode
	;