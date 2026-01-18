/**
 * Freshdesk Node Types
 *
 * Consume Freshdesk API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/freshdesk/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new ticket */
export type FreshdeskV1ContactCreateConfig = {
	resource: 'contact';
	operation: 'create';
	/**
	 * Name of the contact
	 * @displayOptions.show { operation: ["create"], resource: ["contact"] }
	 */
	name: string | Expression<string>;
	/**
	 * Primary email address of the contact. If you want to associate additional email(s) with this contact, use the other_emails attribute.
	 * @displayOptions.show { operation: ["create"], resource: ["contact"] }
	 */
	email?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete a ticket */
export type FreshdeskV1ContactDeleteConfig = {
	resource: 'contact';
	operation: 'delete';
	contactId: string | Expression<string>;
};

/** Get a ticket */
export type FreshdeskV1ContactGetConfig = {
	resource: 'contact';
	operation: 'get';
	contactId: string | Expression<string>;
};

/** Get many tickets */
export type FreshdeskV1ContactGetAllConfig = {
	resource: 'contact';
	operation: 'getAll';
	filters?: Record<string, unknown>;
};

/** Update a ticket */
export type FreshdeskV1ContactUpdateConfig = {
	resource: 'contact';
	operation: 'update';
	contactId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new ticket */
export type FreshdeskV1TicketCreateConfig = {
	resource: 'ticket';
	operation: 'create';
	requester:
		| 'email'
		| 'facebookId'
		| 'phone'
		| 'requesterId'
		| 'twitterId'
		| 'uniqueExternalId'
		| Expression<string>;
	/**
	 * Value of the identification selected
	 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
	 */
	requesterIdentificationValue: string | Expression<string>;
	status: 'closed' | 'open' | 'pending' | 'resolved' | Expression<string>;
	priority: 'low' | 'medium' | 'high' | 'urgent' | Expression<string>;
	/**
	 * The channel through which the ticket was created
	 * @displayOptions.show { resource: ["ticket"], operation: ["create"] }
	 * @default portal
	 */
	source:
		| 'chat'
		| 'email'
		| 'feedbackWidget'
		| 'mobileHelp'
		| 'OutboundEmail'
		| 'phone'
		| 'portal'
		| Expression<string>;
	options?: Record<string, unknown>;
};

/** Delete a ticket */
export type FreshdeskV1TicketDeleteConfig = {
	resource: 'ticket';
	operation: 'delete';
	ticketId: string | Expression<string>;
};

/** Get a ticket */
export type FreshdeskV1TicketGetConfig = {
	resource: 'ticket';
	operation: 'get';
	ticketId: string | Expression<string>;
};

/** Get many tickets */
export type FreshdeskV1TicketGetAllConfig = {
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
	 * @default 5
	 */
	limit?: number | Expression<number>;
	options?: Record<string, unknown>;
};

/** Update a ticket */
export type FreshdeskV1TicketUpdateConfig = {
	resource: 'ticket';
	operation: 'update';
	ticketId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type FreshdeskV1Params =
	| FreshdeskV1ContactCreateConfig
	| FreshdeskV1ContactDeleteConfig
	| FreshdeskV1ContactGetConfig
	| FreshdeskV1ContactGetAllConfig
	| FreshdeskV1ContactUpdateConfig
	| FreshdeskV1TicketCreateConfig
	| FreshdeskV1TicketDeleteConfig
	| FreshdeskV1TicketGetConfig
	| FreshdeskV1TicketGetAllConfig
	| FreshdeskV1TicketUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface FreshdeskV1Credentials {
	freshdeskApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type FreshdeskV1Node = {
	type: 'n8n-nodes-base.freshdesk';
	version: 1;
	config: NodeConfig<FreshdeskV1Params>;
	credentials?: FreshdeskV1Credentials;
};

export type FreshdeskNode = FreshdeskV1Node;
