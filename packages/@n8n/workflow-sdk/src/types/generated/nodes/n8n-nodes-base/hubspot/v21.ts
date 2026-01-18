/**
 * HubSpot Node - Version 2.1
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
export type HubspotV21CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV21CompanyDeleteConfig = {
	resource: 'company';
	operation: 'delete';
	companyId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV21CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	companyId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV21CompanyGetAllConfig = {
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
export type HubspotV21CompanyGetRecentlyCreatedUpdatedConfig = {
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
export type HubspotV21CompanySearchByDomainConfig = {
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
export type HubspotV21CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	companyId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Create a new contact, or update the current one if it already exists (upsert) */
export type HubspotV21ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV21ContactDeleteConfig = {
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
export type HubspotV21ContactGetConfig = {
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
export type HubspotV21ContactGetAllConfig = {
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
export type HubspotV21ContactGetRecentlyCreatedUpdatedConfig = {
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
export type HubspotV21ContactSearchConfig = {
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
export type HubspotV21ContactListAddConfig = {
	resource: 'contactList';
	operation: 'add';
	by: 'id' | 'email' | Expression<string>;
	email: string | Expression<string>;
	id: number | Expression<number>;
	listId: number | Expression<number>;
};

/** Remove a contact from a list */
export type HubspotV21ContactListRemoveConfig = {
	resource: 'contactList';
	operation: 'remove';
	id: number | Expression<number>;
	listId: number | Expression<number>;
};

/** Create a company */
export type HubspotV21DealCreateConfig = {
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
export type HubspotV21DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
	dealId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV21DealGetConfig = {
	resource: 'deal';
	operation: 'get';
	dealId: ResourceLocatorValue;
	filters?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV21DealGetAllConfig = {
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
export type HubspotV21DealGetRecentlyCreatedUpdatedConfig = {
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
export type HubspotV21DealSearchConfig = {
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
export type HubspotV21DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
	dealId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Create a company */
export type HubspotV21EngagementCreateConfig = {
	resource: 'engagement';
	operation: 'create';
	type: 'call' | 'email' | 'meeting' | 'task' | Expression<string>;
	metadata?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV21EngagementDeleteConfig = {
	resource: 'engagement';
	operation: 'delete';
	engagementId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV21EngagementGetConfig = {
	resource: 'engagement';
	operation: 'get';
	engagementId: ResourceLocatorValue;
};

/** Get many contacts */
export type HubspotV21EngagementGetAllConfig = {
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
export type HubspotV21TicketCreateConfig = {
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
export type HubspotV21TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
	ticketId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV21TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	ticketId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV21TicketGetAllConfig = {
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
export type HubspotV21TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
	ticketId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

export type HubspotV21Params =
	| HubspotV21CompanyCreateConfig
	| HubspotV21CompanyDeleteConfig
	| HubspotV21CompanyGetConfig
	| HubspotV21CompanyGetAllConfig
	| HubspotV21CompanyGetRecentlyCreatedUpdatedConfig
	| HubspotV21CompanySearchByDomainConfig
	| HubspotV21CompanyUpdateConfig
	| HubspotV21ContactUpsertConfig
	| HubspotV21ContactDeleteConfig
	| HubspotV21ContactGetConfig
	| HubspotV21ContactGetAllConfig
	| HubspotV21ContactGetRecentlyCreatedUpdatedConfig
	| HubspotV21ContactSearchConfig
	| HubspotV21ContactListAddConfig
	| HubspotV21ContactListRemoveConfig
	| HubspotV21DealCreateConfig
	| HubspotV21DealDeleteConfig
	| HubspotV21DealGetConfig
	| HubspotV21DealGetAllConfig
	| HubspotV21DealGetRecentlyCreatedUpdatedConfig
	| HubspotV21DealSearchConfig
	| HubspotV21DealUpdateConfig
	| HubspotV21EngagementCreateConfig
	| HubspotV21EngagementDeleteConfig
	| HubspotV21EngagementGetConfig
	| HubspotV21EngagementGetAllConfig
	| HubspotV21TicketCreateConfig
	| HubspotV21TicketDeleteConfig
	| HubspotV21TicketGetConfig
	| HubspotV21TicketGetAllConfig
	| HubspotV21TicketUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HubspotV21Credentials {
	hubspotApi: CredentialReference;
	hubspotAppToken: CredentialReference;
	hubspotOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type HubspotV21Node = {
	type: 'n8n-nodes-base.hubspot';
	version: 2.1;
	config: NodeConfig<HubspotV21Params>;
	credentials?: HubspotV21Credentials;
};