/**
 * Harvest Node - Version 1
 * Access data on Harvest
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { operation: ["create"], resource: ["client"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["client"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["client"] }
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
 * @displayOptions.show { resource: ["client"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["client"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["client"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["contact"] }
 */
		firstName: string | Expression<string>;
/**
 * The ID of the client associated with this contact
 * @displayOptions.show { operation: ["create"], resource: ["contact"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["contact"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["contact"] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contact"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["contact"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["estimate"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["estimate"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["estimate"] }
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
 * @displayOptions.show { resource: ["estimate"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["estimate"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["estimate"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["expense"] }
 */
		projectId: string | Expression<string>;
/**
 * The ID of the expense category this expense is being tracked against
 * @displayOptions.show { operation: ["create"], resource: ["expense"] }
 */
		expenseCategoryId: string | Expression<string>;
/**
 * Date the expense occurred
 * @displayOptions.show { operation: ["create"], resource: ["expense"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["expense"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["expense"] }
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
 * @displayOptions.show { resource: ["expense"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["expense"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["expense"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["invoice"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["invoice"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["invoice"] }
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
 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["invoice"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["invoice"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["project"] }
 */
		name: string | Expression<string>;
/**
 * The ID of the client to associate this project with
 * @displayOptions.show { operation: ["create"], resource: ["project"] }
 */
		clientId: string | Expression<string>;
/**
 * Whether the project is billable or not
 * @displayOptions.show { operation: ["create"], resource: ["project"] }
 * @default true
 */
		isBillable: boolean | Expression<boolean>;
/**
 * The method by which the project is invoiced
 * @displayOptions.show { operation: ["create"], resource: ["project"] }
 * @default none
 */
		billBy: 'none' | 'People' | 'Project' | 'Tasks' | Expression<string>;
/**
 * The email of the user or "none"
 * @displayOptions.show { operation: ["create"], resource: ["project"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["project"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["project"] }
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
 * @displayOptions.show { resource: ["project"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["project"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["project"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["task"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["task"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["task"] }
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
 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["task"] }
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
 * @displayOptions.show { operation: ["createByDuration"], resource: ["timeEntry"] }
 */
		projectId: string | Expression<string>;
/**
 * The ID of the task to associate with the time entry
 * @displayOptions.show { operation: ["createByDuration"], resource: ["timeEntry"] }
 */
		taskId: string | Expression<string>;
/**
 * The ISO 8601 formatted date the time entry was spent
 * @displayOptions.show { operation: ["createByDuration"], resource: ["timeEntry"] }
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
 * @displayOptions.show { operation: ["createByStartEnd"], resource: ["timeEntry"] }
 */
		projectId: string | Expression<string>;
/**
 * The ID of the task to associate with the time entry
 * @displayOptions.show { operation: ["createByStartEnd"], resource: ["timeEntry"] }
 */
		taskId: string | Expression<string>;
/**
 * The ISO 8601 formatted date the time entry was spent
 * @displayOptions.show { operation: ["createByStartEnd"], resource: ["timeEntry"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["timeEntry"] }
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
 * @displayOptions.show { operation: ["deleteExternal"], resource: ["timeEntry"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["timeEntry"] }
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
 * @displayOptions.show { resource: ["timeEntry"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["timeEntry"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["restartTime"], resource: ["timeEntry"] }
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
 * @displayOptions.show { operation: ["stopTime"], resource: ["timeEntry"] }
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
 * @displayOptions.show { operation: ["update"], resource: ["timeEntry"] }
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
 * @displayOptions.show { operation: ["create"], resource: ["user"] }
 */
		firstName: string | Expression<string>;
/**
 * The last name of the user
 * @displayOptions.show { operation: ["create"], resource: ["user"] }
 */
		lastName: string | Expression<string>;
/**
 * The email of the user
 * @displayOptions.show { operation: ["create"], resource: ["user"] }
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
 * @displayOptions.show { operation: ["delete"], resource: ["user"] }
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
 * @displayOptions.show { operation: ["get"], resource: ["user"] }
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
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { operation: ["update"], resource: ["user"] }
 */
		id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type HarvestV1ClientGetAllOutput = {
	created_at?: string;
	currency?: string;
	id?: number;
	is_active?: boolean;
	name?: string;
	statement_key?: string;
	updated_at?: string;
};

export type HarvestV1InvoiceGetAllOutput = {
	client?: {
		id?: number;
		name?: string;
	};
	client_key?: string;
	closed_at?: null;
	created_at?: string;
	creator?: {
		id?: number;
		name?: string;
	};
	currency?: string;
	discount_amount?: number;
	due_date?: string;
	estimate?: null;
	id?: number;
	issue_date?: string;
	line_items?: Array<{
		description?: string;
		id?: number;
		kind?: string;
		project?: {
			id?: number;
			name?: string;
		};
		taxed?: boolean;
		taxed2?: boolean;
	}>;
	notes?: string;
	number?: string;
	payment_options?: Array<string>;
	payment_term?: string;
	purchase_order?: string;
	retainer?: null;
	state?: string;
	subject?: string;
	tax2?: null;
	tax2_amount?: number;
	updated_at?: string;
};

export type HarvestV1ProjectGetOutput = {
	bill_by?: string;
	budget_by?: string;
	budget_is_monthly?: boolean;
	client?: {
		currency?: string;
		id?: number;
		name?: string;
	};
	cost_budget_include_expenses?: boolean;
	created_at?: string;
	id?: number;
	is_active?: boolean;
	is_billable?: boolean;
	is_fixed_fee?: boolean;
	name?: string;
	notes?: string;
	notify_when_over_budget?: boolean;
	over_budget_notification_percentage?: number;
	show_budget_to_all?: boolean;
	updated_at?: string;
};

export type HarvestV1ProjectGetAllOutput = {
	bill_by?: string;
	budget_by?: string;
	budget_is_monthly?: boolean;
	client?: {
		currency?: string;
		id?: number;
		name?: string;
	};
	cost_budget_include_expenses?: boolean;
	created_at?: string;
	id?: number;
	is_active?: boolean;
	is_billable?: boolean;
	is_fixed_fee?: boolean;
	name?: string;
	notify_when_over_budget?: boolean;
	over_budget_notification_percentage?: number;
	show_budget_to_all?: boolean;
	updated_at?: string;
};

export type HarvestV1TimeEntryGetAllOutput = {
	billable?: boolean;
	budgeted?: boolean;
	client?: {
		currency?: string;
		id?: number;
		name?: string;
	};
	created_at?: string;
	id?: number;
	is_billed?: boolean;
	is_closed?: boolean;
	is_locked?: boolean;
	is_running?: boolean;
	project?: {
		id?: number;
		name?: string;
	};
	spent_date?: string;
	task?: {
		id?: number;
		name?: string;
	};
	task_assignment?: {
		billable?: boolean;
		created_at?: string;
		id?: number;
		updated_at?: string;
	};
	updated_at?: string;
	user?: {
		id?: number;
		name?: string;
	};
	user_assignment?: {
		created_at?: string;
		id?: number;
		is_active?: boolean;
		is_project_manager?: boolean;
		updated_at?: string;
		use_default_rates?: boolean;
	};
};

export type HarvestV1UserGetAllOutput = {
	access_roles?: Array<string>;
	avatar_url?: string;
	calendar_integration_enabled?: boolean;
	can_create_projects?: boolean;
	created_at?: string;
	email?: string;
	first_name?: string;
	has_access_to_all_future_projects?: boolean;
	id?: number;
	is_active?: boolean;
	is_contractor?: boolean;
	last_name?: string;
	permissions_claims?: Array<string>;
	roles?: Array<string>;
	telephone?: string;
	timezone?: string;
	updated_at?: string;
	weekly_capacity?: number;
};

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

interface HarvestV1NodeBase {
	type: 'n8n-nodes-base.harvest';
	version: 1;
	credentials?: HarvestV1Credentials;
}

export type HarvestV1ClientCreateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ClientCreateConfig>;
};

export type HarvestV1ClientDeleteNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ClientDeleteConfig>;
};

export type HarvestV1ClientGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ClientGetConfig>;
};

export type HarvestV1ClientGetAllNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ClientGetAllConfig>;
	output?: HarvestV1ClientGetAllOutput;
};

export type HarvestV1ClientUpdateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ClientUpdateConfig>;
};

export type HarvestV1CompanyGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1CompanyGetConfig>;
};

export type HarvestV1ContactCreateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ContactCreateConfig>;
};

export type HarvestV1ContactDeleteNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ContactDeleteConfig>;
};

export type HarvestV1ContactGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ContactGetConfig>;
};

export type HarvestV1ContactGetAllNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ContactGetAllConfig>;
};

export type HarvestV1ContactUpdateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ContactUpdateConfig>;
};

export type HarvestV1EstimateCreateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1EstimateCreateConfig>;
};

export type HarvestV1EstimateDeleteNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1EstimateDeleteConfig>;
};

export type HarvestV1EstimateGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1EstimateGetConfig>;
};

export type HarvestV1EstimateGetAllNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1EstimateGetAllConfig>;
};

export type HarvestV1EstimateUpdateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1EstimateUpdateConfig>;
};

export type HarvestV1ExpenseCreateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ExpenseCreateConfig>;
};

export type HarvestV1ExpenseDeleteNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ExpenseDeleteConfig>;
};

export type HarvestV1ExpenseGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ExpenseGetConfig>;
};

export type HarvestV1ExpenseGetAllNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ExpenseGetAllConfig>;
};

export type HarvestV1ExpenseUpdateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ExpenseUpdateConfig>;
};

export type HarvestV1InvoiceCreateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1InvoiceCreateConfig>;
};

export type HarvestV1InvoiceDeleteNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1InvoiceDeleteConfig>;
};

export type HarvestV1InvoiceGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1InvoiceGetConfig>;
};

export type HarvestV1InvoiceGetAllNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1InvoiceGetAllConfig>;
	output?: HarvestV1InvoiceGetAllOutput;
};

export type HarvestV1InvoiceUpdateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1InvoiceUpdateConfig>;
};

export type HarvestV1ProjectCreateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ProjectCreateConfig>;
};

export type HarvestV1ProjectDeleteNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ProjectDeleteConfig>;
};

export type HarvestV1ProjectGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ProjectGetConfig>;
	output?: HarvestV1ProjectGetOutput;
};

export type HarvestV1ProjectGetAllNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ProjectGetAllConfig>;
	output?: HarvestV1ProjectGetAllOutput;
};

export type HarvestV1ProjectUpdateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1ProjectUpdateConfig>;
};

export type HarvestV1TaskCreateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TaskCreateConfig>;
};

export type HarvestV1TaskDeleteNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TaskDeleteConfig>;
};

export type HarvestV1TaskGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TaskGetConfig>;
};

export type HarvestV1TaskGetAllNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TaskGetAllConfig>;
};

export type HarvestV1TaskUpdateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TaskUpdateConfig>;
};

export type HarvestV1TimeEntryCreateByDurationNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TimeEntryCreateByDurationConfig>;
};

export type HarvestV1TimeEntryCreateByStartEndNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TimeEntryCreateByStartEndConfig>;
};

export type HarvestV1TimeEntryDeleteNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TimeEntryDeleteConfig>;
};

export type HarvestV1TimeEntryDeleteExternalNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TimeEntryDeleteExternalConfig>;
};

export type HarvestV1TimeEntryGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TimeEntryGetConfig>;
};

export type HarvestV1TimeEntryGetAllNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TimeEntryGetAllConfig>;
	output?: HarvestV1TimeEntryGetAllOutput;
};

export type HarvestV1TimeEntryRestartTimeNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TimeEntryRestartTimeConfig>;
};

export type HarvestV1TimeEntryStopTimeNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TimeEntryStopTimeConfig>;
};

export type HarvestV1TimeEntryUpdateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1TimeEntryUpdateConfig>;
};

export type HarvestV1UserCreateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1UserCreateConfig>;
};

export type HarvestV1UserDeleteNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1UserDeleteConfig>;
};

export type HarvestV1UserGetNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1UserGetConfig>;
};

export type HarvestV1UserGetAllNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1UserGetAllConfig>;
	output?: HarvestV1UserGetAllOutput;
};

export type HarvestV1UserMeNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1UserMeConfig>;
};

export type HarvestV1UserUpdateNode = HarvestV1NodeBase & {
	config: NodeConfig<HarvestV1UserUpdateConfig>;
};

export type HarvestV1Node =
	| HarvestV1ClientCreateNode
	| HarvestV1ClientDeleteNode
	| HarvestV1ClientGetNode
	| HarvestV1ClientGetAllNode
	| HarvestV1ClientUpdateNode
	| HarvestV1CompanyGetNode
	| HarvestV1ContactCreateNode
	| HarvestV1ContactDeleteNode
	| HarvestV1ContactGetNode
	| HarvestV1ContactGetAllNode
	| HarvestV1ContactUpdateNode
	| HarvestV1EstimateCreateNode
	| HarvestV1EstimateDeleteNode
	| HarvestV1EstimateGetNode
	| HarvestV1EstimateGetAllNode
	| HarvestV1EstimateUpdateNode
	| HarvestV1ExpenseCreateNode
	| HarvestV1ExpenseDeleteNode
	| HarvestV1ExpenseGetNode
	| HarvestV1ExpenseGetAllNode
	| HarvestV1ExpenseUpdateNode
	| HarvestV1InvoiceCreateNode
	| HarvestV1InvoiceDeleteNode
	| HarvestV1InvoiceGetNode
	| HarvestV1InvoiceGetAllNode
	| HarvestV1InvoiceUpdateNode
	| HarvestV1ProjectCreateNode
	| HarvestV1ProjectDeleteNode
	| HarvestV1ProjectGetNode
	| HarvestV1ProjectGetAllNode
	| HarvestV1ProjectUpdateNode
	| HarvestV1TaskCreateNode
	| HarvestV1TaskDeleteNode
	| HarvestV1TaskGetNode
	| HarvestV1TaskGetAllNode
	| HarvestV1TaskUpdateNode
	| HarvestV1TimeEntryCreateByDurationNode
	| HarvestV1TimeEntryCreateByStartEndNode
	| HarvestV1TimeEntryDeleteNode
	| HarvestV1TimeEntryDeleteExternalNode
	| HarvestV1TimeEntryGetNode
	| HarvestV1TimeEntryGetAllNode
	| HarvestV1TimeEntryRestartTimeNode
	| HarvestV1TimeEntryStopTimeNode
	| HarvestV1TimeEntryUpdateNode
	| HarvestV1UserCreateNode
	| HarvestV1UserDeleteNode
	| HarvestV1UserGetNode
	| HarvestV1UserGetAllNode
	| HarvestV1UserMeNode
	| HarvestV1UserUpdateNode
	;