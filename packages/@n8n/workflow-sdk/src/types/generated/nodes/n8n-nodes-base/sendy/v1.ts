/**
 * Sendy Node - Version 1
 * Consume Sendy API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a campaign */
export type SendyV1CampaignCreateConfig = {
	resource: 'campaign';
	operation: 'create';
/**
 * The 'From name' of your campaign
 * @displayOptions.show { resource: ["campaign"], operation: ["create"] }
 */
		fromName?: string | Expression<string>;
/**
 * The 'From email' of your campaign
 * @displayOptions.show { resource: ["campaign"], operation: ["create"] }
 */
		fromEmail?: string | Expression<string>;
/**
 * The 'Reply to' of your campaign
 * @displayOptions.show { resource: ["campaign"], operation: ["create"] }
 */
		replyTo?: string | Expression<string>;
/**
 * The 'Title' of your campaign
 * @displayOptions.show { resource: ["campaign"], operation: ["create"] }
 */
		title?: string | Expression<string>;
/**
 * The 'Subject' of your campaign
 * @displayOptions.show { resource: ["campaign"], operation: ["create"] }
 */
		subject?: string | Expression<string>;
/**
 * The 'HTML version' of your campaign
 * @displayOptions.show { resource: ["campaign"], operation: ["create"] }
 */
		htmlText?: string | Expression<string>;
/**
 * Whether to send the campaign as well and not just create a draft. Default is false.
 * @displayOptions.show { resource: ["campaign"], operation: ["create"] }
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
 * @displayOptions.show { resource: ["subscriber"], operation: ["add"] }
 */
		email?: string | Expression<string>;
/**
 * The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.
 * @displayOptions.show { resource: ["subscriber"], operation: ["add"] }
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
 * @displayOptions.show { resource: ["subscriber"], operation: ["count"] }
 */
		listId?: string | Expression<string>;
};

/** Delete a subscriber from a list */
export type SendyV1SubscriberDeleteConfig = {
	resource: 'subscriber';
	operation: 'delete';
/**
 * Email address of the subscriber
 * @displayOptions.show { resource: ["subscriber"], operation: ["delete"] }
 */
		email?: string | Expression<string>;
/**
 * The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.
 * @displayOptions.show { resource: ["subscriber"], operation: ["delete"] }
 */
		listId?: string | Expression<string>;
};

/** Unsubscribe user from a list */
export type SendyV1SubscriberRemoveConfig = {
	resource: 'subscriber';
	operation: 'remove';
/**
 * Email address of the subscriber
 * @displayOptions.show { resource: ["subscriber"], operation: ["remove"] }
 */
		email?: string | Expression<string>;
/**
 * The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.
 * @displayOptions.show { resource: ["subscriber"], operation: ["remove"] }
 */
		listId?: string | Expression<string>;
};

/** Get the status of subscriber */
export type SendyV1SubscriberStatusConfig = {
	resource: 'subscriber';
	operation: 'status';
/**
 * Email address of the subscriber
 * @displayOptions.show { resource: ["subscriber"], operation: ["status"] }
 */
		email?: string | Expression<string>;
/**
 * The list ID you want to subscribe a user to. This encrypted & hashed ID can be found under View all lists section named ID.
 * @displayOptions.show { resource: ["subscriber"], operation: ["status"] }
 */
		listId?: string | Expression<string>;
};

export type SendyV1Params =
	| SendyV1CampaignCreateConfig
	| SendyV1SubscriberAddConfig
	| SendyV1SubscriberCountConfig
	| SendyV1SubscriberDeleteConfig
	| SendyV1SubscriberRemoveConfig
	| SendyV1SubscriberStatusConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SendyV1Credentials {
	sendyApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface SendyV1NodeBase {
	type: 'n8n-nodes-base.sendy';
	version: 1;
	credentials?: SendyV1Credentials;
}

export type SendyV1CampaignCreateNode = SendyV1NodeBase & {
	config: NodeConfig<SendyV1CampaignCreateConfig>;
};

export type SendyV1SubscriberAddNode = SendyV1NodeBase & {
	config: NodeConfig<SendyV1SubscriberAddConfig>;
};

export type SendyV1SubscriberCountNode = SendyV1NodeBase & {
	config: NodeConfig<SendyV1SubscriberCountConfig>;
};

export type SendyV1SubscriberDeleteNode = SendyV1NodeBase & {
	config: NodeConfig<SendyV1SubscriberDeleteConfig>;
};

export type SendyV1SubscriberRemoveNode = SendyV1NodeBase & {
	config: NodeConfig<SendyV1SubscriberRemoveConfig>;
};

export type SendyV1SubscriberStatusNode = SendyV1NodeBase & {
	config: NodeConfig<SendyV1SubscriberStatusConfig>;
};

export type SendyV1Node =
	| SendyV1CampaignCreateNode
	| SendyV1SubscriberAddNode
	| SendyV1SubscriberCountNode
	| SendyV1SubscriberDeleteNode
	| SendyV1SubscriberRemoveNode
	| SendyV1SubscriberStatusNode
	;