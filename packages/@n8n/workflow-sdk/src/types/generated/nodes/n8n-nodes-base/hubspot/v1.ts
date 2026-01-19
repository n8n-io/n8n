/**
 * HubSpot Node - Version 1
 * Consume HubSpot API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

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
 * @displayOptions.show { resource: ["company"], operation: ["delete"] }
 */
		companyId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1CompanyGetConfig = {
	resource: 'company';
	operation: 'get';
/**
 * Unique identifier for a particular company
 * @displayOptions.show { resource: ["company"], operation: ["get"] }
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

/** Get recently created companies */
export type HubspotV1CompanyGetRecentlyCreatedConfig = {
	resource: 'company';
	operation: 'getRecentlyCreated';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["company"], operation: ["getRecentlyCreated", "getRecentlyModified"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getRecentlyCreated", "getRecentlyModified"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["company"], operation: ["getRecentlyCreated", "getRecentlyModified"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["company"], operation: ["getRecentlyCreated", "getRecentlyModified"], returnAll: [false] }
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
export type HubspotV1CompanyUpdateConfig = {
	resource: 'company';
	operation: 'update';
/**
 * Unique identifier for a particular company
 * @displayOptions.show { resource: ["company"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["upsert"] }
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
 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
 */
		contactId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * Unique identifier for a particular contact
 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
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
export type HubspotV1ContactGetRecentlyCreatedUpdatedConfig = {
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
	filters?: Record<string, unknown>;
};

/** Search contacts */
export type HubspotV1ContactSearchConfig = {
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
 * When multiple filters are provided within a filterGroup, they will be combined using a logical AND operator. When multiple filterGroups are provided, they will be combined using a logical OR operator. The system supports a maximum of three filterGroups with up to three filters each. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;
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
			/** Operator
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
 * @displayOptions.show { resource: ["deal"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["deal"], operation: ["delete"] }
 */
		dealId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1DealGetConfig = {
	resource: 'deal';
	operation: 'get';
/**
 * Unique identifier for a particular deal
 * @displayOptions.show { resource: ["deal"], operation: ["get"] }
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

/** Get recently created companies */
export type HubspotV1DealGetRecentlyCreatedConfig = {
	resource: 'deal';
	operation: 'getRecentlyCreated';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["deal"], operation: ["getRecentlyCreated", "getRecentlyModified"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["deal"], operation: ["getRecentlyCreated", "getRecentlyModified"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["deal"], operation: ["getRecentlyCreated", "getRecentlyModified"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["deal"], operation: ["getRecentlyCreated", "getRecentlyModified"], returnAll: [false] }
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
 * When multiple filters are provided within a filterGroup, they will be combined using a logical AND operator. When multiple filterGroups are provided, they will be combined using a logical OR operator. The system supports a maximum of three filterGroups with up to three filters each. More info &lt;a href="https://developers.hubspot.com/docs/api/crm/search"&gt;here&lt;/a&gt;
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
			/** Operator
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
export type HubspotV1DealUpdateConfig = {
	resource: 'deal';
	operation: 'update';
/**
 * Unique identifier for a particular deal
 * @displayOptions.show { resource: ["deal"], operation: ["update"] }
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
 * @displayOptions.show { resource: ["engagement"], operation: ["get", "delete"] }
 */
		engagementId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1EngagementGetConfig = {
	resource: 'engagement';
	operation: 'get';
/**
 * Unique identifier for a particular engagement
 * @displayOptions.show { resource: ["engagement"], operation: ["get", "delete"] }
 */
		engagementId: string | Expression<string>;
};

/** Get many contacts */
export type HubspotV1EngagementGetAllConfig = {
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

/** Get all fields from a form */
export type HubspotV1FormGetFieldsConfig = {
	resource: 'form';
	operation: 'getFields';
/**
 * The ID of the form. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["form"], operation: ["getFields"] }
 */
		formId: string | Expression<string>;
};

/** Submit data to a form */
export type HubspotV1FormSubmitConfig = {
	resource: 'form';
	operation: 'submit';
/**
 * The ID of the form you're sending data to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["form"], operation: ["submit"] }
 */
		formId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	contextUi?: {
		contextValue?: {
			/** Include this parameter and set it to the hubspotutk cookie value to enable cookie tracking on your submission
			 */
			hutk?: string | Expression<string>;
			/** The IP address of the visitor filling out the form
			 */
			ipAddress?: string | Expression<string>;
			/** The URI of the page the submission happened on
			 */
			pageUri?: string | Expression<string>;
			/** The name or title of the page the submission happened on
			 */
			pageName?: string | Expression<string>;
			/** The ID of a page created on the HubSpot CMS
			 */
			pageId?: string | Expression<string>;
			/** If the form is for an account using the HubSpot Salesforce Integration, you can include the ID of a Salesforce campaign to add the contact to the specified campaign
			 */
			sfdcCampaignId?: string | Expression<string>;
			/** If the form is for an account using the HubSpot GoToWebinar Integration, you can include the ID of a webinar to enroll the contact in that webinar when they submit the form
			 */
			goToWebinarWebinarKey?: string | Expression<string>;
		};
	};
	lengalConsentUi?: {
		lengalConsentValues?: {
			/** Whether or not the visitor checked the Consent to process checkbox
			 * @default false
			 */
			consentToProcess?: boolean | Expression<boolean>;
			/** The text displayed to the visitor for the Consent to process checkbox
			 */
			text?: string | Expression<string>;
			/** Communications
			 * @default {}
			 */
			communicationsUi?: {
		communicationValues?: Array<{
			/** The ID of the specific subscription type. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			subscriptionTypeId?: string | Expression<string>;
			/** Whether or not the visitor checked the checkbox for this subscription type
			 * @default false
			 */
			value?: boolean | Expression<boolean>;
			/** The text displayed to the visitor for this specific subscription checkbox
			 */
			text?: string | Expression<string>;
		}>;
	};
		};
		legitimateInterestValues?: {
			/** The ID of the specific subscription type that this forms indicates interest to. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
			 */
			subscriptionTypeId?: string | Expression<string>;
			/** This must be true when using the 'legitimateInterest' option, as it reflects the consent indicated by the visitor when submitting the form
			 * @default false
			 */
			value?: boolean | Expression<boolean>;
			/** The privacy text displayed to the visitor
			 */
			legalBasis?: 'CUSTOMER' | 'LEAD' | Expression<string>;
			/** The privacy text displayed to the visitor
			 */
			text?: string | Expression<string>;
		};
	};
};

/** Create a company */
export type HubspotV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
/**
 * The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
 */
		pipelineId: string | Expression<string>;
/**
 * The ID of the pipeline the ticket is in. Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
 */
		stageId: string | Expression<string>;
/**
 * The ID of the pipeline the ticket is in
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["ticket"], operation: ["delete"] }
 */
		ticketId: string | Expression<string>;
};

/** Get a contact */
export type HubspotV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
/**
 * Unique identifier for a particular ticket
 * @displayOptions.show { resource: ["ticket"], operation: ["get"] }
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
export type HubspotV1TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
/**
 * Unique identifier for a particular ticket
 * @displayOptions.show { resource: ["ticket"], operation: ["update"] }
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
	| HubspotV1TicketUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HubspotV1Credentials {
	hubspotApi: CredentialReference;
	hubspotAppToken: CredentialReference;
	hubspotOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HubspotV1NodeBase {
	type: 'n8n-nodes-base.hubspot';
	version: 1;
	credentials?: HubspotV1Credentials;
}

export type HubspotV1CompanyCreateNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1CompanyCreateConfig>;
};

export type HubspotV1CompanyDeleteNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1CompanyDeleteConfig>;
};

export type HubspotV1CompanyGetNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1CompanyGetConfig>;
};

export type HubspotV1CompanyGetAllNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1CompanyGetAllConfig>;
};

export type HubspotV1CompanyGetRecentlyCreatedNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1CompanyGetRecentlyCreatedConfig>;
};

export type HubspotV1CompanyGetRecentlyModifiedNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1CompanyGetRecentlyModifiedConfig>;
};

export type HubspotV1CompanySearchByDomainNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1CompanySearchByDomainConfig>;
};

export type HubspotV1CompanyUpdateNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1CompanyUpdateConfig>;
};

export type HubspotV1ContactUpsertNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1ContactUpsertConfig>;
};

export type HubspotV1ContactDeleteNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1ContactDeleteConfig>;
};

export type HubspotV1ContactGetNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1ContactGetConfig>;
};

export type HubspotV1ContactGetAllNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1ContactGetAllConfig>;
};

export type HubspotV1ContactGetRecentlyCreatedUpdatedNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1ContactGetRecentlyCreatedUpdatedConfig>;
};

export type HubspotV1ContactSearchNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1ContactSearchConfig>;
};

export type HubspotV1ContactListAddNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1ContactListAddConfig>;
};

export type HubspotV1ContactListRemoveNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1ContactListRemoveConfig>;
};

export type HubspotV1DealCreateNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1DealCreateConfig>;
};

export type HubspotV1DealDeleteNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1DealDeleteConfig>;
};

export type HubspotV1DealGetNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1DealGetConfig>;
};

export type HubspotV1DealGetAllNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1DealGetAllConfig>;
};

export type HubspotV1DealGetRecentlyCreatedNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1DealGetRecentlyCreatedConfig>;
};

export type HubspotV1DealGetRecentlyModifiedNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1DealGetRecentlyModifiedConfig>;
};

export type HubspotV1DealSearchNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1DealSearchConfig>;
};

export type HubspotV1DealUpdateNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1DealUpdateConfig>;
};

export type HubspotV1EngagementCreateNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1EngagementCreateConfig>;
};

export type HubspotV1EngagementDeleteNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1EngagementDeleteConfig>;
};

export type HubspotV1EngagementGetNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1EngagementGetConfig>;
};

export type HubspotV1EngagementGetAllNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1EngagementGetAllConfig>;
};

export type HubspotV1FormGetFieldsNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1FormGetFieldsConfig>;
};

export type HubspotV1FormSubmitNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1FormSubmitConfig>;
};

export type HubspotV1TicketCreateNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1TicketCreateConfig>;
};

export type HubspotV1TicketDeleteNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1TicketDeleteConfig>;
};

export type HubspotV1TicketGetNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1TicketGetConfig>;
};

export type HubspotV1TicketGetAllNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1TicketGetAllConfig>;
};

export type HubspotV1TicketUpdateNode = HubspotV1NodeBase & {
	config: NodeConfig<HubspotV1TicketUpdateConfig>;
};

export type HubspotV1Node =
	| HubspotV1CompanyCreateNode
	| HubspotV1CompanyDeleteNode
	| HubspotV1CompanyGetNode
	| HubspotV1CompanyGetAllNode
	| HubspotV1CompanyGetRecentlyCreatedNode
	| HubspotV1CompanyGetRecentlyModifiedNode
	| HubspotV1CompanySearchByDomainNode
	| HubspotV1CompanyUpdateNode
	| HubspotV1ContactUpsertNode
	| HubspotV1ContactDeleteNode
	| HubspotV1ContactGetNode
	| HubspotV1ContactGetAllNode
	| HubspotV1ContactGetRecentlyCreatedUpdatedNode
	| HubspotV1ContactSearchNode
	| HubspotV1ContactListAddNode
	| HubspotV1ContactListRemoveNode
	| HubspotV1DealCreateNode
	| HubspotV1DealDeleteNode
	| HubspotV1DealGetNode
	| HubspotV1DealGetAllNode
	| HubspotV1DealGetRecentlyCreatedNode
	| HubspotV1DealGetRecentlyModifiedNode
	| HubspotV1DealSearchNode
	| HubspotV1DealUpdateNode
	| HubspotV1EngagementCreateNode
	| HubspotV1EngagementDeleteNode
	| HubspotV1EngagementGetNode
	| HubspotV1EngagementGetAllNode
	| HubspotV1FormGetFieldsNode
	| HubspotV1FormSubmitNode
	| HubspotV1TicketCreateNode
	| HubspotV1TicketDeleteNode
	| HubspotV1TicketGetNode
	| HubspotV1TicketGetAllNode
	| HubspotV1TicketUpdateNode
	;