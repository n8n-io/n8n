/**
 * ServiceNow Node - Version 1
 * Consume ServiceNow API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Upload an attachment to a specific table record */
export type ServiceNowV1AttachmentUploadConfig = {
	resource: 'attachment';
	operation: 'upload';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["attachment"], operation: ["upload", "getAll"] }
 */
		tableName: string | Expression<string>;
/**
 * Sys_id of the record in the table specified in Table Name that you want to attach the file to
 * @displayOptions.show { resource: ["attachment"], operation: ["upload"] }
 */
		id: string | Expression<string>;
/**
 * Name of the binary property that contains the data to upload
 * @displayOptions.show { resource: ["attachment"], operation: ["upload"] }
 * @default data
 */
		inputDataFieldName: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete an attachment */
export type ServiceNowV1AttachmentDeleteConfig = {
	resource: 'attachment';
	operation: 'delete';
/**
 * Sys_id value of the attachment to delete
 * @displayOptions.show { resource: ["attachment"], operation: ["delete"] }
 */
		attachmentId: string | Expression<string>;
};

/** Get an attachment */
export type ServiceNowV1AttachmentGetConfig = {
	resource: 'attachment';
	operation: 'get';
/**
 * Sys_id value of the attachment to delete
 * @displayOptions.show { resource: ["attachment"], operation: ["get"] }
 */
		attachmentId: string | Expression<string>;
	download: boolean | Expression<boolean>;
/**
 * Field name where downloaded data will be placed
 * @displayOptions.show { resource: ["attachment"], operation: ["get", "getAll"], download: [true] }
 * @default data
 */
		outputField?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1AttachmentGetAllConfig = {
	resource: 'attachment';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["attachment"], operation: ["upload", "getAll"] }
 */
		tableName: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["attachment"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["attachment"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	download: boolean | Expression<boolean>;
/**
 * Field name where downloaded data will be placed
 * @displayOptions.show { resource: ["attachment"], operation: ["get", "getAll"], download: [true] }
 * @default data
 */
		outputField?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1BusinessServiceGetAllConfig = {
	resource: 'businessService';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["businessService"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["businessService"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1ConfigurationItemsGetAllConfig = {
	resource: 'configurationItems';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["configurationItems"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["configurationItems"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1DepartmentGetAllConfig = {
	resource: 'department';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["department"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["department"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1DictionaryGetAllConfig = {
	resource: 'dictionary';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["dictionary"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["dictionary"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type ServiceNowV1IncidentCreateConfig = {
	resource: 'incident';
	operation: 'create';
/**
 * Short description of the incident
 * @displayOptions.show { resource: ["incident"], operation: ["create"] }
 */
		short_description: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an attachment */
export type ServiceNowV1IncidentDeleteConfig = {
	resource: 'incident';
	operation: 'delete';
/**
 * Unique identifier of the incident
 * @displayOptions.show { resource: ["incident"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
};

/** Get an attachment */
export type ServiceNowV1IncidentGetConfig = {
	resource: 'incident';
	operation: 'get';
/**
 * Unique identifier of the incident
 * @displayOptions.show { resource: ["incident"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1IncidentGetAllConfig = {
	resource: 'incident';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["incident"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["incident"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type ServiceNowV1IncidentUpdateConfig = {
	resource: 'incident';
	operation: 'update';
/**
 * Unique identifier of the incident
 * @displayOptions.show { resource: ["incident"], operation: ["update"] }
 */
		id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type ServiceNowV1TableRecordCreateConfig = {
	resource: 'tableRecord';
	operation: 'create';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["tableRecord"], operation: ["create"] }
 */
		tableName: string | Expression<string>;
	dataToSend?: 'mapInput' | 'columns' | 'nothing' | Expression<string>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all inputs.
 * @displayOptions.show { resource: ["tableRecord"], operation: ["create"], dataToSend: ["mapInput"] }
 */
		inputsToIgnore?: string | Expression<string>;
	fieldsToSend?: {
		field?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** Field Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Delete an attachment */
export type ServiceNowV1TableRecordDeleteConfig = {
	resource: 'tableRecord';
	operation: 'delete';
/**
 * Name of the table in which the record exists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["tableRecord"], operation: ["delete", "get"] }
 */
		tableName: string | Expression<string>;
/**
 * Unique identifier of the record
 * @displayOptions.show { resource: ["tableRecord"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
};

/** Get an attachment */
export type ServiceNowV1TableRecordGetConfig = {
	resource: 'tableRecord';
	operation: 'get';
/**
 * Name of the table in which the record exists. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["tableRecord"], operation: ["delete", "get"] }
 */
		tableName: string | Expression<string>;
/**
 * Unique identifier of the record
 * @displayOptions.show { resource: ["tableRecord"], operation: ["delete", "get"] }
 */
		id: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1TableRecordGetAllConfig = {
	resource: 'tableRecord';
	operation: 'getAll';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["tableRecord"], operation: ["getAll"] }
 */
		tableName: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["tableRecord"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["tableRecord"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type ServiceNowV1TableRecordUpdateConfig = {
	resource: 'tableRecord';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["tableRecord"], operation: ["update"] }
 */
		tableName: string | Expression<string>;
/**
 * Unique identifier of the record
 * @displayOptions.show { resource: ["tableRecord"], operation: ["update"] }
 */
		id: string | Expression<string>;
	dataToSend?: 'mapInput' | 'columns' | 'nothing' | Expression<string>;
/**
 * List of input properties to avoid sending, separated by commas. Leave empty to send all inputs.
 * @displayOptions.show { resource: ["tableRecord"], operation: ["update"], dataToSend: ["mapInput"] }
 */
		inputsToIgnore?: string | Expression<string>;
	fieldsToSend?: {
		field?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			column?: string | Expression<string>;
			/** Field Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};

export type ServiceNowV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
/**
 * Short description of the user
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		short_description: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an attachment */
export type ServiceNowV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
/**
 * Unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["delete"] }
 */
		id: string | Expression<string>;
};

/** Get an attachment */
export type ServiceNowV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
/**
 * Unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["get"] }
 * @default id
 */
		getOption: 'id' | 'user_name' | Expression<string>;
/**
 * Unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["get"], getOption: ["user_name"] }
 */
		user_name: string | Expression<string>;
/**
 * Unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["get"], getOption: ["id"] }
 */
		id: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1UserGetAllConfig = {
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
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

export type ServiceNowV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
/**
 * Unique identifier of the user
 * @displayOptions.show { resource: ["user"], operation: ["update"] }
 */
		id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1UserGroupGetAllConfig = {
	resource: 'userGroup';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["userGroup"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["userGroup"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Get many attachments on a table */
export type ServiceNowV1UserRoleGetAllConfig = {
	resource: 'userRole';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["userRole"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["userRole"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type ServiceNowV1IncidentCreateOutput = {
	action_status?: string;
	actions_taken?: string;
	active?: string;
	activity_due?: string;
	additional_assignee_list?: string;
	approval?: string;
	approval_history?: string;
	approval_set?: string;
	business_duration?: string;
	business_impact?: string;
	business_service?: string;
	business_stc?: string;
	calendar_duration?: string;
	calendar_stc?: string;
	category?: string;
	cause?: string;
	caused_by?: string;
	child_incidents?: string;
	close_code?: string;
	close_notes?: string;
	closed_at?: string;
	closed_by?: string;
	cmdb_ci?: string;
	comments?: string;
	comments_and_work_notes?: string;
	contact_type?: string;
	contract?: string;
	correlation_display?: string;
	correlation_id?: string;
	delivery_plan?: string;
	delivery_task?: string;
	description?: string;
	due_date?: string;
	escalation?: string;
	expected_start?: string;
	follow_up?: string;
	group_list?: string;
	hold_reason?: string;
	impact?: string;
	incident_state?: string;
	knowledge?: string;
	lessons_learned?: string;
	location?: string;
	made_sla?: string;
	major_incident_state?: string;
	needs_attention?: string;
	notify?: string;
	number?: string;
	opened_at?: string;
	opened_by?: {
		link?: string;
		value?: string;
	};
	order?: string;
	origin_id?: string;
	origin_table?: string;
	overview?: string;
	parent?: string;
	parent_incident?: string;
	priority?: string;
	problem_id?: string;
	promoted_by?: string;
	promoted_on?: string;
	proposed_by?: string;
	proposed_on?: string;
	reassignment_count?: string;
	reopen_count?: string;
	reopened_by?: string;
	reopened_time?: string;
	resolved_at?: string;
	rfc?: string;
	route_reason?: string;
	service_offering?: string;
	severity?: string;
	short_description?: string;
	skills?: string;
	sla_due?: string;
	state?: string;
	subcategory?: string;
	sys_class_name?: string;
	sys_created_by?: string;
	sys_created_on?: string;
	sys_domain?: {
		link?: string;
		value?: string;
	};
	sys_domain_path?: string;
	sys_id?: string;
	sys_mod_count?: string;
	sys_tags?: string;
	sys_updated_by?: string;
	sys_updated_on?: string;
	task_effective_number?: string;
	task_for?: {
		link?: string;
		value?: string;
	};
	time_worked?: string;
	timeline?: string;
	trigger_rule?: string;
	universal_request?: string;
	upon_approval?: string;
	upon_reject?: string;
	urgency?: string;
	user_input?: string;
	watch_list?: string;
	work_end?: string;
	work_notes?: string;
	work_notes_list?: string;
	work_start?: string;
	x_caci_sg_meraki_device_alert?: string;
};

export type ServiceNowV1IncidentGetAllOutput = {
	active?: string;
	activity_due?: string;
	additional_assignee_list?: string;
	approval?: string;
	approval_history?: string;
	approval_set?: string;
	business_duration?: string;
	business_impact?: string;
	business_stc?: string;
	calendar_duration?: string;
	calendar_stc?: string;
	caller_id?: {
		link?: string;
		value?: string;
	};
	cause?: string;
	caused_by?: string;
	close_notes?: string;
	closed_at?: string;
	comments?: string;
	comments_and_work_notes?: string;
	correlation_display?: string;
	correlation_id?: string;
	description?: string;
	due_date?: string;
	escalation?: string;
	expected_start?: string;
	follow_up?: string;
	group_list?: string;
	hold_reason?: string;
	impact?: string;
	knowledge?: string;
	made_sla?: string;
	notify?: string;
	opened_by?: {
		link?: string;
		value?: string;
	};
	order?: string;
	origin_table?: string;
	parent?: string;
	reassignment_count?: string;
	reopen_count?: string;
	reopened_time?: string;
	resolved_at?: string;
	resolved_by?: {
		link?: string;
		value?: string;
	};
	route_reason?: string;
	severity?: string;
	sla_due?: string;
	state?: string;
	sys_class_name?: string;
	sys_created_by?: string;
	sys_created_on?: string;
	sys_domain?: {
		link?: string;
		value?: string;
	};
	sys_domain_path?: string;
	sys_mod_count?: string;
	sys_tags?: string;
	sys_updated_by?: string;
	task_effective_number?: string;
	time_worked?: string;
	universal_request?: string;
	upon_approval?: string;
	upon_reject?: string;
	urgency?: string;
	user_input?: string;
	watch_list?: string;
	work_end?: string;
	work_notes?: string;
	work_notes_list?: string;
	work_start?: string;
};

export type ServiceNowV1TableRecordCreateOutput = {
	active?: string;
	activity_due?: string;
	additional_assignee_list?: string;
	approval?: string;
	approval_history?: string;
	approval_set?: string;
	assigned_to?: string;
	business_duration?: string;
	business_service?: string;
	calendar_duration?: string;
	close_notes?: string;
	closed_at?: string;
	closed_by?: string;
	cmdb_ci?: string;
	comments?: string;
	comments_and_work_notes?: string;
	contact_type?: string;
	contract?: string;
	correlation_display?: string;
	correlation_id?: string;
	description?: string;
	due_date?: string;
	escalation?: string;
	expected_start?: string;
	follow_up?: string;
	group_list?: string;
	impact?: string;
	knowledge?: string;
	location?: string;
	made_sla?: string;
	number?: string;
	opened_at?: string;
	opened_by?: {
		link?: string;
		value?: string;
	};
	order?: string;
	parent?: string;
	priority?: string;
	reassignment_count?: string;
	route_reason?: string;
	service_offering?: string;
	short_description?: string;
	sla_due?: string;
	state?: string;
	sys_class_name?: string;
	sys_created_by?: string;
	sys_created_on?: string;
	sys_domain?: {
		link?: string;
		value?: string;
	};
	sys_domain_path?: string;
	sys_id?: string;
	sys_mod_count?: string;
	sys_tags?: string;
	sys_updated_by?: string;
	sys_updated_on?: string;
	task_effective_number?: string;
	universal_request?: string;
	upon_approval?: string;
	upon_reject?: string;
	urgency?: string;
	user_input?: string;
	watch_list?: string;
	work_end?: string;
	work_notes?: string;
	work_notes_list?: string;
	work_start?: string;
};

export type ServiceNowV1TableRecordGetAllOutput = {
	state?: string;
	sys_class_name?: string;
	sys_created_by?: string;
	sys_created_on?: string;
	sys_mod_count?: string;
	sys_tags?: string;
	sys_updated_by?: string;
	sys_updated_on?: string;
};

export type ServiceNowV1UserGetOutput = {
	sys_domain?: {
		link?: string;
		value?: string;
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface ServiceNowV1Credentials {
	serviceNowOAuth2Api: CredentialReference;
	serviceNowBasicApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface ServiceNowV1NodeBase {
	type: 'n8n-nodes-base.serviceNow';
	version: 1;
	credentials?: ServiceNowV1Credentials;
}

export type ServiceNowV1AttachmentUploadNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1AttachmentUploadConfig>;
};

export type ServiceNowV1AttachmentDeleteNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1AttachmentDeleteConfig>;
};

export type ServiceNowV1AttachmentGetNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1AttachmentGetConfig>;
};

export type ServiceNowV1AttachmentGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1AttachmentGetAllConfig>;
};

export type ServiceNowV1BusinessServiceGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1BusinessServiceGetAllConfig>;
};

export type ServiceNowV1ConfigurationItemsGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1ConfigurationItemsGetAllConfig>;
};

export type ServiceNowV1DepartmentGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1DepartmentGetAllConfig>;
};

export type ServiceNowV1DictionaryGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1DictionaryGetAllConfig>;
};

export type ServiceNowV1IncidentCreateNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1IncidentCreateConfig>;
	output?: ServiceNowV1IncidentCreateOutput;
};

export type ServiceNowV1IncidentDeleteNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1IncidentDeleteConfig>;
};

export type ServiceNowV1IncidentGetNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1IncidentGetConfig>;
};

export type ServiceNowV1IncidentGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1IncidentGetAllConfig>;
	output?: ServiceNowV1IncidentGetAllOutput;
};

export type ServiceNowV1IncidentUpdateNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1IncidentUpdateConfig>;
};

export type ServiceNowV1TableRecordCreateNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1TableRecordCreateConfig>;
	output?: ServiceNowV1TableRecordCreateOutput;
};

export type ServiceNowV1TableRecordDeleteNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1TableRecordDeleteConfig>;
};

export type ServiceNowV1TableRecordGetNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1TableRecordGetConfig>;
};

export type ServiceNowV1TableRecordGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1TableRecordGetAllConfig>;
	output?: ServiceNowV1TableRecordGetAllOutput;
};

export type ServiceNowV1TableRecordUpdateNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1TableRecordUpdateConfig>;
};

export type ServiceNowV1UserCreateNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1UserCreateConfig>;
};

export type ServiceNowV1UserDeleteNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1UserDeleteConfig>;
};

export type ServiceNowV1UserGetNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1UserGetConfig>;
	output?: ServiceNowV1UserGetOutput;
};

export type ServiceNowV1UserGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1UserGetAllConfig>;
};

export type ServiceNowV1UserUpdateNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1UserUpdateConfig>;
};

export type ServiceNowV1UserGroupGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1UserGroupGetAllConfig>;
};

export type ServiceNowV1UserRoleGetAllNode = ServiceNowV1NodeBase & {
	config: NodeConfig<ServiceNowV1UserRoleGetAllConfig>;
};

export type ServiceNowV1Node =
	| ServiceNowV1AttachmentUploadNode
	| ServiceNowV1AttachmentDeleteNode
	| ServiceNowV1AttachmentGetNode
	| ServiceNowV1AttachmentGetAllNode
	| ServiceNowV1BusinessServiceGetAllNode
	| ServiceNowV1ConfigurationItemsGetAllNode
	| ServiceNowV1DepartmentGetAllNode
	| ServiceNowV1DictionaryGetAllNode
	| ServiceNowV1IncidentCreateNode
	| ServiceNowV1IncidentDeleteNode
	| ServiceNowV1IncidentGetNode
	| ServiceNowV1IncidentGetAllNode
	| ServiceNowV1IncidentUpdateNode
	| ServiceNowV1TableRecordCreateNode
	| ServiceNowV1TableRecordDeleteNode
	| ServiceNowV1TableRecordGetNode
	| ServiceNowV1TableRecordGetAllNode
	| ServiceNowV1TableRecordUpdateNode
	| ServiceNowV1UserCreateNode
	| ServiceNowV1UserDeleteNode
	| ServiceNowV1UserGetNode
	| ServiceNowV1UserGetAllNode
	| ServiceNowV1UserUpdateNode
	| ServiceNowV1UserGroupGetAllNode
	| ServiceNowV1UserRoleGetAllNode
	;