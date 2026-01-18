/**
 * MailerLite Node - Version 1
 * Consume Mailer Lite API
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Credentials
// ===========================================================================

export interface MailerLiteV1Credentials {
	mailerLiteApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MailerLiteV1Node = {
	type: 'n8n-nodes-base.mailerLite';
	version: 1;
	config: NodeConfig<MailerLiteV1Params>;
	credentials?: MailerLiteV1Credentials;
};