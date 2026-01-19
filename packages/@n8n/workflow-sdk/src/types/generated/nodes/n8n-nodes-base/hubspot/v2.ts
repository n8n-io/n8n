/**
 * HubSpot Node - Version 2
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
export type HubspotV2CompanyCreateConfig = {
	resource: 'company';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV2CompanyDeleteConfig = {
	resource: 'company';
	operation: 'delete';
	companyId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV2CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
	companyId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV2CompanyGetAllConfig = {
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
export type HubspotV2CompanyGetRecentlyCreatedUpdatedConfig = {
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
export type HubspotV2CompanySearchByDomainConfig = {
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
export type HubspotV2CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
	companyId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Create a new contact, or update the current one if it already exists (upsert) */
export type HubspotV2ContactUpsertConfig = {
	resource: 'contact';
	operation: 'upsert';
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV2ContactDeleteConfig = {
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
export type HubspotV2ContactGetConfig = {
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
export type HubspotV2ContactGetAllConfig = {
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
export type HubspotV2ContactGetRecentlyCreatedUpdatedConfig = {
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
export type HubspotV2ContactSearchConfig = {
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
export type HubspotV2ContactListAddConfig = {
	resource: 'contactList';
	operation: 'add';
	by: 'id' | 'email' | Expression<string>;
	email: string | Expression<string>;
	id: number | Expression<number>;
	listId: number | Expression<number>;
};

/** Remove a contact from a list */
export type HubspotV2ContactListRemoveConfig = {
	resource: 'contactList';
	operation: 'remove';
	id: number | Expression<number>;
	listId: number | Expression<number>;
};

/** Create a company */
export type HubspotV2DealCreateConfig = {
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
export type HubspotV2DealDeleteConfig = {
	resource: 'deal';
	operation: 'delete';
	dealId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV2DealGetConfig = {
	resource: 'deal';
	operation: 'get';
	dealId: ResourceLocatorValue;
	filters?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV2DealGetAllConfig = {
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
export type HubspotV2DealGetRecentlyCreatedUpdatedConfig = {
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
export type HubspotV2DealSearchConfig = {
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
export type HubspotV2DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
	dealId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

/** Create a company */
export type HubspotV2EngagementCreateConfig = {
	resource: 'engagement';
	operation: 'create';
	type: 'call' | 'email' | 'meeting' | 'task' | Expression<string>;
	metadata?: Record<string, unknown>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a contact */
export type HubspotV2EngagementDeleteConfig = {
	resource: 'engagement';
	operation: 'delete';
	engagementId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV2EngagementGetConfig = {
	resource: 'engagement';
	operation: 'get';
	engagementId: ResourceLocatorValue;
};

/** Get many contacts */
export type HubspotV2EngagementGetAllConfig = {
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
export type HubspotV2TicketCreateConfig = {
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
export type HubspotV2TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
	ticketId: ResourceLocatorValue;
};

/** Get a contact */
export type HubspotV2TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	ticketId: ResourceLocatorValue;
	additionalFields?: Record<string, unknown>;
};

/** Get many contacts */
export type HubspotV2TicketGetAllConfig = {
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
export type HubspotV2TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
	ticketId: ResourceLocatorValue;
	updateFields?: Record<string, unknown>;
};

export type HubspotV2Params =
	| HubspotV2CompanyCreateConfig
	| HubspotV2CompanyDeleteConfig
	| HubspotV2CompanyGetConfig
	| HubspotV2CompanyGetAllConfig
	| HubspotV2CompanyGetRecentlyCreatedUpdatedConfig
	| HubspotV2CompanySearchByDomainConfig
	| HubspotV2CompanyUpdateConfig
	| HubspotV2ContactUpsertConfig
	| HubspotV2ContactDeleteConfig
	| HubspotV2ContactGetConfig
	| HubspotV2ContactGetAllConfig
	| HubspotV2ContactGetRecentlyCreatedUpdatedConfig
	| HubspotV2ContactSearchConfig
	| HubspotV2ContactListAddConfig
	| HubspotV2ContactListRemoveConfig
	| HubspotV2DealCreateConfig
	| HubspotV2DealDeleteConfig
	| HubspotV2DealGetConfig
	| HubspotV2DealGetAllConfig
	| HubspotV2DealGetRecentlyCreatedUpdatedConfig
	| HubspotV2DealSearchConfig
	| HubspotV2DealUpdateConfig
	| HubspotV2EngagementCreateConfig
	| HubspotV2EngagementDeleteConfig
	| HubspotV2EngagementGetConfig
	| HubspotV2EngagementGetAllConfig
	| HubspotV2TicketCreateConfig
	| HubspotV2TicketDeleteConfig
	| HubspotV2TicketGetConfig
	| HubspotV2TicketGetAllConfig
	| HubspotV2TicketUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type HubspotV2CompanyCreateOutput = {
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

export type HubspotV2CompanyGetAllOutput = {
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

export type HubspotV2CompanySearchByDomainOutput = {
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

export type HubspotV2CompanyUpdateOutput = {
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

export type HubspotV2ContactUpsertOutput = {
	isNew?: boolean;
	vid?: number;
};

export type HubspotV2ContactGetOutput = {
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

export type HubspotV2ContactGetAllOutput = {
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

export type HubspotV2ContactGetRecentlyCreatedUpdatedOutput = {
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

export type HubspotV2ContactSearchOutput = {
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

export type HubspotV2ContactListAddOutput = {
	discarded?: Array<number>;
	invalidEmails?: Array<string>;
	invalidVids?: Array<number>;
	updated?: Array<number>;
};

export type HubspotV2DealGetAllOutput = {
	isDeleted?: boolean;
	portalId?: number;
	stateChanges?: Array<{
		changeFlag?: string;
		timestamp?: number;
	}>;
};

export type HubspotV2DealSearchOutput = {
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

export type HubspotV2EngagementCreateOutput = {
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

export type HubspotV2EngagementGetOutput = {
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

export type HubspotV2EngagementGetAllOutput = {
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

export type HubspotV2TicketDeleteOutput = {
	deleted?: boolean;
};

export type HubspotV2TicketGetOutput = {
	isDeleted?: boolean;
	objectId?: number;
	objectType?: string;
	portalId?: number;
};

export type HubspotV2TicketGetAllOutput = {
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

export interface HubspotV2Credentials {
	hubspotApi: CredentialReference;
	hubspotAppToken: CredentialReference;
	hubspotOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HubspotV2NodeBase {
	type: 'n8n-nodes-base.hubspot';
	version: 2;
	credentials?: HubspotV2Credentials;
}

export type HubspotV2CompanyCreateNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2CompanyCreateConfig>;
	output?: HubspotV2CompanyCreateOutput;
};

export type HubspotV2CompanyDeleteNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2CompanyDeleteConfig>;
};

export type HubspotV2CompanyGetNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2CompanyGetConfig>;
};

export type HubspotV2CompanyGetAllNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2CompanyGetAllConfig>;
	output?: HubspotV2CompanyGetAllOutput;
};

export type HubspotV2CompanyGetRecentlyCreatedUpdatedNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2CompanyGetRecentlyCreatedUpdatedConfig>;
};

export type HubspotV2CompanySearchByDomainNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2CompanySearchByDomainConfig>;
	output?: HubspotV2CompanySearchByDomainOutput;
};

export type HubspotV2CompanyUpdateNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2CompanyUpdateConfig>;
	output?: HubspotV2CompanyUpdateOutput;
};

export type HubspotV2ContactUpsertNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2ContactUpsertConfig>;
	output?: HubspotV2ContactUpsertOutput;
};

export type HubspotV2ContactDeleteNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2ContactDeleteConfig>;
};

export type HubspotV2ContactGetNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2ContactGetConfig>;
	output?: HubspotV2ContactGetOutput;
};

export type HubspotV2ContactGetAllNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2ContactGetAllConfig>;
	output?: HubspotV2ContactGetAllOutput;
};

export type HubspotV2ContactGetRecentlyCreatedUpdatedNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2ContactGetRecentlyCreatedUpdatedConfig>;
	output?: HubspotV2ContactGetRecentlyCreatedUpdatedOutput;
};

export type HubspotV2ContactSearchNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2ContactSearchConfig>;
	output?: HubspotV2ContactSearchOutput;
};

export type HubspotV2ContactListAddNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2ContactListAddConfig>;
	output?: HubspotV2ContactListAddOutput;
};

export type HubspotV2ContactListRemoveNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2ContactListRemoveConfig>;
};

export type HubspotV2DealCreateNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2DealCreateConfig>;
};

export type HubspotV2DealDeleteNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2DealDeleteConfig>;
};

export type HubspotV2DealGetNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2DealGetConfig>;
};

export type HubspotV2DealGetAllNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2DealGetAllConfig>;
	output?: HubspotV2DealGetAllOutput;
};

export type HubspotV2DealGetRecentlyCreatedUpdatedNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2DealGetRecentlyCreatedUpdatedConfig>;
};

export type HubspotV2DealSearchNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2DealSearchConfig>;
	output?: HubspotV2DealSearchOutput;
};

export type HubspotV2DealUpdateNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2DealUpdateConfig>;
};

export type HubspotV2EngagementCreateNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2EngagementCreateConfig>;
	output?: HubspotV2EngagementCreateOutput;
};

export type HubspotV2EngagementDeleteNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2EngagementDeleteConfig>;
};

export type HubspotV2EngagementGetNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2EngagementGetConfig>;
	output?: HubspotV2EngagementGetOutput;
};

export type HubspotV2EngagementGetAllNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2EngagementGetAllConfig>;
	output?: HubspotV2EngagementGetAllOutput;
};

export type HubspotV2TicketCreateNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2TicketCreateConfig>;
};

export type HubspotV2TicketDeleteNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2TicketDeleteConfig>;
	output?: HubspotV2TicketDeleteOutput;
};

export type HubspotV2TicketGetNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2TicketGetConfig>;
	output?: HubspotV2TicketGetOutput;
};

export type HubspotV2TicketGetAllNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2TicketGetAllConfig>;
	output?: HubspotV2TicketGetAllOutput;
};

export type HubspotV2TicketUpdateNode = HubspotV2NodeBase & {
	config: NodeConfig<HubspotV2TicketUpdateConfig>;
};

export type HubspotV2Node =
	| HubspotV2CompanyCreateNode
	| HubspotV2CompanyDeleteNode
	| HubspotV2CompanyGetNode
	| HubspotV2CompanyGetAllNode
	| HubspotV2CompanyGetRecentlyCreatedUpdatedNode
	| HubspotV2CompanySearchByDomainNode
	| HubspotV2CompanyUpdateNode
	| HubspotV2ContactUpsertNode
	| HubspotV2ContactDeleteNode
	| HubspotV2ContactGetNode
	| HubspotV2ContactGetAllNode
	| HubspotV2ContactGetRecentlyCreatedUpdatedNode
	| HubspotV2ContactSearchNode
	| HubspotV2ContactListAddNode
	| HubspotV2ContactListRemoveNode
	| HubspotV2DealCreateNode
	| HubspotV2DealDeleteNode
	| HubspotV2DealGetNode
	| HubspotV2DealGetAllNode
	| HubspotV2DealGetRecentlyCreatedUpdatedNode
	| HubspotV2DealSearchNode
	| HubspotV2DealUpdateNode
	| HubspotV2EngagementCreateNode
	| HubspotV2EngagementDeleteNode
	| HubspotV2EngagementGetNode
	| HubspotV2EngagementGetAllNode
	| HubspotV2TicketCreateNode
	| HubspotV2TicketDeleteNode
	| HubspotV2TicketGetNode
	| HubspotV2TicketGetAllNode
	| HubspotV2TicketUpdateNode
	;