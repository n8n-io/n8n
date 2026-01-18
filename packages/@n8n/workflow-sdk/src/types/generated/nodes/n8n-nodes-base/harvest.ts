/**
 * Harvest Node Types
 *
 * Access data on Harvest
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/harvest/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a client */
export type HarvestV1ClientCreateConfig = {
	resource: 'client';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The name of the client
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HarvestV1ClientDeleteConfig = {
	resource: 'client';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the client you want to delete
	 */
	id: string | Expression<string>;
};

/** Get data of a client */
export type HarvestV1ClientGetConfig = {
	resource: 'client';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the client you are retrieving
	 */
	id: string | Expression<string>;
};

/** Get data of many clients */
export type HarvestV1ClientGetAllConfig = {
	resource: 'client';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HarvestV1ClientUpdateConfig = {
	resource: 'client';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the client want to update
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Get data of a client */
export type HarvestV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
};

/** Create a client */
export type HarvestV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The first name of the contact
	 */
	firstName: string | Expression<string>;
	/**
	 * The ID of the client associated with this contact
	 */
	clientId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HarvestV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the contact you want to delete
	 */
	id: string | Expression<string>;
};

/** Get data of a client */
export type HarvestV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the contact you are retrieving
	 */
	id: string | Expression<string>;
};

/** Get data of many clients */
export type HarvestV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HarvestV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the contact want to update
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type HarvestV1EstimateCreateConfig = {
	resource: 'estimate';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the client this estimate belongs to
	 */
	clientId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HarvestV1EstimateDeleteConfig = {
	resource: 'estimate';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the estimate want to delete
	 */
	id: string | Expression<string>;
};

/** Get data of a client */
export type HarvestV1EstimateGetConfig = {
	resource: 'estimate';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the estimate you are retrieving
	 */
	id: string | Expression<string>;
};

/** Get data of many clients */
export type HarvestV1EstimateGetAllConfig = {
	resource: 'estimate';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HarvestV1EstimateUpdateConfig = {
	resource: 'estimate';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the invoice want to update
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type HarvestV1ExpenseCreateConfig = {
	resource: 'expense';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the project associated with this expense
	 */
	projectId: string | Expression<string>;
	/**
	 * The ID of the expense category this expense is being tracked against
	 */
	expenseCategoryId: string | Expression<string>;
	/**
	 * Date the expense occurred
	 */
	spentDate: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HarvestV1ExpenseDeleteConfig = {
	resource: 'expense';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the expense you want to delete
	 */
	id: string | Expression<string>;
};

/** Get data of a client */
export type HarvestV1ExpenseGetConfig = {
	resource: 'expense';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the expense you are retrieving
	 */
	id: string | Expression<string>;
};

/** Get data of many clients */
export type HarvestV1ExpenseGetAllConfig = {
	resource: 'expense';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HarvestV1ExpenseUpdateConfig = {
	resource: 'expense';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the invoice want to update
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type HarvestV1InvoiceCreateConfig = {
	resource: 'invoice';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the retainer associated with this invoice
	 */
	clientId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HarvestV1InvoiceDeleteConfig = {
	resource: 'invoice';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the invoice want to delete
	 */
	id: string | Expression<string>;
};

/** Get data of a client */
export type HarvestV1InvoiceGetConfig = {
	resource: 'invoice';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the invoice you are retrieving
	 */
	id: string | Expression<string>;
};

/** Get data of many clients */
export type HarvestV1InvoiceGetAllConfig = {
	resource: 'invoice';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HarvestV1InvoiceUpdateConfig = {
	resource: 'invoice';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the invoice want to update
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type HarvestV1ProjectCreateConfig = {
	resource: 'project';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The name of the project
	 */
	name: string | Expression<string>;
	/**
	 * The ID of the client to associate this project with
	 */
	clientId: string | Expression<string>;
	/**
	 * Whether the project is billable or not
	 * @default true
	 */
	isBillable: boolean | Expression<boolean>;
	/**
	 * The method by which the project is invoiced
	 * @default none
	 */
	billBy: 'none' | 'People' | 'Project' | 'Tasks' | Expression<string>;
	/**
	 * The email of the user or "none"
	 * @default none
	 */
	budgetBy: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HarvestV1ProjectDeleteConfig = {
	resource: 'project';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the project want to delete
	 */
	id: string | Expression<string>;
};

/** Get data of a client */
export type HarvestV1ProjectGetConfig = {
	resource: 'project';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the project you are retrieving
	 */
	id: string | Expression<string>;
};

/** Get data of many clients */
export type HarvestV1ProjectGetAllConfig = {
	resource: 'project';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HarvestV1ProjectUpdateConfig = {
	resource: 'project';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the project want to update
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type HarvestV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The name of the task
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HarvestV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the task you want to delete
	 */
	id: string | Expression<string>;
};

/** Get data of a client */
export type HarvestV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the task you are retrieving
	 */
	id: string | Expression<string>;
};

/** Get data of many clients */
export type HarvestV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HarvestV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the task you want to update
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a time entry via duration */
export type HarvestV1TimeEntryCreateByDurationConfig = {
	resource: 'timeEntry';
	operation: 'createByDuration';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the project to associate with the time entry
	 */
	projectId: string | Expression<string>;
	/**
	 * The ID of the task to associate with the time entry
	 */
	taskId: string | Expression<string>;
	/**
	 * The ISO 8601 formatted date the time entry was spent
	 */
	spentDate: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a time entry via start and end time */
export type HarvestV1TimeEntryCreateByStartEndConfig = {
	resource: 'timeEntry';
	operation: 'createByStartEnd';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the project to associate with the time entry
	 */
	projectId: string | Expression<string>;
	/**
	 * The ID of the task to associate with the time entry
	 */
	taskId: string | Expression<string>;
	/**
	 * The ISO 8601 formatted date the time entry was spent
	 */
	spentDate: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HarvestV1TimeEntryDeleteConfig = {
	resource: 'timeEntry';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the time entry you are deleting
	 */
	id: string | Expression<string>;
};

/** Delete a time entry’s external reference */
export type HarvestV1TimeEntryDeleteExternalConfig = {
	resource: 'timeEntry';
	operation: 'deleteExternal';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the time entry whose external reference you are deleting
	 */
	id: string | Expression<string>;
};

/** Get data of a client */
export type HarvestV1TimeEntryGetConfig = {
	resource: 'timeEntry';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the time entry you are retrieving
	 */
	id: string | Expression<string>;
};

/** Get data of many clients */
export type HarvestV1TimeEntryGetAllConfig = {
	resource: 'timeEntry';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Restart a time entry */
export type HarvestV1TimeEntryRestartTimeConfig = {
	resource: 'timeEntry';
	operation: 'restartTime';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Restart a stopped time entry. Restarting a time entry is only possible if it isn’t currently running.
	 */
	id: string | Expression<string>;
};

/** Stop a time entry */
export type HarvestV1TimeEntryStopTimeConfig = {
	resource: 'timeEntry';
	operation: 'stopTime';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Stop a running time entry. Stopping a time entry is only possible if it’s currently running.
	 */
	id: string | Expression<string>;
};

/** Update a client */
export type HarvestV1TimeEntryUpdateConfig = {
	resource: 'timeEntry';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the time entry to update
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type HarvestV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The first name of the user
	 */
	firstName: string | Expression<string>;
	/**
	 * The last name of the user
	 */
	lastName: string | Expression<string>;
	/**
	 * The email of the user
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HarvestV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the user you want to delete
	 */
	id: string | Expression<string>;
};

/** Get data of a client */
export type HarvestV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the user you are retrieving
	 */
	id: string | Expression<string>;
};

/** Get data of many clients */
export type HarvestV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Get data of authenticated user */
export type HarvestV1UserMeConfig = {
	resource: 'user';
	operation: 'me';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
};

/** Update a client */
export type HarvestV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	accountId: string | Expression<string>;
	/**
	 * The ID of the time entry to update
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type HarvestV1Params =
	| HarvestV1ClientCreateConfig
	| HarvestV1ClientDeleteConfig
	| HarvestV1ClientGetConfig
	| HarvestV1ClientGetAllConfig
	| HarvestV1ClientUpdateConfig
	| HarvestV1CompanyGetConfig
	| HarvestV1ContactCreateConfig
	| HarvestV1ContactDeleteConfig
	| HarvestV1ContactGetConfig
	| HarvestV1ContactGetAllConfig
	| HarvestV1ContactUpdateConfig
	| HarvestV1EstimateCreateConfig
	| HarvestV1EstimateDeleteConfig
	| HarvestV1EstimateGetConfig
	| HarvestV1EstimateGetAllConfig
	| HarvestV1EstimateUpdateConfig
	| HarvestV1ExpenseCreateConfig
	| HarvestV1ExpenseDeleteConfig
	| HarvestV1ExpenseGetConfig
	| HarvestV1ExpenseGetAllConfig
	| HarvestV1ExpenseUpdateConfig
	| HarvestV1InvoiceCreateConfig
	| HarvestV1InvoiceDeleteConfig
	| HarvestV1InvoiceGetConfig
	| HarvestV1InvoiceGetAllConfig
	| HarvestV1InvoiceUpdateConfig
	| HarvestV1ProjectCreateConfig
	| HarvestV1ProjectDeleteConfig
	| HarvestV1ProjectGetConfig
	| HarvestV1ProjectGetAllConfig
	| HarvestV1ProjectUpdateConfig
	| HarvestV1TaskCreateConfig
	| HarvestV1TaskDeleteConfig
	| HarvestV1TaskGetConfig
	| HarvestV1TaskGetAllConfig
	| HarvestV1TaskUpdateConfig
	| HarvestV1TimeEntryCreateByDurationConfig
	| HarvestV1TimeEntryCreateByStartEndConfig
	| HarvestV1TimeEntryDeleteConfig
	| HarvestV1TimeEntryDeleteExternalConfig
	| HarvestV1TimeEntryGetConfig
	| HarvestV1TimeEntryGetAllConfig
	| HarvestV1TimeEntryRestartTimeConfig
	| HarvestV1TimeEntryStopTimeConfig
	| HarvestV1TimeEntryUpdateConfig
	| HarvestV1UserCreateConfig
	| HarvestV1UserDeleteConfig
	| HarvestV1UserGetConfig
	| HarvestV1UserGetAllConfig
	| HarvestV1UserMeConfig
	| HarvestV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HarvestV1Credentials {
	harvestApi: CredentialReference;
	harvestOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type HarvestV1Node = {
	type: 'n8n-nodes-base.harvest';
	version: 1;
	config: NodeConfig<HarvestV1Params>;
	credentials?: HarvestV1Credentials;
};

export type HarvestNode = HarvestV1Node;
