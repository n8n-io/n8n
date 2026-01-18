/**
 * Zendesk Node Types
 *
 * Consume Zendesk API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/zendesk/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
	/**
	 * The first comment on the ticket
	 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
	 */
	description: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
	/**
	 * Object of values to set as described &lt;a href="https://developer.zendesk.com/rest_api/docs/support/tickets"&gt;here&lt;/a&gt;
	 * @displayOptions.show { resource: ["ticket"], operation: ["create"], jsonParameters: [true] }
	 */
	additionalFieldsJson?: IDataObject | string | Expression<string>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
	ticketType: 'regular' | 'suspended' | Expression<string>;
	id: string | Expression<string>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	ticketType: 'regular' | 'suspended' | Expression<string>;
	id: string | Expression<string>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketGetAllConfig = {
	resource: 'ticket';
	operation: 'getAll';
	ticketType: 'regular' | 'suspended' | Expression<string>;
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
	options?: Record<string, unknown>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketRecoverConfig = {
	resource: 'ticket';
	operation: 'recover';
	id: string | Expression<string>;
};

/** Tickets are the means through which your end users (customers) communicate with agents in Zendesk Support */
export type ZendeskV1TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
	id: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	updateFields?: Record<string, unknown>;
	/**
	 * Object of values to update as described &lt;a href="https://developer.zendesk.com/rest_api/docs/support/tickets"&gt;here&lt;/a&gt;
	 * @displayOptions.show { resource: ["ticket"], operation: ["update"], jsonParameters: [true] }
	 */
	updateFieldsJson?: IDataObject | string | Expression<string>;
};

/** Manage system and custom ticket fields */
export type ZendeskV1TicketFieldGetConfig = {
	resource: 'ticketField';
	operation: 'get';
	ticketFieldId: string | Expression<string>;
};

/** Manage system and custom ticket fields */
export type ZendeskV1TicketFieldGetAllConfig = {
	resource: 'ticketField';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["ticketField"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["ticketField"], operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Manage users */
export type ZendeskV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	/**
	 * The user's name
	 * @displayOptions.show { resource: ["user"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Manage users */
export type ZendeskV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	id: string | Expression<string>;
};

/** Manage users */
export type ZendeskV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	id: string | Expression<string>;
};

/** Manage users */
export type ZendeskV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
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

/** Manage users */
export type ZendeskV1UserGetOrganizationsConfig = {
	resource: 'user';
	operation: 'getOrganizations';
	id: string | Expression<string>;
};

/** Manage users */
export type ZendeskV1UserGetRelatedDataConfig = {
	resource: 'user';
	operation: 'getRelatedData';
	id: string | Expression<string>;
};

/** Manage users */
export type ZendeskV1UserSearchConfig = {
	resource: 'user';
	operation: 'search';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["user"], operation: ["search"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["user"], operation: ["search"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Manage users */
export type ZendeskV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Manage organizations */
export type ZendeskV1OrganizationCountConfig = {
	resource: 'organization';
	operation: 'count';
};

/** Manage organizations */
export type ZendeskV1OrganizationCreateConfig = {
	resource: 'organization';
	operation: 'create';
	name: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Manage organizations */
export type ZendeskV1OrganizationDeleteConfig = {
	resource: 'organization';
	operation: 'delete';
	id: string | Expression<string>;
};

/** Manage organizations */
export type ZendeskV1OrganizationGetConfig = {
	resource: 'organization';
	operation: 'get';
	id: string | Expression<string>;
};

/** Manage organizations */
export type ZendeskV1OrganizationGetAllConfig = {
	resource: 'organization';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["organization"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["organization"], operation: ["getAll"], returnAll: [false] }
	 * @default 100
	 */
	limit?: number | Expression<number>;
};

/** Manage organizations */
export type ZendeskV1OrganizationGetRelatedDataConfig = {
	resource: 'organization';
	operation: 'getRelatedData';
	id: string | Expression<string>;
};

/** Manage organizations */
export type ZendeskV1OrganizationUpdateConfig = {
	resource: 'organization';
	operation: 'update';
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type ZendeskV1Params =
	| ZendeskV1TicketCreateConfig
	| ZendeskV1TicketDeleteConfig
	| ZendeskV1TicketGetConfig
	| ZendeskV1TicketGetAllConfig
	| ZendeskV1TicketRecoverConfig
	| ZendeskV1TicketUpdateConfig
	| ZendeskV1TicketFieldGetConfig
	| ZendeskV1TicketFieldGetAllConfig
	| ZendeskV1UserCreateConfig
	| ZendeskV1UserDeleteConfig
	| ZendeskV1UserGetConfig
	| ZendeskV1UserGetAllConfig
	| ZendeskV1UserGetOrganizationsConfig
	| ZendeskV1UserGetRelatedDataConfig
	| ZendeskV1UserSearchConfig
	| ZendeskV1UserUpdateConfig
	| ZendeskV1OrganizationCountConfig
	| ZendeskV1OrganizationCreateConfig
	| ZendeskV1OrganizationDeleteConfig
	| ZendeskV1OrganizationGetConfig
	| ZendeskV1OrganizationGetAllConfig
	| ZendeskV1OrganizationGetRelatedDataConfig
	| ZendeskV1OrganizationUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface ZendeskV1Credentials {
	zendeskApi: CredentialReference;
	zendeskOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type ZendeskV1Node = {
	type: 'n8n-nodes-base.zendesk';
	version: 1;
	config: NodeConfig<ZendeskV1Params>;
	credentials?: ZendeskV1Credentials;
};

export type ZendeskNode = ZendeskV1Node;
