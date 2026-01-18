/**
 * ServiceNow Node - Version 1
 * Consume ServiceNow API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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

export type ServiceNowV1Params =
	| ServiceNowV1AttachmentUploadConfig
	| ServiceNowV1AttachmentDeleteConfig
	| ServiceNowV1AttachmentGetConfig
	| ServiceNowV1AttachmentGetAllConfig
	| ServiceNowV1BusinessServiceGetAllConfig
	| ServiceNowV1ConfigurationItemsGetAllConfig
	| ServiceNowV1DepartmentGetAllConfig
	| ServiceNowV1DictionaryGetAllConfig
	| ServiceNowV1IncidentCreateConfig
	| ServiceNowV1IncidentDeleteConfig
	| ServiceNowV1IncidentGetConfig
	| ServiceNowV1IncidentGetAllConfig
	| ServiceNowV1IncidentUpdateConfig
	| ServiceNowV1TableRecordCreateConfig
	| ServiceNowV1TableRecordDeleteConfig
	| ServiceNowV1TableRecordGetConfig
	| ServiceNowV1TableRecordGetAllConfig
	| ServiceNowV1TableRecordUpdateConfig
	| ServiceNowV1UserCreateConfig
	| ServiceNowV1UserDeleteConfig
	| ServiceNowV1UserGetConfig
	| ServiceNowV1UserGetAllConfig
	| ServiceNowV1UserUpdateConfig
	| ServiceNowV1UserGroupGetAllConfig
	| ServiceNowV1UserRoleGetAllConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ServiceNowV1Credentials {
	serviceNowOAuth2Api: CredentialReference;
	serviceNowBasicApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type ServiceNowV1Node = {
	type: 'n8n-nodes-base.serviceNow';
	version: 1;
	config: NodeConfig<ServiceNowV1Params>;
	credentials?: ServiceNowV1Credentials;
};