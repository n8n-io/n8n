/**
 * SyncroMSP Node - Version 1
 * Gets data from SyncroMSP
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create new customer */
export type SyncroMspV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	customerId: string | Expression<string>;
	email?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete customer */
export type SyncroMspV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
/**
 * Delete a specific contact by ID
 * @displayOptions.show { resource: ["contact"], operation: ["delete"] }
 */
		contactId: string | Expression<string>;
};

/** Retrieve customer */
export type SyncroMspV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
/**
 * Get specific contact by ID
 * @displayOptions.show { resource: ["contact"], operation: ["get"] }
 */
		contactId: string | Expression<string>;
};

/** Retrieve many customers */
export type SyncroMspV1ContactGetAllConfig = {
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
 * @default 25
 */
		limit?: number | Expression<number>;
};

/** Update customer */
export type SyncroMspV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	contactId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create new customer */
export type SyncroMspV1CustomerCreateConfig = {
	resource: 'customer';
	operation: 'create';
	email?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete customer */
export type SyncroMspV1CustomerDeleteConfig = {
	resource: 'customer';
	operation: 'delete';
/**
 * Delete a specific customer by ID
 * @displayOptions.show { resource: ["customer"], operation: ["delete"] }
 */
		customerId: string | Expression<string>;
};

/** Retrieve customer */
export type SyncroMspV1CustomerGetConfig = {
	resource: 'customer';
	operation: 'get';
/**
 * Get specific customer by ID
 * @displayOptions.show { resource: ["customer"], operation: ["get"] }
 */
		customerId: string | Expression<string>;
};

/** Retrieve many customers */
export type SyncroMspV1CustomerGetAllConfig = {
	resource: 'customer';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["customer"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["customer"], operation: ["getAll"], returnAll: [false] }
 * @default 25
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update customer */
export type SyncroMspV1CustomerUpdateConfig = {
	resource: 'customer';
	operation: 'update';
	customerId?: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create new customer */
export type SyncroMspV1RmmCreateConfig = {
	resource: 'rmm';
	operation: 'create';
	assetId?: string | Expression<string>;
	customerId?: string | Expression<string>;
	description?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete customer */
export type SyncroMspV1RmmDeleteConfig = {
	resource: 'rmm';
	operation: 'delete';
/**
 * Delete the RMM alert by ID
 * @displayOptions.show { resource: ["rmm"], operation: ["delete"] }
 */
		alertId: string | Expression<string>;
};

/** Retrieve customer */
export type SyncroMspV1RmmGetConfig = {
	resource: 'rmm';
	operation: 'get';
/**
 * Get specific RMM alert by ID
 * @displayOptions.show { resource: ["rmm"], operation: ["get"] }
 */
		alertId: string | Expression<string>;
};

/** Retrieve many customers */
export type SyncroMspV1RmmGetAllConfig = {
	resource: 'rmm';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["rmm"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["rmm"], operation: ["getAll"], returnAll: [false] }
 * @default 25
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Mute RMM Alert */
export type SyncroMspV1RmmMuteConfig = {
	resource: 'rmm';
	operation: 'mute';
/**
 * Mute the RMM alert by ID
 * @displayOptions.show { resource: ["rmm"], operation: ["mute"] }
 */
		alertId: string | Expression<string>;
/**
 * Length of time to mute alert for
 * @displayOptions.show { resource: ["rmm"], operation: ["mute"] }
 */
		muteFor?: '1-hour' | '1-day' | '2-days' | '1-week' | '2-weeks' | '1-month' | 'forever' | Expression<string>;
};

/** Create new customer */
export type SyncroMspV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
	customerId: string | Expression<string>;
	subject: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete customer */
export type SyncroMspV1TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
/**
 * Delete a specific customer by ID
 * @displayOptions.show { resource: ["ticket"], operation: ["delete"] }
 */
		ticketId: string | Expression<string>;
};

/** Retrieve customer */
export type SyncroMspV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
/**
 * Get specific customer by ID
 * @displayOptions.show { resource: ["ticket"], operation: ["get"] }
 */
		ticketId?: string | Expression<string>;
};

/** Retrieve many customers */
export type SyncroMspV1TicketGetAllConfig = {
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
 * @default 25
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update customer */
export type SyncroMspV1TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
	ticketId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};


// ===========================================================================
// Credentials
// ===========================================================================

export interface SyncroMspV1Credentials {
	syncroMspApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SyncroMspV1NodeBase {
	type: 'n8n-nodes-base.syncroMsp';
	version: 1;
	credentials?: SyncroMspV1Credentials;
}

export type SyncroMspV1ContactCreateNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1ContactCreateConfig>;
};

export type SyncroMspV1ContactDeleteNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1ContactDeleteConfig>;
};

export type SyncroMspV1ContactGetNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1ContactGetConfig>;
};

export type SyncroMspV1ContactGetAllNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1ContactGetAllConfig>;
};

export type SyncroMspV1ContactUpdateNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1ContactUpdateConfig>;
};

export type SyncroMspV1CustomerCreateNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1CustomerCreateConfig>;
};

export type SyncroMspV1CustomerDeleteNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1CustomerDeleteConfig>;
};

export type SyncroMspV1CustomerGetNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1CustomerGetConfig>;
};

export type SyncroMspV1CustomerGetAllNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1CustomerGetAllConfig>;
};

export type SyncroMspV1CustomerUpdateNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1CustomerUpdateConfig>;
};

export type SyncroMspV1RmmCreateNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1RmmCreateConfig>;
};

export type SyncroMspV1RmmDeleteNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1RmmDeleteConfig>;
};

export type SyncroMspV1RmmGetNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1RmmGetConfig>;
};

export type SyncroMspV1RmmGetAllNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1RmmGetAllConfig>;
};

export type SyncroMspV1RmmMuteNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1RmmMuteConfig>;
};

export type SyncroMspV1TicketCreateNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1TicketCreateConfig>;
};

export type SyncroMspV1TicketDeleteNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1TicketDeleteConfig>;
};

export type SyncroMspV1TicketGetNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1TicketGetConfig>;
};

export type SyncroMspV1TicketGetAllNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1TicketGetAllConfig>;
};

export type SyncroMspV1TicketUpdateNode = SyncroMspV1NodeBase & {
	config: NodeConfig<SyncroMspV1TicketUpdateConfig>;
};

export type SyncroMspV1Node =
	| SyncroMspV1ContactCreateNode
	| SyncroMspV1ContactDeleteNode
	| SyncroMspV1ContactGetNode
	| SyncroMspV1ContactGetAllNode
	| SyncroMspV1ContactUpdateNode
	| SyncroMspV1CustomerCreateNode
	| SyncroMspV1CustomerDeleteNode
	| SyncroMspV1CustomerGetNode
	| SyncroMspV1CustomerGetAllNode
	| SyncroMspV1CustomerUpdateNode
	| SyncroMspV1RmmCreateNode
	| SyncroMspV1RmmDeleteNode
	| SyncroMspV1RmmGetNode
	| SyncroMspV1RmmGetAllNode
	| SyncroMspV1RmmMuteNode
	| SyncroMspV1TicketCreateNode
	| SyncroMspV1TicketDeleteNode
	| SyncroMspV1TicketGetNode
	| SyncroMspV1TicketGetAllNode
	| SyncroMspV1TicketUpdateNode
	;