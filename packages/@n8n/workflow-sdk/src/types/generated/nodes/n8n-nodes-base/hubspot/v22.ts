/**
 * HubSpot Node - Version 2.2
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


// ===========================================================================
// Output Types
// ===========================================================================

export type HubspotV22CompanyCreateOutput = {
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

export type HubspotV22CompanyGetAllOutput = {
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

export type HubspotV22CompanySearchByDomainOutput = {
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

export type HubspotV22CompanyUpdateOutput = {
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

export type HubspotV22ContactUpsertOutput = {
	isNew?: boolean;
	vid?: number;
};

export type HubspotV22ContactGetOutput = {
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

export type HubspotV22ContactGetAllOutput = {
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

export type HubspotV22ContactGetRecentlyCreatedUpdatedOutput = {
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

export type HubspotV22ContactSearchOutput = {
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

export type HubspotV22ContactListAddOutput = {
	discarded?: Array<number>;
	invalidEmails?: Array<string>;
	invalidVids?: Array<number>;
	updated?: Array<number>;
};

export type HubspotV22DealGetAllOutput = {
	isDeleted?: boolean;
	portalId?: number;
	stateChanges?: Array<{
		changeFlag?: string;
		timestamp?: number;
	}>;
};

export type HubspotV22DealSearchOutput = {
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

export type HubspotV22EngagementCreateOutput = {
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

export type HubspotV22EngagementGetOutput = {
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

export type HubspotV22EngagementGetAllOutput = {
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

export type HubspotV22TicketDeleteOutput = {
	deleted?: boolean;
};

export type HubspotV22TicketGetOutput = {
	isDeleted?: boolean;
	objectId?: number;
	objectType?: string;
	portalId?: number;
};

export type HubspotV22TicketGetAllOutput = {
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

export interface HubspotV22Credentials {
	hubspotApi: CredentialReference;
	hubspotAppToken: CredentialReference;
	hubspotOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HubspotV22NodeBase {
	type: 'n8n-nodes-base.hubspot';
	version: 2.2;
	credentials?: HubspotV22Credentials;
}

export type HubspotV22CompanyCreateNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22CompanyCreateConfig>;
	output?: HubspotV22CompanyCreateOutput;
};

export type HubspotV22CompanyDeleteNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22CompanyDeleteConfig>;
};

export type HubspotV22CompanyGetNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22CompanyGetConfig>;
};

export type HubspotV22CompanyGetAllNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22CompanyGetAllConfig>;
	output?: HubspotV22CompanyGetAllOutput;
};

export type HubspotV22CompanyGetRecentlyCreatedUpdatedNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22CompanyGetRecentlyCreatedUpdatedConfig>;
};

export type HubspotV22CompanySearchByDomainNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22CompanySearchByDomainConfig>;
	output?: HubspotV22CompanySearchByDomainOutput;
};

export type HubspotV22CompanyUpdateNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22CompanyUpdateConfig>;
	output?: HubspotV22CompanyUpdateOutput;
};

export type HubspotV22ContactUpsertNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22ContactUpsertConfig>;
	output?: HubspotV22ContactUpsertOutput;
};

export type HubspotV22ContactDeleteNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22ContactDeleteConfig>;
};

export type HubspotV22ContactGetNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22ContactGetConfig>;
	output?: HubspotV22ContactGetOutput;
};

export type HubspotV22ContactGetAllNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22ContactGetAllConfig>;
	output?: HubspotV22ContactGetAllOutput;
};

export type HubspotV22ContactGetRecentlyCreatedUpdatedNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22ContactGetRecentlyCreatedUpdatedConfig>;
	output?: HubspotV22ContactGetRecentlyCreatedUpdatedOutput;
};

export type HubspotV22ContactSearchNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22ContactSearchConfig>;
	output?: HubspotV22ContactSearchOutput;
};

export type HubspotV22ContactListAddNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22ContactListAddConfig>;
	output?: HubspotV22ContactListAddOutput;
};

export type HubspotV22ContactListRemoveNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22ContactListRemoveConfig>;
};

export type HubspotV22DealCreateNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22DealCreateConfig>;
};

export type HubspotV22DealDeleteNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22DealDeleteConfig>;
};

export type HubspotV22DealGetNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22DealGetConfig>;
};

export type HubspotV22DealGetAllNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22DealGetAllConfig>;
	output?: HubspotV22DealGetAllOutput;
};

export type HubspotV22DealGetRecentlyCreatedUpdatedNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22DealGetRecentlyCreatedUpdatedConfig>;
};

export type HubspotV22DealSearchNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22DealSearchConfig>;
	output?: HubspotV22DealSearchOutput;
};

export type HubspotV22DealUpdateNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22DealUpdateConfig>;
};

export type HubspotV22EngagementCreateNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22EngagementCreateConfig>;
	output?: HubspotV22EngagementCreateOutput;
};

export type HubspotV22EngagementDeleteNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22EngagementDeleteConfig>;
};

export type HubspotV22EngagementGetNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22EngagementGetConfig>;
	output?: HubspotV22EngagementGetOutput;
};

export type HubspotV22EngagementGetAllNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22EngagementGetAllConfig>;
	output?: HubspotV22EngagementGetAllOutput;
};

export type HubspotV22TicketCreateNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22TicketCreateConfig>;
};

export type HubspotV22TicketDeleteNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22TicketDeleteConfig>;
	output?: HubspotV22TicketDeleteOutput;
};

export type HubspotV22TicketGetNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22TicketGetConfig>;
	output?: HubspotV22TicketGetOutput;
};

export type HubspotV22TicketGetAllNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22TicketGetAllConfig>;
	output?: HubspotV22TicketGetAllOutput;
};

export type HubspotV22TicketUpdateNode = HubspotV22NodeBase & {
	config: NodeConfig<HubspotV22TicketUpdateConfig>;
};

export type HubspotV22Node =
	| HubspotV22CompanyCreateNode
	| HubspotV22CompanyDeleteNode
	| HubspotV22CompanyGetNode
	| HubspotV22CompanyGetAllNode
	| HubspotV22CompanyGetRecentlyCreatedUpdatedNode
	| HubspotV22CompanySearchByDomainNode
	| HubspotV22CompanyUpdateNode
	| HubspotV22ContactUpsertNode
	| HubspotV22ContactDeleteNode
	| HubspotV22ContactGetNode
	| HubspotV22ContactGetAllNode
	| HubspotV22ContactGetRecentlyCreatedUpdatedNode
	| HubspotV22ContactSearchNode
	| HubspotV22ContactListAddNode
	| HubspotV22ContactListRemoveNode
	| HubspotV22DealCreateNode
	| HubspotV22DealDeleteNode
	| HubspotV22DealGetNode
	| HubspotV22DealGetAllNode
	| HubspotV22DealGetRecentlyCreatedUpdatedNode
	| HubspotV22DealSearchNode
	| HubspotV22DealUpdateNode
	| HubspotV22EngagementCreateNode
	| HubspotV22EngagementDeleteNode
	| HubspotV22EngagementGetNode
	| HubspotV22EngagementGetAllNode
	| HubspotV22TicketCreateNode
	| HubspotV22TicketDeleteNode
	| HubspotV22TicketGetNode
	| HubspotV22TicketGetAllNode
	| HubspotV22TicketUpdateNode
	;