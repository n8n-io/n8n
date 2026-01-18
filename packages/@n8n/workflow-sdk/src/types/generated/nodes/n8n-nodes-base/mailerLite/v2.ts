/**
 * MailerLite Node - Version 2
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

export type MailerLiteV2Params =
	| MailerLiteV2SubscriberCreateConfig
	| MailerLiteV2SubscriberGetConfig
	| MailerLiteV2SubscriberGetAllConfig
	| MailerLiteV2SubscriberUpdateConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailerLiteV2Credentials {
	mailerLiteApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MailerLiteV2Node = {
	type: 'n8n-nodes-base.mailerLite';
	version: 2;
	config: NodeConfig<MailerLiteV2Params>;
	credentials?: MailerLiteV2Credentials;
};