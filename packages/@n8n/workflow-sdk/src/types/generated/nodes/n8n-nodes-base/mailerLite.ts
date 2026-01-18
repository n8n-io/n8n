/**
 * MailerLite Node Types
 *
 * Consume Mailer Lite API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mailerlite/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new subscriber */
export type MailerLiteV2SubscriberCreateConfig = {
	resource: 'subscriber';
	operation: 'create';
	/**
	 * Email of new subscriber
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
	 */
	subscriberId: string | Expression<string>;
};

/** Get many subscribers */
export type MailerLiteV2SubscriberGetAllConfig = {
	resource: 'subscriber';
	operation: 'getAll';
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

/** Update an subscriber */
export type MailerLiteV2SubscriberUpdateConfig = {
	resource: 'subscriber';
	operation: 'update';
	/**
	 * Email of subscriber
	 */
	subscriberId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

export type MailerLiteV2Params =
	| MailerLiteV2SubscriberCreateConfig
	| MailerLiteV2SubscriberGetConfig
	| MailerLiteV2SubscriberGetAllConfig
	| MailerLiteV2SubscriberUpdateConfig;

/** Create a new subscriber */
export type MailerLiteV1SubscriberCreateConfig = {
	resource: 'subscriber';
	operation: 'create';
	/**
	 * Email of new subscriber
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
	 */
	subscriberId: string | Expression<string>;
};

/** Get many subscribers */
export type MailerLiteV1SubscriberGetAllConfig = {
	resource: 'subscriber';
	operation: 'getAll';
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

/** Update an subscriber */
export type MailerLiteV1SubscriberUpdateConfig = {
	resource: 'subscriber';
	operation: 'update';
	/**
	 * Email of subscriber
	 */
	subscriberId: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type MailerLiteV1Params =
	| MailerLiteV1SubscriberCreateConfig
	| MailerLiteV1SubscriberGetConfig
	| MailerLiteV1SubscriberGetAllConfig
	| MailerLiteV1SubscriberUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface MailerLiteV2Credentials {
	mailerLiteApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type MailerLiteNode = {
	type: 'n8n-nodes-base.mailerLite';
	version: 1 | 2;
	config: NodeConfig<MailerLiteV2Params>;
	credentials?: MailerLiteV2Credentials;
};
