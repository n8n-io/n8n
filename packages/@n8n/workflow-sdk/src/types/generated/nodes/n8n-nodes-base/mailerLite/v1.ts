/**
 * MailerLite Node - Version 1
 * Consume Mailer Lite API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new subscriber */
export type MailerLiteV1SubscriberCreateConfig = {
	resource: 'subscriber';
	operation: 'create';
/**
 * Email of new subscriber
 * @displayOptions.show { resource: ["subscriber"], operation: ["create"] }
 */
		email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get an subscriber */
export type MailerLiteV1SubscriberGetConfig = {
	resource: 'subscriber';
	operation: 'get';
/**
 * Email of subscriber to get
 * @displayOptions.show { resource: ["subscriber"], operation: ["get"] }
 */
		subscriberId: string | Expression<string>;
};

/** Get many subscribers */
export type MailerLiteV1SubscriberGetAllConfig = {
	resource: 'subscriber';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { resource: ["subscriber"], operation: ["getAll"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { resource: ["subscriber"], operation: ["getAll"], returnAll: [false] }
 * @default 50
 */
		limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an subscriber */
export type MailerLiteV1SubscriberUpdateConfig = {
	resource: 'subscriber';
	operation: 'update';
/**
 * Email of subscriber
 * @displayOptions.show { resource: ["subscriber"], operation: ["update"] }
 */
		subscriberId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MailerLiteV1Params =
	| MailerLiteV1SubscriberCreateConfig
	| MailerLiteV1SubscriberGetConfig
	| MailerLiteV1SubscriberGetAllConfig
	| MailerLiteV1SubscriberUpdateConfig
	;

// ===========================================================================
// Output Types
// ===========================================================================

export type MailerLiteV1SubscriberGetOutput = {
	id?: number;
	name?: string;
	email?: string;
	sent?: number;
	opened?: number;
	clicked?: number;
	type?: string;
	country_id?: string;
	signup_ip?: null;
	signup_timestamp?: null;
	fields?: Array<{
		key: string;
		value: string;
		type: string;
	}>;
	date_unsubscribe?: null;
	date_created?: string;
	date_updated?: string;
};

export type MailerLiteV1SubscriberGetAllOutput = {
	id: number;
	name: string;
	email: string;
	sent: number;
	opened: number;
	clicked: number;
	type: string;
	country_id: string;
	signup_ip: null;
	signup_timestamp: null;
	confirmation_ip: null;
	confirmation_timestamp: null;
	fields: Array<{
		key: string;
		value: string;
		type: string;
	}>;
	date_subscribe: string;
	date_created: string;
	date_updated: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailerLiteV1Credentials {
	mailerLiteApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MailerLiteV1NodeBase {
	type: 'n8n-nodes-base.mailerLite';
	version: 1;
	credentials?: MailerLiteV1Credentials;
}

export type MailerLiteV1SubscriberCreateNode = MailerLiteV1NodeBase & {
	config: NodeConfig<MailerLiteV1SubscriberCreateConfig>;
};

export type MailerLiteV1SubscriberGetNode = MailerLiteV1NodeBase & {
	config: NodeConfig<MailerLiteV1SubscriberGetConfig>;
	output?: MailerLiteV1SubscriberGetOutput;
};

export type MailerLiteV1SubscriberGetAllNode = MailerLiteV1NodeBase & {
	config: NodeConfig<MailerLiteV1SubscriberGetAllConfig>;
	output?: MailerLiteV1SubscriberGetAllOutput;
};

export type MailerLiteV1SubscriberUpdateNode = MailerLiteV1NodeBase & {
	config: NodeConfig<MailerLiteV1SubscriberUpdateConfig>;
};

export type MailerLiteV1Node =
	| MailerLiteV1SubscriberCreateNode
	| MailerLiteV1SubscriberGetNode
	| MailerLiteV1SubscriberGetAllNode
	| MailerLiteV1SubscriberUpdateNode
	;