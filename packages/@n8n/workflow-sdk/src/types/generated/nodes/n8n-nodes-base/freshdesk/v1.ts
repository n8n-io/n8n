/**
 * Freshdesk Node - Version 1
 * Consume Freshdesk API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

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
	requester: 'email' | 'facebookId' | 'phone' | 'requesterId' | 'twitterId' | 'uniqueExternalId' | Expression<string>;
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
		source: 'chat' | 'email' | 'feedbackWidget' | 'mobileHelp' | 'OutboundEmail' | 'phone' | 'portal' | Expression<string>;
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
	| FreshdeskV1TicketUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type FreshdeskV1ContactGetAllOutput = {
	active?: boolean;
	created_at?: string;
	facebook_id?: null;
	first_name?: string;
	id?: number;
	last_name?: string;
	name?: string;
	org_contact_id?: number;
	time_zone?: string;
	twitter_id?: null;
	updated_at?: string;
	visitor_id?: string;
};

export type FreshdeskV1TicketCreateOutput = {
	created_at?: string;
	custom_fields?: {
		cf_reference_number?: null;
	};
	description?: string;
	description_text?: string;
	fr_escalated?: boolean;
	id?: number;
	is_escalated?: boolean;
	nr_due_by?: null;
	nr_escalated?: boolean;
	priority?: number;
	requester_id?: number;
	source?: number;
	spam?: boolean;
	status?: number;
	subject?: string;
	support_email?: null;
	tags?: Array<string>;
	to_emails?: null;
	updated_at?: string;
};

export type FreshdeskV1TicketGetOutput = {
	association_type?: null;
	attachments?: Array<{
		attachment_url?: string;
		content_type?: string;
		created_at?: string;
		id?: number;
		name?: string;
		size?: number;
		updated_at?: string;
	}>;
	cc_emails?: Array<string>;
	created_at?: string;
	description?: string;
	description_text?: string;
	due_by?: string;
	fr_due_by?: string;
	fr_escalated?: boolean;
	fwd_emails?: Array<string>;
	id?: number;
	is_escalated?: boolean;
	priority?: number;
	reply_cc_emails?: Array<string>;
	requester_id?: number;
	source?: number;
	source_additional_info?: null;
	spam?: boolean;
	status?: number;
	subject?: string;
	tags?: Array<string>;
	ticket_cc_emails?: Array<string>;
	updated_at?: string;
};

export type FreshdeskV1TicketGetAllOutput = {
	cc_emails?: Array<string>;
	created_at?: string;
	fr_escalated?: boolean;
	fwd_emails?: Array<string>;
	id?: number;
	is_escalated?: boolean;
	nr_due_by?: null;
	nr_escalated?: boolean;
	priority?: number;
	reply_cc_emails?: Array<string>;
	requester_id?: number;
	source?: number;
	spam?: boolean;
	status?: number;
	subject?: string;
	tags?: Array<string>;
	ticket_cc_emails?: Array<string>;
	updated_at?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface FreshdeskV1Credentials {
	freshdeskApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface FreshdeskV1NodeBase {
	type: 'n8n-nodes-base.freshdesk';
	version: 1;
	credentials?: FreshdeskV1Credentials;
}

export type FreshdeskV1ContactCreateNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1ContactCreateConfig>;
};

export type FreshdeskV1ContactDeleteNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1ContactDeleteConfig>;
};

export type FreshdeskV1ContactGetNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1ContactGetConfig>;
};

export type FreshdeskV1ContactGetAllNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1ContactGetAllConfig>;
	output?: FreshdeskV1ContactGetAllOutput;
};

export type FreshdeskV1ContactUpdateNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1ContactUpdateConfig>;
};

export type FreshdeskV1TicketCreateNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1TicketCreateConfig>;
	output?: FreshdeskV1TicketCreateOutput;
};

export type FreshdeskV1TicketDeleteNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1TicketDeleteConfig>;
};

export type FreshdeskV1TicketGetNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1TicketGetConfig>;
	output?: FreshdeskV1TicketGetOutput;
};

export type FreshdeskV1TicketGetAllNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1TicketGetAllConfig>;
	output?: FreshdeskV1TicketGetAllOutput;
};

export type FreshdeskV1TicketUpdateNode = FreshdeskV1NodeBase & {
	config: NodeConfig<FreshdeskV1TicketUpdateConfig>;
};

export type FreshdeskV1Node =
	| FreshdeskV1ContactCreateNode
	| FreshdeskV1ContactDeleteNode
	| FreshdeskV1ContactGetNode
	| FreshdeskV1ContactGetAllNode
	| FreshdeskV1ContactUpdateNode
	| FreshdeskV1TicketCreateNode
	| FreshdeskV1TicketDeleteNode
	| FreshdeskV1TicketGetNode
	| FreshdeskV1TicketGetAllNode
	| FreshdeskV1TicketUpdateNode
	;