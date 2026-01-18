/**
 * SyncroMSP Node Types
 *
 * Gets data from SyncroMSP
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/syncromsp/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 */
	contactId: string | Expression<string>;
};

/** Retrieve customer */
export type SyncroMspV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	/**
	 * Get specific contact by ID
	 */
	contactId: string | Expression<string>;
};

/** Retrieve many customers */
export type SyncroMspV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	customerId: string | Expression<string>;
};

/** Retrieve customer */
export type SyncroMspV1CustomerGetConfig = {
	resource: 'customer';
	operation: 'get';
	/**
	 * Get specific customer by ID
	 */
	customerId: string | Expression<string>;
};

/** Retrieve many customers */
export type SyncroMspV1CustomerGetAllConfig = {
	resource: 'customer';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	alertId: string | Expression<string>;
};

/** Retrieve customer */
export type SyncroMspV1RmmGetConfig = {
	resource: 'rmm';
	operation: 'get';
	/**
	 * Get specific RMM alert by ID
	 */
	alertId: string | Expression<string>;
};

/** Retrieve many customers */
export type SyncroMspV1RmmGetAllConfig = {
	resource: 'rmm';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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
	 */
	alertId: string | Expression<string>;
	/**
	 * Length of time to mute alert for
	 */
	muteFor?:
		| '1-hour'
		| '1-day'
		| '2-days'
		| '1-week'
		| '2-weeks'
		| '1-month'
		| 'forever'
		| Expression<string>;
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
	 */
	ticketId: string | Expression<string>;
};

/** Retrieve customer */
export type SyncroMspV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	/**
	 * Get specific customer by ID
	 */
	ticketId?: string | Expression<string>;
};

/** Retrieve many customers */
export type SyncroMspV1TicketGetAllConfig = {
	resource: 'ticket';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
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

export type SyncroMspV1Params =
	| SyncroMspV1ContactCreateConfig
	| SyncroMspV1ContactDeleteConfig
	| SyncroMspV1ContactGetConfig
	| SyncroMspV1ContactGetAllConfig
	| SyncroMspV1ContactUpdateConfig
	| SyncroMspV1CustomerCreateConfig
	| SyncroMspV1CustomerDeleteConfig
	| SyncroMspV1CustomerGetConfig
	| SyncroMspV1CustomerGetAllConfig
	| SyncroMspV1CustomerUpdateConfig
	| SyncroMspV1RmmCreateConfig
	| SyncroMspV1RmmDeleteConfig
	| SyncroMspV1RmmGetConfig
	| SyncroMspV1RmmGetAllConfig
	| SyncroMspV1RmmMuteConfig
	| SyncroMspV1TicketCreateConfig
	| SyncroMspV1TicketDeleteConfig
	| SyncroMspV1TicketGetConfig
	| SyncroMspV1TicketGetAllConfig
	| SyncroMspV1TicketUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SyncroMspV1Credentials {
	syncroMspApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type SyncroMspNode = {
	type: 'n8n-nodes-base.syncroMsp';
	version: 1;
	config: NodeConfig<SyncroMspV1Params>;
	credentials?: SyncroMspV1Credentials;
};
