/**
 * HubSpot Node - Version 2.1
 * Consume HubSpot API
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
// Output Types
// ===========================================================================

export type HubspotV21CompanyCreateOutput = {
	companyId?: number;
	isDeleted?: boolean;
	portalId?: number;
	properties?: {
		createdate?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				value?: string;
			}>;
		};
		hs_lastmodifieddate?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				value?: string;
			}>;
		};
		hs_object_id?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				value?: string;
			}>;
		};
		hs_object_source?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				value?: string;
			}>;
		};
		hs_object_source_id?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				value?: string;
			}>;
		};
		hs_object_source_label?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				value?: string;
			}>;
		};
		hs_pipeline?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				value?: string;
			}>;
		};
		lifecyclestage?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				value?: string;
			}>;
		};
		name?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				value?: string;
			}>;
		};
	};
};

export type HubspotV21CompanyGetAllOutput = {
	companyId?: number;
	isDeleted?: boolean;
	portalId?: number;
	properties?: {
		name?: {
			source?: string;
			timestamp?: number;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				updatedByUserId?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
	};
	stateChanges?: Array<{
		changeFlag?: string;
		timestamp?: number;
	}>;
};

export type HubspotV21CompanySearchByDomainOutput = {
	additionalDomains?: Array<{
		domain?: string;
		source?: string;
		sourceId?: string;
		timestamp?: number;
	}>;
	companyId?: number;
	isDeleted?: boolean;
	portalId?: number;
	properties?: {
		domain?: {
			source?: string;
			timestamp?: number;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				sourceVid?: Array<number>;
				timestamp?: number;
				updatedByUserId?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
	};
};

export type HubspotV21CompanyUpdateOutput = {
	companyId?: number;
	isDeleted?: boolean;
	portalId?: number;
	properties?: {
		createdate?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
		hs_lastmodifieddate?: {
			source?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
		hs_object_id?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
		hs_object_source?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
		hs_object_source_id?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
		hs_object_source_label?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
		hs_pipeline?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
		lifecyclestage?: {
			source?: string;
			sourceId?: string;
			timestamp?: number;
			updatedByUserId?: null;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				timestamp?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
	};
};

export type HubspotV21ContactUpsertOutput = {
	isNew?: boolean;
	vid?: number;
};

export type HubspotV21ContactGetOutput = {
	'canonical-vid'?: number;
	'form-submissions'?: Array<{
		'conversion-id'?: string;
		'form-id'?: string;
		'form-type'?: string;
		'portal-id'?: number;
		timestamp?: number;
		title?: string;
	}>;
	'identity-profiles'?: Array<{
		'deleted-changed-timestamp'?: number;
		identities?: Array<{
			'is-primary'?: boolean;
			timestamp?: number;
			type?: string;
			value?: string;
		}>;
		'saved-at-timestamp'?: number;
		vid?: number;
	}>;
	'is-contact'?: boolean;
	'list-memberships'?: Array<{
		'internal-list-id'?: number;
		'is-member'?: boolean;
		'static-list-id'?: number;
		timestamp?: number;
		vid?: number;
	}>;
	'portal-id'?: number;
	properties?: {
		createdate?: {
			value?: string;
		};
		email?: {
			value?: string;
		};
		firstname?: {
			value?: string;
		};
		hs_all_contact_vids?: {
			value?: string;
		};
		hs_analytics_average_page_views?: {
			value?: string;
		};
		hs_analytics_first_timestamp?: {
			value?: string;
		};
		hs_analytics_num_event_completions?: {
			value?: string;
		};
		hs_analytics_num_page_views?: {
			value?: string;
		};
		hs_analytics_num_visits?: {
			value?: string;
		};
		hs_analytics_revenue?: {
			value?: string;
		};
		hs_analytics_source?: {
			value?: string;
		};
		hs_analytics_source_data_1?: {
			value?: string;
		};
		hs_analytics_source_data_2?: {
			value?: string;
		};
		hs_associated_target_accounts?: {
			value?: string;
		};
		hs_currently_enrolled_in_prospecting_agent?: {
			value?: string;
		};
		hs_email_domain?: {
			value?: string;
		};
		hs_full_name_or_email?: {
			value?: string;
		};
		hs_is_contact?: {
			value?: string;
		};
		hs_is_unworked?: {
			value?: string;
		};
		hs_latest_source?: {
			value?: string;
		};
		hs_latest_source_data_1?: {
			value?: string;
		};
		hs_latest_source_data_2?: {
			value?: string;
		};
		hs_latest_source_timestamp?: {
			value?: string;
		};
		hs_lifecyclestage_lead_date?: {
			value?: string;
		};
		hs_membership_has_accessed_private_content?: {
			value?: string;
		};
		hs_object_id?: {
			value?: string;
		};
		hs_object_source?: {
			value?: string;
		};
		hs_object_source_id?: {
			value?: string;
		};
		hs_object_source_label?: {
			value?: string;
		};
		hs_pipeline?: {
			value?: string;
		};
		hs_prospecting_agent_actively_enrolled_count?: {
			value?: string;
		};
		hs_registered_member?: {
			value?: string;
		};
		hs_sequences_actively_enrolled_count?: {
			value?: string;
		};
		hs_social_facebook_clicks?: {
			value?: string;
		};
		hs_social_google_plus_clicks?: {
			value?: string;
		};
		hs_social_linkedin_clicks?: {
			value?: string;
		};
		hs_social_num_broadcast_clicks?: {
			value?: string;
		};
		hs_social_twitter_clicks?: {
			value?: string;
		};
		hs_updated_by_user_id?: {
			value?: string;
		};
		hs_v2_date_entered_lead?: {
			value?: string;
		};
		lastmodifieddate?: {
			value?: string;
		};
		lastname?: {
			value?: string;
		};
		lifecyclestage?: {
			value?: string;
		};
		num_conversion_events?: {
			value?: string;
		};
		num_notes?: {
			value?: string;
		};
		num_unique_conversion_events?: {
			value?: string;
		};
	};
	vid?: number;
};

export type HubspotV21ContactGetAllOutput = {
	addedAt?: number;
	'canonical-vid'?: number;
	'form-submissions'?: Array<{
		'contact-associated-by'?: Array<string>;
		'conversion-id'?: string;
		'form-id'?: string;
		'form-type'?: string;
		'page-title'?: string;
		'page-url'?: string;
		'portal-id'?: number;
		timestamp?: number;
		title?: string;
	}>;
	'identity-profiles'?: Array<{
		'deleted-changed-timestamp'?: number;
		identities?: Array<{
			'is-primary'?: boolean;
			timestamp?: number;
			type?: string;
			value?: string;
		}>;
		'saved-at-timestamp'?: number;
		vid?: number;
	}>;
	'is-contact'?: boolean;
	'merge-audits'?: Array<{
		'canonical-vid'?: number;
		'entity-id'?: string;
		'first-name'?: string;
		'is-reverted'?: boolean;
		'last-name'?: string;
		merged_from_email?: {
			'data-sensitivity'?: null;
			'is-encrypted'?: null;
			selected?: boolean;
			'source-id'?: string;
			'source-label'?: null;
			'source-type'?: string;
			timestamp?: number;
			value?: string;
		};
		merged_to_email?: {
			'data-sensitivity'?: null;
			'is-encrypted'?: null;
			selected?: boolean;
			'source-id'?: string;
			'source-label'?: null;
			'source-type'?: string;
			timestamp?: number;
			'updated-by-user-id'?: null;
			value?: string;
		};
		'num-properties-moved'?: number;
		'primary-vid-to-merge'?: number;
		timestamp?: number;
		'user-id'?: number;
		'vid-to-merge'?: number;
	}>;
	'merged-vids'?: Array<number>;
	'portal-id'?: number;
	properties?: {
		firstname?: {
			value?: string;
		};
		lastmodifieddate?: {
			value?: string;
		};
		lastname?: {
			value?: string;
		};
	};
	vid?: number;
};

export type HubspotV21ContactGetRecentlyCreatedUpdatedOutput = {
	addedAt?: number;
	'canonical-vid'?: number;
	'form-submissions'?: Array<{
		'contact-associated-by'?: Array<string>;
		'conversion-id'?: string;
		'form-id'?: string;
		'form-type'?: string;
		'page-title'?: string;
		'page-url'?: string;
		'portal-id'?: number;
		timestamp?: number;
		title?: string;
	}>;
	'identity-profiles'?: Array<{
		'deleted-changed-timestamp'?: number;
		identities?: Array<{
			'is-primary'?: boolean;
			timestamp?: number;
			type?: string;
			value?: string;
		}>;
		'saved-at-timestamp'?: number;
		vid?: number;
	}>;
	'is-contact'?: boolean;
	'merge-audits'?: Array<{
		'canonical-vid'?: number;
		'entity-id'?: string;
		'first-name'?: string;
		'is-reverted'?: boolean;
		'last-name'?: string;
		merged_from_email?: {
			'data-sensitivity'?: null;
			'is-encrypted'?: null;
			selected?: boolean;
			'source-label'?: null;
			'source-type'?: string;
			timestamp?: number;
			value?: string;
		};
		merged_to_email?: {
			'data-sensitivity'?: null;
			'is-encrypted'?: null;
			selected?: boolean;
			'source-label'?: null;
			'source-type'?: string;
			timestamp?: number;
			value?: string;
		};
		'num-properties-moved'?: number;
		'primary-vid-to-merge'?: number;
		timestamp?: number;
		'user-id'?: number;
		'vid-to-merge'?: number;
	}>;
	'merged-vids'?: Array<number>;
	'portal-id'?: number;
	properties?: {
		company?: {
			value?: string;
		};
		createdate?: {
			value?: string;
		};
		firstname?: {
			value?: string;
		};
		lastmodifieddate?: {
			value?: string;
		};
		lastname?: {
			value?: string;
		};
	};
	vid?: number;
};

export type HubspotV21ContactSearchOutput = {
	archived?: boolean;
	createdAt?: string;
	id?: string;
	properties?: {
		createdate?: string;
		hs_object_id?: string;
		lastmodifieddate?: string;
	};
	updatedAt?: string;
};

export type HubspotV21ContactListAddOutput = {
	discarded?: Array<number>;
	invalidEmails?: Array<string>;
	invalidVids?: Array<number>;
	updated?: Array<number>;
};

export type HubspotV21DealGetAllOutput = {
	isDeleted?: boolean;
	portalId?: number;
	stateChanges?: Array<{
		changeFlag?: string;
		timestamp?: number;
	}>;
};

export type HubspotV21DealSearchOutput = {
	archived?: boolean;
	createdAt?: string;
	id?: string;
	properties?: {
		createdate?: string;
		dealstage?: string;
		hs_lastmodifieddate?: string;
		hs_object_id?: string;
	};
	updatedAt?: string;
};

export type HubspotV21EngagementCreateOutput = {
	associations?: {
		companyIds?: Array<number>;
		contactIds?: Array<number>;
		dealIds?: Array<number>;
		ownerIds?: Array<number>;
		ticketIds?: Array<number>;
	};
	engagement?: {
		active?: boolean;
		bodyPreview?: string;
		bodyPreviewHtml?: string;
		bodyPreviewIsTruncated?: boolean;
		createdAt?: number;
		id?: number;
		lastUpdated?: number;
		portalId?: number;
		timestamp?: number;
		type?: string;
	};
	metadata?: {
		status?: string;
	};
};

export type HubspotV21EngagementGetOutput = {
	associations?: {
		companyIds?: Array<number>;
		contactIds?: Array<number>;
		dealIds?: Array<number>;
		ownerIds?: Array<number>;
		ticketIds?: Array<number>;
	};
	attachments?: Array<{
		id?: number;
	}>;
	engagement?: {
		active?: boolean;
		allAccessibleTeamIds?: Array<number>;
		bodyPreview?: string;
		bodyPreviewHtml?: string;
		bodyPreviewIsTruncated?: boolean;
		createdAt?: number;
		createdBy?: number;
		id?: number;
		lastUpdated?: number;
		modifiedBy?: number;
		ownerId?: number;
		portalId?: number;
		queueMembershipIds?: Array<number>;
		source?: string;
		timestamp?: number;
		type?: string;
		uid?: string;
	};
	metadata?: {
		cc?: Array<{
			email?: string;
			firstName?: string;
			lastName?: string;
			raw?: string;
		}>;
		html?: string;
		ownerIdsCc?: Array<number>;
		ownerIdsFrom?: Array<number>;
		ownerIdsTo?: Array<number>;
		status?: string;
		subject?: string;
		to?: Array<{
			email?: string;
			firstName?: string;
			lastName?: string;
			raw?: string;
		}>;
	};
};

export type HubspotV21EngagementGetAllOutput = {
	associations?: {
		companyIds?: Array<number>;
		contactIds?: Array<number>;
		dealIds?: Array<number>;
		ownerIds?: Array<number>;
		ticketIds?: Array<number>;
	};
	attachments?: Array<{
		id?: number;
	}>;
	engagement?: {
		active?: boolean;
		allAccessibleTeamIds?: Array<number>;
		bodyPreview?: string;
		bodyPreviewHtml?: string;
		bodyPreviewIsTruncated?: boolean;
		createdAt?: number;
		createdBy?: number;
		id?: number;
		lastUpdated?: number;
		modifiedBy?: number;
		ownerId?: number;
		portalId?: number;
		queueMembershipIds?: Array<number>;
		source?: string;
		timestamp?: number;
		type?: string;
	};
	metadata?: {
		body?: string;
		forObjectType?: string;
		isAllDay?: boolean;
		priority?: string;
		reminders?: Array<number>;
		sendDefaultReminder?: boolean;
		status?: string;
		subject?: string;
		taskType?: string;
	};
	scheduledTasks?: Array<{
		engagementId?: number;
		engagementType?: string;
		portalId?: number;
		taskType?: string;
		timestamp?: number;
		uuid?: string;
	}>;
};

export type HubspotV21TicketDeleteOutput = {
	deleted?: boolean;
};

export type HubspotV21TicketGetOutput = {
	isDeleted?: boolean;
	objectId?: number;
	objectType?: string;
	portalId?: number;
};

export type HubspotV21TicketGetAllOutput = {
	isDeleted?: boolean;
	objectId?: number;
	objectType?: string;
	portalId?: number;
	properties?: {
		subject?: {
			isEncrypted?: boolean;
			sensitivityLevel?: string;
			source?: string;
			timestamp?: number;
			value?: string;
			versions?: Array<{
				name?: string;
				requestId?: string;
				source?: string;
				sourceId?: string;
				sourceUpstreamDeployable?: string;
				timestamp?: number;
				updatedByUserId?: number;
				useTimestampAsPersistenceTimestamp?: boolean;
				value?: string;
			}>;
		};
	};
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface HubspotV21Credentials {
	hubspotApi: CredentialReference;
	hubspotAppToken: CredentialReference;
	hubspotOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HubspotV21NodeBase {
	type: 'n8n-nodes-base.hubspot';
	version: 2.1;
	credentials?: HubspotV21Credentials;
}

export type HubspotV21CompanyCreateNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21CompanyCreateConfig>;
	output?: HubspotV21CompanyCreateOutput;
};

export type HubspotV21CompanyDeleteNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21CompanyDeleteConfig>;
};

export type HubspotV21CompanyGetNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21CompanyGetConfig>;
};

export type HubspotV21CompanyGetAllNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21CompanyGetAllConfig>;
	output?: HubspotV21CompanyGetAllOutput;
};

export type HubspotV21CompanyGetRecentlyCreatedUpdatedNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21CompanyGetRecentlyCreatedUpdatedConfig>;
};

export type HubspotV21CompanySearchByDomainNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21CompanySearchByDomainConfig>;
	output?: HubspotV21CompanySearchByDomainOutput;
};

export type HubspotV21CompanyUpdateNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21CompanyUpdateConfig>;
	output?: HubspotV21CompanyUpdateOutput;
};

export type HubspotV21ContactUpsertNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21ContactUpsertConfig>;
	output?: HubspotV21ContactUpsertOutput;
};

export type HubspotV21ContactDeleteNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21ContactDeleteConfig>;
};

export type HubspotV21ContactGetNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21ContactGetConfig>;
	output?: HubspotV21ContactGetOutput;
};

export type HubspotV21ContactGetAllNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21ContactGetAllConfig>;
	output?: HubspotV21ContactGetAllOutput;
};

export type HubspotV21ContactGetRecentlyCreatedUpdatedNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21ContactGetRecentlyCreatedUpdatedConfig>;
	output?: HubspotV21ContactGetRecentlyCreatedUpdatedOutput;
};

export type HubspotV21ContactSearchNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21ContactSearchConfig>;
	output?: HubspotV21ContactSearchOutput;
};

export type HubspotV21ContactListAddNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21ContactListAddConfig>;
	output?: HubspotV21ContactListAddOutput;
};

export type HubspotV21ContactListRemoveNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21ContactListRemoveConfig>;
};

export type HubspotV21DealCreateNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21DealCreateConfig>;
};

export type HubspotV21DealDeleteNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21DealDeleteConfig>;
};

export type HubspotV21DealGetNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21DealGetConfig>;
};

export type HubspotV21DealGetAllNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21DealGetAllConfig>;
	output?: HubspotV21DealGetAllOutput;
};

export type HubspotV21DealGetRecentlyCreatedUpdatedNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21DealGetRecentlyCreatedUpdatedConfig>;
};

export type HubspotV21DealSearchNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21DealSearchConfig>;
	output?: HubspotV21DealSearchOutput;
};

export type HubspotV21DealUpdateNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21DealUpdateConfig>;
};

export type HubspotV21EngagementCreateNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21EngagementCreateConfig>;
	output?: HubspotV21EngagementCreateOutput;
};

export type HubspotV21EngagementDeleteNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21EngagementDeleteConfig>;
};

export type HubspotV21EngagementGetNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21EngagementGetConfig>;
	output?: HubspotV21EngagementGetOutput;
};

export type HubspotV21EngagementGetAllNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21EngagementGetAllConfig>;
	output?: HubspotV21EngagementGetAllOutput;
};

export type HubspotV21TicketCreateNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21TicketCreateConfig>;
};

export type HubspotV21TicketDeleteNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21TicketDeleteConfig>;
	output?: HubspotV21TicketDeleteOutput;
};

export type HubspotV21TicketGetNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21TicketGetConfig>;
	output?: HubspotV21TicketGetOutput;
};

export type HubspotV21TicketGetAllNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21TicketGetAllConfig>;
	output?: HubspotV21TicketGetAllOutput;
};

export type HubspotV21TicketUpdateNode = HubspotV21NodeBase & {
	config: NodeConfig<HubspotV21TicketUpdateConfig>;
};

export type HubspotV21Node =
	| HubspotV21CompanyCreateNode
	| HubspotV21CompanyDeleteNode
	| HubspotV21CompanyGetNode
	| HubspotV21CompanyGetAllNode
	| HubspotV21CompanyGetRecentlyCreatedUpdatedNode
	| HubspotV21CompanySearchByDomainNode
	| HubspotV21CompanyUpdateNode
	| HubspotV21ContactUpsertNode
	| HubspotV21ContactDeleteNode
	| HubspotV21ContactGetNode
	| HubspotV21ContactGetAllNode
	| HubspotV21ContactGetRecentlyCreatedUpdatedNode
	| HubspotV21ContactSearchNode
	| HubspotV21ContactListAddNode
	| HubspotV21ContactListRemoveNode
	| HubspotV21DealCreateNode
	| HubspotV21DealDeleteNode
	| HubspotV21DealGetNode
	| HubspotV21DealGetAllNode
	| HubspotV21DealGetRecentlyCreatedUpdatedNode
	| HubspotV21DealSearchNode
	| HubspotV21DealUpdateNode
	| HubspotV21EngagementCreateNode
	| HubspotV21EngagementDeleteNode
	| HubspotV21EngagementGetNode
	| HubspotV21EngagementGetAllNode
	| HubspotV21TicketCreateNode
	| HubspotV21TicketDeleteNode
	| HubspotV21TicketGetNode
	| HubspotV21TicketGetAllNode
	| HubspotV21TicketUpdateNode
	;