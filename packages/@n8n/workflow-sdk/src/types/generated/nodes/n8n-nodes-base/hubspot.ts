/**
 * HubSpot Node Types
 *
 * Consume HubSpot API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/hubspot/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// Helper types for special n8n fields
type ResourceLocatorValue = { __rl: true; mode: string; value: string; cachedResultName?: string };

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a company */
export type HubspotV22CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV22CompanyDeleteConfig = {
	resource: 'company';
	operation: 'delete';
	companyId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV22CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	companyId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV22CompanyGetAllConfig = {
	resource: 'company';
	operation: 'getAll';
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
	options?: Record<string, unknown>;
};

/** Get recently created/updated contacts */
export type HubspotV22CompanyGetRecentlyCreatedUpdatedConfig = {
	resource: 'company';
	operation: 'getRecentlyCreatedUpdated';
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
	additionalFields?: Record<string, unknown>;
};

/** Search companies by their website domain */
export type HubspotV22CompanySearchByDomainConfig = {
	resource: 'company';
	operation: 'searchByDomain';
	/**
	 * The company's website domain to search for, like n8n.io
	 */
	domain: string | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Update a company */
export type HubspotV22CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	companyId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Create a new contact, or update the current one if it already exists (upsert) */
export type HubspotV22ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV22ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * This is not a contact's email but a number like 1485
	 * @default {"mode":"list","value":""}
	 */
	contactId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV22ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * This is not a contact's email but a number like 1485
	 * @default {"mode":"list","value":""}
	 */
	contactId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV22ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
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
	additionalFields?: Record<string, unknown>;
};

/** Get recently created/updated contacts */
export type HubspotV22ContactGetRecentlyCreatedUpdatedConfig = {
	resource: 'contact';
	operation: 'getRecentlyCreatedUpdated';
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
	additionalFields?: Record<string, unknown>;
};

/** Search contacts */
export type HubspotV22ContactSearchConfig = {
	resource: 'contact';
	operation: 'search';
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
	/**
	 * When multiple filters are provided within a Filter Group, they will be combined using a logical AND operator. When multiple Filter Groups are provided, they will be combined using a logical OR operator. The system supports a maximum of three Filter Groups with up to three filters each. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;
	 * @default {}
	 */
	filterGroupsUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Add contact to a list */
export type HubspotV22ContactListAddConfig = {
	resource: 'contactList';
	operation: 'add';
	by: 'id' | 'email' | Expression<string>;
	email: string | Expression<string>;
	id: number | Expression<number>;
	listId: number | Expression<number>;
};

/** Remove a contact from a list */
export type HubspotV22ContactListRemoveConfig = {
	resource: 'contactList';
	operation: 'remove';
	id: number | Expression<number>;
	listId: number | Expression<number>;
};

/** Create a company */
export type HubspotV22DealCreateConfig = {
	resource: 'deal';
	operation: 'create';
	/**
	 * The deal stage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	stage: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV22DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
	dealId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV22DealGetConfig = {
	resource: 'deal';
	operation: 'get';
	dealId: ResourceLocatorValue;
	filters?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV22DealGetAllConfig = {
	resource: 'deal';
	operation: 'getAll';
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

/** Get recently created/updated contacts */
export type HubspotV22DealGetRecentlyCreatedUpdatedConfig = {
	resource: 'deal';
	operation: 'getRecentlyCreatedUpdated';
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

/** Search contacts */
export type HubspotV22DealSearchConfig = {
	resource: 'deal';
	operation: 'search';
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
	/**
	 * When multiple filters are provided within a Filter Group, they will be combined using a logical AND operator. When multiple Filter Groups are provided, they will be combined using a logical OR operator. The system supports a maximum of three Filter Groups with up to three filters each. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;
	 * @default {}
	 */
	filterGroupsUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Update a company */
export type HubspotV22DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
	dealId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Create a company */
export type HubspotV22EngagementCreateConfig = {
	resource: 'engagement';
	operation: 'create';
	type: 'call' | 'email' | 'meeting' | 'task' | Expression<string>;
	/**
	 * The due date for the task
	 */
	dueDate: string | Expression<string>;
	metadata?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV22EngagementDeleteConfig = {
	resource: 'engagement';
	operation: 'delete';
	engagementId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV22EngagementGetConfig = {
	resource: 'engagement';
	operation: 'get';
	engagementId: ResourceLocatorValue;
};

/** Get many contacts */
export type HubspotV22EngagementGetAllConfig = {
	resource: 'engagement';
	operation: 'getAll';
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
};

/** Create a company */
export type HubspotV22TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
	/**
	 * The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	pipelineId: string | Expression<string>;
	/**
	 * The stage ID of the pipeline the ticket is in; depends on Pipeline ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	stageId: string | Expression<string>;
	ticketName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV22TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
	ticketId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV22TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	ticketId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV22TicketGetAllConfig = {
	resource: 'ticket';
	operation: 'getAll';
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
	additionalFields?: Record<string, unknown>;
};

/** Update a company */
export type HubspotV22TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
	ticketId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

export type HubspotV22Params =
	| HubspotV22CompanyCreateConfig
	| HubspotV22CompanyDeleteConfig
	| HubspotV22CompanyGetConfig
	| HubspotV22CompanyGetAllConfig
	| HubspotV22CompanyGetRecentlyCreatedUpdatedConfig
	| HubspotV22CompanySearchByDomainConfig
	| HubspotV22CompanyUpdateConfig
	| HubspotV22ContactUpsertConfig
	| HubspotV22ContactDeleteConfig
	| HubspotV22ContactGetConfig
	| HubspotV22ContactGetAllConfig
	| HubspotV22ContactGetRecentlyCreatedUpdatedConfig
	| HubspotV22ContactSearchConfig
	| HubspotV22ContactListAddConfig
	| HubspotV22ContactListRemoveConfig
	| HubspotV22DealCreateConfig
	| HubspotV22DealDeleteConfig
	| HubspotV22DealGetConfig
	| HubspotV22DealGetAllConfig
	| HubspotV22DealGetRecentlyCreatedUpdatedConfig
	| HubspotV22DealSearchConfig
	| HubspotV22DealUpdateConfig
	| HubspotV22EngagementCreateConfig
	| HubspotV22EngagementDeleteConfig
	| HubspotV22EngagementGetConfig
	| HubspotV22EngagementGetAllConfig
	| HubspotV22TicketCreateConfig
	| HubspotV22TicketDeleteConfig
	| HubspotV22TicketGetConfig
	| HubspotV22TicketGetAllConfig
	| HubspotV22TicketUpdateConfig;

/** Create a company */
export type HubspotV1CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV1CompanyDeleteConfig = {
	resource: 'company';
	operation: 'delete';
	/**
	 * Unique identifier for a particular company
	 */
	companyId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	/**
	 * Unique identifier for a particular company
	 */
	companyId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV1CompanyGetAllConfig = {
	resource: 'company';
	operation: 'getAll';
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
	options?: Record<string, unknown>;
};

/** Get recently created companies */
export type HubspotV1CompanyGetRecentlyCreatedConfig = {
	resource: 'company';
	operation: 'getRecentlyCreated';
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
};

/** Get recently modified companies */
export type HubspotV1CompanyGetRecentlyModifiedConfig = {
	resource: 'company';
	operation: 'getRecentlyModified';
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

/** Search companies by domain */
export type HubspotV1CompanySearchByDomainConfig = {
	resource: 'company';
	operation: 'searchByDomain';
	/**
	 * The company's website domain to search for, like n8n.io
	 */
	domain: string | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Update a company */
export type HubspotV1CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	/**
	 * Unique identifier for a particular company
	 */
	companyId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a new contact, or update the current one if it already exists (upsert) */
export type HubspotV1ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	email: string | Expression<string>;
	/**
	 * By default the response only includes the ID. If this option gets activated, it will resolve the data automatically.
	 * @default true
	 */
	resolveData?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	/**
	 * Unique identifier for a particular contact
	 */
	contactId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * Unique identifier for a particular contact
	 */
	contactId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
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
	additionalFields?: Record<string, unknown>;
};

/** Get recently created/updated contacts */
export type HubspotV1ContactGetRecentlyCreatedUpdatedConfig = {
	resource: 'contact';
	operation: 'getRecentlyCreatedUpdated';
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

/** Search contacts */
export type HubspotV1ContactSearchConfig = {
	resource: 'contact';
	operation: 'search';
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
	/**
	 * When multiple filters are provided within a filterGroup, they will be combined using a logical AND operator. When multiple filterGroups are provided, they will be combined using a logical OR operator. The system supports a maximum of three filterGroups with up to three filters each. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;
	 * @default {}
	 */
	filterGroupsUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Add contact to a list */
export type HubspotV1ContactListAddConfig = {
	resource: 'contactList';
	operation: 'add';
	by: 'id' | 'email' | Expression<string>;
	email: string | Expression<string>;
	id: string | Expression<string>;
	listId: string | Expression<string>;
};

/** Remove a contact from a list */
export type HubspotV1ContactListRemoveConfig = {
	resource: 'contactList';
	operation: 'remove';
	id: string | Expression<string>;
	listId: string | Expression<string>;
};

/** Create a company */
export type HubspotV1DealCreateConfig = {
	resource: 'deal';
	operation: 'create';
	/**
	 * The dealstage is required when creating a deal. See the CRM Pipelines API for details on managing pipelines and stages. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	stage: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV1DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
	/**
	 * Unique identifier for a particular deal
	 */
	dealId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1DealGetConfig = {
	resource: 'deal';
	operation: 'get';
	/**
	 * Unique identifier for a particular deal
	 */
	dealId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV1DealGetAllConfig = {
	resource: 'deal';
	operation: 'getAll';
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

/** Get recently created companies */
export type HubspotV1DealGetRecentlyCreatedConfig = {
	resource: 'deal';
	operation: 'getRecentlyCreated';
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

/** Get recently modified companies */
export type HubspotV1DealGetRecentlyModifiedConfig = {
	resource: 'deal';
	operation: 'getRecentlyModified';
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

/** Search contacts */
export type HubspotV1DealSearchConfig = {
	resource: 'deal';
	operation: 'search';
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
	/**
	 * When multiple filters are provided within a filterGroup, they will be combined using a logical AND operator. When multiple filterGroups are provided, they will be combined using a logical OR operator. The system supports a maximum of three filterGroups with up to three filters each. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;
	 * @default {}
	 */
	filterGroupsUi?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Update a company */
export type HubspotV1DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
	/**
	 * Unique identifier for a particular deal
	 */
	dealId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a company */
export type HubspotV1EngagementCreateConfig = {
	resource: 'engagement';
	operation: 'create';
	type: 'call' | 'email' | 'meeting' | 'task' | Expression<string>;
	metadata?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV1EngagementDeleteConfig = {
	resource: 'engagement';
	operation: 'delete';
	/**
	 * Unique identifier for a particular engagement
	 */
	engagementId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1EngagementGetConfig = {
	resource: 'engagement';
	operation: 'get';
	/**
	 * Unique identifier for a particular engagement
	 */
	engagementId: string | Expression<string>;
};

/** Get many contacts */
export type HubspotV1EngagementGetAllConfig = {
	resource: 'engagement';
	operation: 'getAll';
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
};

/** Get all fields from a form */
export type HubspotV1FormGetFieldsConfig = {
	resource: 'form';
	operation: 'getFields';
	/**
	 * The ID of the form. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
};

/** Submit data to a form */
export type HubspotV1FormSubmitConfig = {
	resource: 'form';
	operation: 'submit';
	/**
	 * The ID of the form you're sending data to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	formId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	contextUi?: Record<string, unknown>;
	lengalConsentUi?: Record<string, unknown>;
};

/** Create a company */
export type HubspotV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
	/**
	 * The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	pipelineId: string | Expression<string>;
	/**
	 * The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 */
	stageId: string | Expression<string>;
	/**
	 * The ID of the pipeline the ticket is in
	 */
	ticketName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV1TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
	/**
	 * Unique identifier for a particular ticket
	 */
	ticketId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	/**
	 * Unique identifier for a particular ticket
	 */
	ticketId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV1TicketGetAllConfig = {
	resource: 'ticket';
	operation: 'getAll';
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
	additionalFields?: Record<string, unknown>;
};

/** Update a company */
export type HubspotV1TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
	/**
	 * Unique identifier for a particular ticket
	 */
	ticketId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type HubspotV1Params =
	| HubspotV1CompanyCreateConfig
	| HubspotV1CompanyDeleteConfig
	| HubspotV1CompanyGetConfig
	| HubspotV1CompanyGetAllConfig
	| HubspotV1CompanyGetRecentlyCreatedConfig
	| HubspotV1CompanyGetRecentlyModifiedConfig
	| HubspotV1CompanySearchByDomainConfig
	| HubspotV1CompanyUpdateConfig
	| HubspotV1ContactUpsertConfig
	| HubspotV1ContactDeleteConfig
	| HubspotV1ContactGetConfig
	| HubspotV1ContactGetAllConfig
	| HubspotV1ContactGetRecentlyCreatedUpdatedConfig
	| HubspotV1ContactSearchConfig
	| HubspotV1ContactListAddConfig
	| HubspotV1ContactListRemoveConfig
	| HubspotV1DealCreateConfig
	| HubspotV1DealDeleteConfig
	| HubspotV1DealGetConfig
	| HubspotV1DealGetAllConfig
	| HubspotV1DealGetRecentlyCreatedConfig
	| HubspotV1DealGetRecentlyModifiedConfig
	| HubspotV1DealSearchConfig
	| HubspotV1DealUpdateConfig
	| HubspotV1EngagementCreateConfig
	| HubspotV1EngagementDeleteConfig
	| HubspotV1EngagementGetConfig
	| HubspotV1EngagementGetAllConfig
	| HubspotV1FormGetFieldsConfig
	| HubspotV1FormSubmitConfig
	| HubspotV1TicketCreateConfig
	| HubspotV1TicketDeleteConfig
	| HubspotV1TicketGetConfig
	| HubspotV1TicketGetAllConfig
	| HubspotV1TicketUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HubspotV22Credentials {
	hubspotApi: CredentialReference;
	hubspotAppToken: CredentialReference;
	hubspotOAuth2Api: CredentialReference;
}

export interface HubspotV1Credentials {
	hubspotApi: CredentialReference;
	hubspotAppToken: CredentialReference;
	hubspotOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type HubspotV22Node = {
	type: 'n8n-nodes-base.hubspot';
	version: 2 | 2.1 | 2.2;
	config: NodeConfig<HubspotV22Params>;
	credentials?: HubspotV22Credentials;
};

export type HubspotV1Node = {
	type: 'n8n-nodes-base.hubspot';
	version: 1;
	config: NodeConfig<HubspotV1Params>;
	credentials?: HubspotV1Credentials;
};

export type HubspotNode = HubspotV22Node | HubspotV1Node;
