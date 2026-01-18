/**
 * Freshworks CRM Node Types
 *
 * Consume the Freshworks CRM API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/freshworkscrm/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create an account */
export type FreshworksCrmV1AccountCreateConfig = {
	resource: 'account';
	operation: 'create';
	/**
	 * Name of the account
	 * @displayOptions.show { resource: ["account"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type FreshworksCrmV1AccountDeleteConfig = {
	resource: 'account';
	operation: 'delete';
	/**
	 * ID of the account to delete
	 * @displayOptions.show { resource: ["account"], operation: ["delete"] }
	 */
	accountId: string | Expression<string>;
};

/** Retrieve an account */
export type FreshworksCrmV1AccountGetConfig = {
	resource: 'account';
	operation: 'get';
	/**
	 * ID of the account to retrieve
	 * @displayOptions.show { resource: ["account"], operation: ["get"] }
	 */
	accountId: string | Expression<string>;
};

/** Retrieve many accounts */
export type FreshworksCrmV1AccountGetAllConfig = {
	resource: 'account';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["account"], operation: ["getAll"] }
	 */
	view: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["account"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["account"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update an account */
export type FreshworksCrmV1AccountUpdateConfig = {
	resource: 'account';
	operation: 'update';
	/**
	 * ID of the account to update
	 * @displayOptions.show { resource: ["account"], operation: ["update"] }
	 */
	accountId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type FreshworksCrmV1AppointmentCreateConfig = {
	resource: 'appointment';
	operation: 'create';
	/**
	 * Title of the appointment
	 * @displayOptions.show { resource: ["appointment"], operation: ["create"] }
	 */
	title: string | Expression<string>;
	/**
	 * Timestamp that denotes the start of appointment. Start date if this is an all-day appointment.
	 * @displayOptions.show { resource: ["appointment"], operation: ["create"] }
	 */
	fromDate: string | Expression<string>;
	/**
	 * Timestamp that denotes the end of appointment. End date if this is an all-day appointment.
	 * @displayOptions.show { resource: ["appointment"], operation: ["create"] }
	 */
	endDate: string | Expression<string>;
	attendees?: {
		attendee?: Array<{
			/** Type
			 * @default contact
			 */
			type?: 'contact' | 'user' | Expression<string>;
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 * @displayOptions.show { type: ["user"] }
			 */
			userId?: string | Expression<string>;
			/** Contact ID
			 * @displayOptions.show { type: ["contact"] }
			 */
			contactId?: string | Expression<string>;
		}>;
	};
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type FreshworksCrmV1AppointmentDeleteConfig = {
	resource: 'appointment';
	operation: 'delete';
	/**
	 * ID of the appointment to delete
	 * @displayOptions.show { resource: ["appointment"], operation: ["delete"] }
	 */
	appointmentId: string | Expression<string>;
};

/** Retrieve an account */
export type FreshworksCrmV1AppointmentGetConfig = {
	resource: 'appointment';
	operation: 'get';
	/**
	 * ID of the appointment to retrieve
	 * @displayOptions.show { resource: ["appointment"], operation: ["get"] }
	 */
	appointmentId: string | Expression<string>;
};

/** Retrieve many accounts */
export type FreshworksCrmV1AppointmentGetAllConfig = {
	resource: 'appointment';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["appointment"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["appointment"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an account */
export type FreshworksCrmV1AppointmentUpdateConfig = {
	resource: 'appointment';
	operation: 'update';
	/**
	 * ID of the appointment to update
	 * @displayOptions.show { resource: ["appointment"], operation: ["update"] }
	 */
	appointmentId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type FreshworksCrmV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	/**
	 * First name of the contact
	 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
	 */
	firstName: string | Expression<string>;
	/**
	 * Last name of the contact
	 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
	 */
	lastName: string | Expression<string>;
	/**
	 * Email addresses of the contact
	 * @displayOptions.show { resource: ["contact"], operation: ["create"] }
	 */
	emails: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type FreshworksCrmV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * ID of the contact to delete
	 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
	 */
	contactId: string | Expression<string>;
};

/** Retrieve an account */
export type FreshworksCrmV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * ID of the contact to retrieve
	 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
	 */
	contactId: string | Expression<string>;
};

/** Retrieve many accounts */
export type FreshworksCrmV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
	 */
	view?: string | Expression<string>;
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
};

/** Update an account */
export type FreshworksCrmV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * ID of the contact to update
	 * @displayOptions.show { resource: ["contact"], operation: ["update"] }
	 */
	contactId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type FreshworksCrmV1DealCreateConfig = {
	resource: 'deal';
	operation: 'create';
	/**
	 * Value of the deal
	 * @displayOptions.show { resource: ["deal"], operation: ["create"] }
	 * @default 0
	 */
	amount: number | Expression<number>;
	/**
	 * Name of the deal
	 * @displayOptions.show { resource: ["deal"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type FreshworksCrmV1DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
	/**
	 * ID of the deal to delete
	 * @displayOptions.show { resource: ["deal"], operation: ["delete"] }
	 */
	dealId: string | Expression<string>;
};

/** Retrieve an account */
export type FreshworksCrmV1DealGetConfig = {
	resource: 'deal';
	operation: 'get';
	/**
	 * ID of the deal to retrieve
	 * @displayOptions.show { resource: ["deal"], operation: ["get"] }
	 */
	dealId: string | Expression<string>;
};

/** Retrieve many accounts */
export type FreshworksCrmV1DealGetAllConfig = {
	resource: 'deal';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 * @displayOptions.show { resource: ["deal"], operation: ["getAll"] }
	 */
	view?: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["deal"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["deal"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Update an account */
export type FreshworksCrmV1DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
	/**
	 * ID of the deal to update
	 * @displayOptions.show { resource: ["deal"], operation: ["update"] }
	 */
	dealId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create an account */
export type FreshworksCrmV1NoteCreateConfig = {
	resource: 'note';
	operation: 'create';
	/**
	 * Content of the note
	 * @displayOptions.show { resource: ["note"], operation: ["create"] }
	 */
	description: string | Expression<string>;
	/**
	 * Type of the entity for which the note is created
	 * @displayOptions.show { resource: ["note"], operation: ["create"] }
	 * @default Contact
	 */
	targetableType: 'Contact' | 'Deal' | 'SalesAccount' | Expression<string>;
	/**
	 * ID of the entity for which note is created. The type of entity is selected in "Target Type".
	 * @displayOptions.show { resource: ["note"], operation: ["create"] }
	 */
	targetable_id: string | Expression<string>;
};

/** Delete an account */
export type FreshworksCrmV1NoteDeleteConfig = {
	resource: 'note';
	operation: 'delete';
	/**
	 * ID of the note to delete
	 * @displayOptions.show { resource: ["note"], operation: ["delete"] }
	 */
	noteId: string | Expression<string>;
};

/** Update an account */
export type FreshworksCrmV1NoteUpdateConfig = {
	resource: 'note';
	operation: 'update';
	/**
	 * ID of the note to update
	 * @displayOptions.show { resource: ["note"], operation: ["update"] }
	 */
	noteId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Retrieve an account */
export type FreshworksCrmV1SalesActivityGetConfig = {
	resource: 'salesActivity';
	operation: 'get';
	/**
	 * ID of the salesActivity to retrieve
	 * @displayOptions.show { resource: ["salesActivity"], operation: ["get"] }
	 */
	salesActivityId: string | Expression<string>;
};

/** Retrieve many accounts */
export type FreshworksCrmV1SalesActivityGetAllConfig = {
	resource: 'salesActivity';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["salesActivity"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["salesActivity"], operation: ["getAll"], returnAll: [false] }
	 * @default 50
	 */
	limit?: number | Expression<number>;
};

/** Search for records by entering search queries of your choice */
export type FreshworksCrmV1SearchQueryConfig = {
	resource: 'search';
	operation: 'query';
	/**
	 * Enter a term that will be used for searching entities
	 * @displayOptions.show { resource: ["search"], operation: ["query"] }
	 */
	query: string | Expression<string>;
	/**
	 * Enter a term that will be used for searching entities
	 * @displayOptions.show { resource: ["search"], operation: ["query"] }
	 * @default []
	 */
	entities: Array<'contact' | 'deal' | 'sales_account' | 'user'>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["search"], operation: ["query"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["search"], operation: ["query"], returnAll: [false] }
	 * @default 25
	 */
	limit?: number | Expression<number>;
};

/** Search for the name or email address of records */
export type FreshworksCrmV1SearchLookupConfig = {
	resource: 'search';
	operation: 'lookup';
	/**
	 * Field against which the entities have to be searched
	 * @displayOptions.show { resource: ["search"], operation: ["lookup"] }
	 */
	searchField: 'email' | 'name' | 'customField' | Expression<string>;
	customFieldName: string | Expression<string>;
	customFieldValue: string | Expression<string>;
	fieldValue: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create an account */
export type FreshworksCrmV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * Title of the task
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
	 */
	title: string | Expression<string>;
	/**
	 * Timestamp that denotes when the task is due to be completed
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
	 */
	dueDate: string | Expression<string>;
	/**
	 * ID of the user to whom the task is assigned. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
	 */
	ownerId: string | Expression<string>;
	/**
	 * Type of the entity for which the task is updated
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
	 * @default Contact
	 */
	targetableType: 'Contact' | 'Deal' | 'SalesAccount' | Expression<string>;
	/**
	 * ID of the entity for which the task is created. The type of entity is selected in "Target Type".
	 * @displayOptions.show { resource: ["task"], operation: ["create"] }
	 */
	targetable_id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an account */
export type FreshworksCrmV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	/**
	 * ID of the task to delete
	 * @displayOptions.show { resource: ["task"], operation: ["delete"] }
	 */
	taskId: string | Expression<string>;
};

/** Retrieve an account */
export type FreshworksCrmV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * ID of the task to retrieve
	 * @displayOptions.show { resource: ["task"], operation: ["get"] }
	 */
	taskId: string | Expression<string>;
};

/** Retrieve many accounts */
export type FreshworksCrmV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
	 * @default false
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

/** Update an account */
export type FreshworksCrmV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * ID of the task to update
	 * @displayOptions.show { resource: ["task"], operation: ["update"] }
	 */
	taskId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type FreshworksCrmV1Params =
	| FreshworksCrmV1AccountCreateConfig
	| FreshworksCrmV1AccountDeleteConfig
	| FreshworksCrmV1AccountGetConfig
	| FreshworksCrmV1AccountGetAllConfig
	| FreshworksCrmV1AccountUpdateConfig
	| FreshworksCrmV1AppointmentCreateConfig
	| FreshworksCrmV1AppointmentDeleteConfig
	| FreshworksCrmV1AppointmentGetConfig
	| FreshworksCrmV1AppointmentGetAllConfig
	| FreshworksCrmV1AppointmentUpdateConfig
	| FreshworksCrmV1ContactCreateConfig
	| FreshworksCrmV1ContactDeleteConfig
	| FreshworksCrmV1ContactGetConfig
	| FreshworksCrmV1ContactGetAllConfig
	| FreshworksCrmV1ContactUpdateConfig
	| FreshworksCrmV1DealCreateConfig
	| FreshworksCrmV1DealDeleteConfig
	| FreshworksCrmV1DealGetConfig
	| FreshworksCrmV1DealGetAllConfig
	| FreshworksCrmV1DealUpdateConfig
	| FreshworksCrmV1NoteCreateConfig
	| FreshworksCrmV1NoteDeleteConfig
	| FreshworksCrmV1NoteUpdateConfig
	| FreshworksCrmV1SalesActivityGetConfig
	| FreshworksCrmV1SalesActivityGetAllConfig
	| FreshworksCrmV1SearchQueryConfig
	| FreshworksCrmV1SearchLookupConfig
	| FreshworksCrmV1TaskCreateConfig
	| FreshworksCrmV1TaskDeleteConfig
	| FreshworksCrmV1TaskGetConfig
	| FreshworksCrmV1TaskGetAllConfig
	| FreshworksCrmV1TaskUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface FreshworksCrmV1Credentials {
	freshworksCrmApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type FreshworksCrmV1Node = {
	type: 'n8n-nodes-base.freshworksCrm';
	version: 1;
	config: NodeConfig<FreshworksCrmV1Params>;
	credentials?: FreshworksCrmV1Credentials;
};

export type FreshworksCrmNode = FreshworksCrmV1Node;
