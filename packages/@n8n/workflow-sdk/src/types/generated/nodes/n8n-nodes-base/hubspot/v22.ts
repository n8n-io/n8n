/**
 * HubSpot Node - Version 2.2
 * Consume HubSpot API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
 * @displayOptions.show { resource: ["company"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["company"], operation: ["getRecentlyCreatedUpdated"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getRecentlyCreatedUpdated"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["company"], operation: ["searchByDomain"] }
 */
		domain: string | Expression<string>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["company"], operation: ["searchByDomain"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["searchByDomain"], returnAll: [false] }
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
 * @hint To lookup a user by their email, use the Search operation
 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
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
 * @hint To lookup a user by their email, use the Search operation
 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
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
	additionalFields?: Record<string, unknown>;
};

/** Get recently created/updated contacts */
export type HubspotV22ContactGetRecentlyCreatedUpdatedConfig = {
	resource: 'contact';
	operation: 'getRecentlyCreatedUpdated';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["contact"], operation: ["getRecentlyCreatedUpdated"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contact"], operation: ["getRecentlyCreatedUpdated"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["contact"], operation: ["search"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * When multiple filters are provided within a Filter Group, they will be combined using a logical AND operator. When multiple Filter Groups are provided, they will be combined using a logical OR operator. The system supports a maximum of three Filter Groups with up to three filters each. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["contact"], operation: ["search"] }
 * @default {}
 */
		filterGroupsUi?: {
		filterGroupsValues?: Array<{
			/** Use filters to limit the results to only CRM objects with matching property values. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;.
			 * @default {}
			 */
			filtersUi?: {
		filterValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			propertyName?: string | Expression<string>;
			/** Type
			 * @default ={{$parameter["&propertyName"].split("|")[1]}}
			 */
			type?: unknown;
			/** Operator
			 * @displayOptions.hide { type: ["number"] }
			 * @default EQ
			 */
			operator?: 'CONTAINS_TOKEN' | 'EQ' | 'HAS_PROPERTY' | 'NOT_HAS_PROPERTY' | 'NEQ' | Expression<string>;
			/** Operator
			 * @displayOptions.show { type: ["number"] }
			 * @default EQ
			 */
			operator?: 'CONTAINS_TOKEN' | 'EQ' | 'GT' | 'GTE' | 'HAS_PROPERTY' | 'NOT_HAS_PROPERTY' | 'LT' | 'LTE' | 'NEQ' | Expression<string>;
			/** Value
			 * @displayOptions.hide { operator: ["HAS_PROPERTY", "NOT_HAS_PROPERTY"] }
			 */
			value?: string | Expression<string>;
		}>;
	};
		}>;
	};
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
 * @displayOptions.show { resource: ["deal"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["deal"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["deal"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["deal"], operation: ["getRecentlyCreatedUpdated"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["deal"], operation: ["getRecentlyCreatedUpdated"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["deal"], operation: ["search"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["deal"], operation: ["search"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
/**
 * When multiple filters are provided within a Filter Group, they will be combined using a logical AND operator. When multiple Filter Groups are provided, they will be combined using a logical OR operator. The system supports a maximum of three Filter Groups with up to three filters each. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;
 * @displayOptions.show { resource: ["deal"], operation: ["search"] }
 * @default {}
 */
		filterGroupsUi?: {
		filterGroupsValues?: Array<{
			/** Use filters to limit the results to only CRM objects with matching property values. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;.
			 * @default {}
			 */
			filtersUi?: {
		filterValues?: Array<{
			/** Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
			 */
			propertyName?: string | Expression<string>;
			/** Type
			 * @default ={{$parameter["&propertyName"].split("|")[1]}}
			 */
			type?: unknown;
			/** Operator
			 * @displayOptions.hide { type: ["number"] }
			 * @default EQ
			 */
			operator?: 'CONTAINS_TOKEN' | 'EQ' | 'HAS_PROPERTY' | 'NOT_HAS_PROPERTY' | 'NEQ' | Expression<string>;
			/** Operator
			 * @displayOptions.show { type: ["number"] }
			 * @default EQ
			 */
			operator?: 'CONTAINS_TOKEN' | 'EQ' | 'GT' | 'GTE' | 'HAS_PROPERTY' | 'NOT_HAS_PROPERTY' | 'LT' | 'LTE' | 'NEQ' | Expression<string>;
			/** Value
			 * @displayOptions.hide { operator: ["HAS_PROPERTY", "NOT_HAS_PROPERTY"] }
			 */
			value?: string | Expression<string>;
		}>;
	};
		}>;
	};
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
 * @displayOptions.show { resource: ["engagement"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["engagement"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
 */
		pipelineId: string | Expression<string>;
/**
 * The stage ID of the pipeline the ticket is in; depends on Pipeline ID. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"], returnAll: [false] }
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
	| HubspotV22TicketUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HubspotV22Credentials {
	hubspotApi: CredentialReference;
	hubspotAppToken: CredentialReference;
	hubspotOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type HubspotV22Node = {
	type: 'n8n-nodes-base.hubspot';
	version: 2.2;
	config: NodeConfig<HubspotV22Params>;
	credentials?: HubspotV22Credentials;
};