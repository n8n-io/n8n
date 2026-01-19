/**
 * MailerLite Node - Version 2
 * Consume Mailer Lite API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new subscriber */
export type MailerLiteV2SubscriberCreateConfig = {
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
export type MailerLiteV2SubscriberGetConfig = {
	resource: 'subscriber';
	operation: 'get';
/**
 * Email of subscriber to get
 * @displayOptions.show { resource: ["subscriber"], operation: ["get"] }
 */
		subscriberId: string | Expression<string>;
};

/** Get many subscribers */
export type MailerLiteV2SubscriberGetAllConfig = {
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
export type MailerLiteV2SubscriberUpdateConfig = {
	resource: 'subscriber';
	operation: 'update';
/**
 * Email of subscriber
 * @displayOptions.show { resource: ["subscriber"], operation: ["update"] }
 */
		subscriberId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type MailerLiteV2SubscriberCreateOutput = {
	clicks_count?: number;
	created_at?: string;
	email?: string;
	fields?: {
		city?: null;
		country?: null;
		state?: null;
		z_i_p?: null;
	};
	groups?: Array<{
		active_count?: number;
		bounced_count?: number;
		click_rate?: {
			string?: string;
		};
		clicks_count?: number;
		created_at?: string;
		id?: string;
		junk_count?: number;
		name?: string;
		open_rate?: {
			string?: string;
		};
		opens_count?: number;
		sent_count?: number;
		unconfirmed_count?: number;
		unsubscribed_count?: number;
	}>;
	id?: string;
	opens_count?: number;
	opted_in_at?: null;
	optin_ip?: null;
	sent?: number;
	source?: string;
	status?: string;
	subscribed_at?: string;
	unsubscribed_at?: null;
	updated_at?: string;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailerLiteV2Credentials {
	mailerLiteApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MailerLiteV2NodeBase {
	type: 'n8n-nodes-base.mailerLite';
	version: 2;
	credentials?: MailerLiteV2Credentials;
}

export type MailerLiteV2SubscriberCreateNode = MailerLiteV2NodeBase & {
	config: NodeConfig<MailerLiteV2SubscriberCreateConfig>;
	output?: MailerLiteV2SubscriberCreateOutput;
};

export type MailerLiteV2SubscriberGetNode = MailerLiteV2NodeBase & {
	config: NodeConfig<MailerLiteV2SubscriberGetConfig>;
};

export type MailerLiteV2SubscriberGetAllNode = MailerLiteV2NodeBase & {
	config: NodeConfig<MailerLiteV2SubscriberGetAllConfig>;
};

export type MailerLiteV2SubscriberUpdateNode = MailerLiteV2NodeBase & {
	config: NodeConfig<MailerLiteV2SubscriberUpdateConfig>;
};

export type MailerLiteV2Node =
	| MailerLiteV2SubscriberCreateNode
	| MailerLiteV2SubscriberGetNode
	| MailerLiteV2SubscriberGetAllNode
	| MailerLiteV2SubscriberUpdateNode
	;