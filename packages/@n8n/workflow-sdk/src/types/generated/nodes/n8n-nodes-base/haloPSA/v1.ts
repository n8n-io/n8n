/**
 * HaloPSA Node - Version 1
 * Consume HaloPSA API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a client */
export type HaloPSAV1ClientCreateConfig = {
	resource: 'client';
	operation: 'create';
/**
 * Enter client name
 * @displayOptions.show { operation: ["create"], resource: ["client"] }
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
 * @displayOptions.show { resource: ["client"], operation: ["get", "getAll"] }
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
 * @displayOptions.show { resource: ["client"], operation: ["get", "getAll"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["client"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["client"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["site"], operation: ["create"] }
 */
		siteName: string | Expression<string>;
/**
 * Whether client can be selected by ID
 * @displayOptions.show { resource: ["site"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["site"], operation: ["get", "getAll"] }
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
 * @displayOptions.show { resource: ["site"], operation: ["get", "getAll"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["site"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["site"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["ticket"], operation: ["get", "getAll"] }
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
 * @displayOptions.show { resource: ["ticket"], operation: ["get", "getAll"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["ticket"], operation: ["getAll"], returnAll: [false] }
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
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
 */
		userName: string | Expression<string>;
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { resource: ["user"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["user"], operation: ["get", "getAll"] }
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
 * @displayOptions.show { resource: ["user"], operation: ["get", "getAll"] }
 * @default true
 */
		simplify?: boolean | Expression<boolean>;
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["user"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["user"], operation: ["getAll"], returnAll: [false] }
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


// ===========================================================================
// Output Types
// ===========================================================================

export type HaloPSAV1ClientGetAllOutput = {
	accountmanagertech?: number;
	actionemail?: number;
	clearemail?: number;
	client_to_invoice?: number;
	client_to_invoice_recurring?: number;
	colour?: string;
	confirmemail?: number;
	contract_tax_code?: number;
	customer_relationship?: Array<{
		id?: string;
		name?: string;
	}>;
	customer_relationship_list?: string;
	customertype?: number;
	default_currency_code?: number;
	default_mailbox_id?: number;
	excludefrominvoicesync?: boolean;
	id?: number;
	inactive?: boolean;
	is_account?: boolean;
	is_vip?: boolean;
	item_tax_code?: number;
	jira_validated?: boolean;
	key?: number;
	mailbox_override?: number;
	messagegroup_id?: number;
	name?: string;
	notes?: string;
	overridepdftemplateinvoice?: number;
	overridepdftemplatequote?: number;
	percentage_to_survey?: number;
	prepay_tax_code?: number;
	pritech?: number;
	qbo_company_id?: string;
	sectech?: number;
	service_tax_code?: number;
	servicenow_validated?: boolean;
	stopped?: number;
	table?: number;
	taxable?: boolean;
	ticket_invoices_for_each_site?: boolean;
	toplevel_id?: number;
	toplevel_name?: string;
	use?: string;
};

export type HaloPSAV1TicketGetOutput = {
	agent_id?: number;
	details?: string;
	id?: number;
	summary?: string;
	targetdate?: string;
};

export type HaloPSAV1TicketGetAllOutput = {
	agent_id?: number;
	details?: string;
	id?: number;
	summary?: string;
	targetdate?: string;
};

export type HaloPSAV1UserGetAllOutput = {
	emailaddress?: string;
	id?: number;
	inactive?: boolean;
	name?: string;
	site_id?: number;
	surname?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface HaloPSAV1Credentials {
	haloPSAApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface HaloPSAV1NodeBase {
	type: 'n8n-nodes-base.haloPSA';
	version: 1;
	credentials?: HaloPSAV1Credentials;
}

export type HaloPSAV1ClientCreateNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1ClientCreateConfig>;
};

export type HaloPSAV1ClientDeleteNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1ClientDeleteConfig>;
};

export type HaloPSAV1ClientGetNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1ClientGetConfig>;
};

export type HaloPSAV1ClientGetAllNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1ClientGetAllConfig>;
	output?: HaloPSAV1ClientGetAllOutput;
};

export type HaloPSAV1ClientUpdateNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1ClientUpdateConfig>;
};

export type HaloPSAV1SiteCreateNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1SiteCreateConfig>;
};

export type HaloPSAV1SiteDeleteNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1SiteDeleteConfig>;
};

export type HaloPSAV1SiteGetNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1SiteGetConfig>;
};

export type HaloPSAV1SiteGetAllNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1SiteGetAllConfig>;
};

export type HaloPSAV1SiteUpdateNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1SiteUpdateConfig>;
};

export type HaloPSAV1TicketCreateNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1TicketCreateConfig>;
};

export type HaloPSAV1TicketDeleteNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1TicketDeleteConfig>;
};

export type HaloPSAV1TicketGetNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1TicketGetConfig>;
	output?: HaloPSAV1TicketGetOutput;
};

export type HaloPSAV1TicketGetAllNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1TicketGetAllConfig>;
	output?: HaloPSAV1TicketGetAllOutput;
};

export type HaloPSAV1TicketUpdateNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1TicketUpdateConfig>;
};

export type HaloPSAV1UserCreateNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1UserCreateConfig>;
};

export type HaloPSAV1UserDeleteNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1UserDeleteConfig>;
};

export type HaloPSAV1UserGetNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1UserGetConfig>;
};

export type HaloPSAV1UserGetAllNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1UserGetAllConfig>;
	output?: HaloPSAV1UserGetAllOutput;
};

export type HaloPSAV1UserUpdateNode = HaloPSAV1NodeBase & {
	config: NodeConfig<HaloPSAV1UserUpdateConfig>;
};

export type HaloPSAV1Node =
	| HaloPSAV1ClientCreateNode
	| HaloPSAV1ClientDeleteNode
	| HaloPSAV1ClientGetNode
	| HaloPSAV1ClientGetAllNode
	| HaloPSAV1ClientUpdateNode
	| HaloPSAV1SiteCreateNode
	| HaloPSAV1SiteDeleteNode
	| HaloPSAV1SiteGetNode
	| HaloPSAV1SiteGetAllNode
	| HaloPSAV1SiteUpdateNode
	| HaloPSAV1TicketCreateNode
	| HaloPSAV1TicketDeleteNode
	| HaloPSAV1TicketGetNode
	| HaloPSAV1TicketGetAllNode
	| HaloPSAV1TicketUpdateNode
	| HaloPSAV1UserCreateNode
	| HaloPSAV1UserDeleteNode
	| HaloPSAV1UserGetNode
	| HaloPSAV1UserGetAllNode
	| HaloPSAV1UserUpdateNode
	;