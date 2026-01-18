/**
 * HaloPSA Node Types
 *
 * Consume HaloPSA API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/halopsa/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a client */
export type HaloPSAV1ClientCreateConfig = {
	resource: 'client';
	operation: 'create';
	/**
	 * Enter client name
	 */
	clientName: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HaloPSAV1ClientDeleteConfig = {
	resource: 'client';
	operation: 'delete';
	clientId: string | Expression<string>;
};

/** Get a client */
export type HaloPSAV1ClientGetConfig = {
	resource: 'client';
	operation: 'get';
	clientId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
};

/** Get many clients */
export type HaloPSAV1ClientGetAllConfig = {
	resource: 'client';
	operation: 'getAll';
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HaloPSAV1ClientUpdateConfig = {
	resource: 'client';
	operation: 'update';
	clientId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type HaloPSAV1SiteCreateConfig = {
	resource: 'site';
	operation: 'create';
	/**
	 * Enter site name
	 */
	siteName: string | Expression<string>;
	/**
	 * Whether client can be selected by ID
	 * @default false
	 */
	selectOption?: boolean | Expression<boolean>;
	clientId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HaloPSAV1SiteDeleteConfig = {
	resource: 'site';
	operation: 'delete';
	siteId: string | Expression<string>;
};

/** Get a client */
export type HaloPSAV1SiteGetConfig = {
	resource: 'site';
	operation: 'get';
	siteId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
};

/** Get many clients */
export type HaloPSAV1SiteGetAllConfig = {
	resource: 'site';
	operation: 'getAll';
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HaloPSAV1SiteUpdateConfig = {
	resource: 'site';
	operation: 'update';
	siteId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type HaloPSAV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	ticketType: string | Expression<string>;
	summary: string | Expression<string>;
	details: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HaloPSAV1TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
	ticketId: string | Expression<string>;
};

/** Get a client */
export type HaloPSAV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	ticketId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
};

/** Get many clients */
export type HaloPSAV1TicketGetAllConfig = {
	resource: 'ticket';
	operation: 'getAll';
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HaloPSAV1TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
	ticketId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a client */
export type HaloPSAV1UserCreateConfig = {
	resource: 'user';
	operation: 'create';
	/**
	 * Enter user name
	 */
	userName: string | Expression<string>;
	/**
	 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
	 */
	siteId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a client */
export type HaloPSAV1UserDeleteConfig = {
	resource: 'user';
	operation: 'delete';
	userId: string | Expression<string>;
};

/** Get a client */
export type HaloPSAV1UserGetConfig = {
	resource: 'user';
	operation: 'get';
	userId: string | Expression<string>;
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
};

/** Get many clients */
export type HaloPSAV1UserGetAllConfig = {
	resource: 'user';
	operation: 'getAll';
	/**
	 * Whether to return a simplified version of the response instead of the raw data
	 * @default true
	 */
	simplify?: boolean | Expression<boolean>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @default 50
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update a client */
export type HaloPSAV1UserUpdateConfig = {
	resource: 'user';
	operation: 'update';
	userId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type HaloPSAV1Params =
	| HaloPSAV1ClientCreateConfig
	| HaloPSAV1ClientDeleteConfig
	| HaloPSAV1ClientGetConfig
	| HaloPSAV1ClientGetAllConfig
	| HaloPSAV1ClientUpdateConfig
	| HaloPSAV1SiteCreateConfig
	| HaloPSAV1SiteDeleteConfig
	| HaloPSAV1SiteGetConfig
	| HaloPSAV1SiteGetAllConfig
	| HaloPSAV1SiteUpdateConfig
	| HaloPSAV1TicketCreateConfig
	| HaloPSAV1TicketDeleteConfig
	| HaloPSAV1TicketGetConfig
	| HaloPSAV1TicketGetAllConfig
	| HaloPSAV1TicketUpdateConfig
	| HaloPSAV1UserCreateConfig
	| HaloPSAV1UserDeleteConfig
	| HaloPSAV1UserGetConfig
	| HaloPSAV1UserGetAllConfig
	| HaloPSAV1UserUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface HaloPSAV1Credentials {
	haloPSAApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type HaloPSANode = {
	type: 'n8n-nodes-base.haloPSA';
	version: 1;
	config: NodeConfig<HaloPSAV1Params>;
	credentials?: HaloPSAV1Credentials;
};
