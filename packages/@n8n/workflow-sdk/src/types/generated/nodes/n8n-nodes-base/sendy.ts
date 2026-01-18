/**
 * Sendy Node Types
 *
 * Consume Sendy API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/sendy/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a campaign */
export type SendyV1CampaignCreateConfig = {
	resource: 'campaign';
	operation: 'create';
	/**
	 * The 'From name' of your campaign
	 */
	fromName?: string | Expression<string>;
	/**
	 * The 'From email' of your campaign
	 */
	fromEmail?: string | Expression<string>;
	/**
	 * The 'Reply to' of your campaign
	 */
	replyTo?: string | Expression<string>;
	/**
	 * The 'Title' of your campaign
	 */
	title?: string | Expression<string>;
	/**
	 * The 'Subject' of your campaign
	 */
	subject?: string | Expression<string>;
	/**
	 * The 'HTML version' of your campaign
	 */
	htmlText?: string | Expression<string>;
	/**
	 * Whether to send the campaign as well and not just create a draft. Default is false.
	 * @default false
	 */
	sendCampaign?: boolean | Expression<boolean>;
	brandId: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Add a subscriber to a list */
export type SendyV1SubscriberAddConfig = {
	resource: 'subscriber';
	operation: 'add';
	/**
	 * Email address of the subscriber
	 */
	email?: string | Expression<string>;
	/**
	 * The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.
	 */
	listId?: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Count subscribers */
export type SendyV1SubscriberCountConfig = {
	resource: 'subscriber';
	operation: 'count';
	/**
	 * The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.
	 */
	listId?: string | Expression<string>;
};

/** Delete a subscriber from a list */
export type SendyV1SubscriberDeleteConfig = {
	resource: 'subscriber';
	operation: 'delete';
	/**
	 * Email address of the subscriber
	 */
	email?: string | Expression<string>;
	/**
	 * The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.
	 */
	listId?: string | Expression<string>;
};

/** Unsubscribe user from a list */
export type SendyV1SubscriberRemoveConfig = {
	resource: 'subscriber';
	operation: 'remove';
	/**
	 * Email address of the subscriber
	 */
	email?: string | Expression<string>;
	/**
	 * The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.
	 */
	listId?: string | Expression<string>;
};

/** Get the status of subscriber */
export type SendyV1SubscriberStatusConfig = {
	resource: 'subscriber';
	operation: 'status';
	/**
	 * Email address of the subscriber
	 */
	email?: string | Expression<string>;
	/**
	 * The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.
	 */
	listId?: string | Expression<string>;
};

export type SendyV1Params =
	| SendyV1CampaignCreateConfig
	| SendyV1SubscriberAddConfig
	| SendyV1SubscriberCountConfig
	| SendyV1SubscriberDeleteConfig
	| SendyV1SubscriberRemoveConfig
	| SendyV1SubscriberStatusConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SendyV1Credentials {
	sendyApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SendyV1Node = {
	type: 'n8n-nodes-base.sendy';
	version: 1;
	config: NodeConfig<SendyV1Params>;
	credentials?: SendyV1Credentials;
};

export type SendyNode = SendyV1Node;
