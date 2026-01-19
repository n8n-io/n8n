/**
 * AMQP Trigger Node - Version 1
 * Listens to AMQP 1.0 Messages
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AmqpTriggerV1Config {
/**
 * Name of the queue of topic to listen to
 */
		sink?: string | Expression<string>;
/**
 * Leave empty for non-durable topic subscriptions or queues
 * @hint for durable/persistent topic subscriptions
 */
		clientname?: string | Expression<string>;
/**
 * Leave empty for non-durable topic subscriptions or queues
 * @hint for durable/persistent topic subscriptions
 */
		subscription?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AmqpTriggerV1Credentials {
	amqp: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AmqpTriggerV1NodeBase {
	type: 'n8n-nodes-base.amqpTrigger';
	version: 1;
	credentials?: AmqpTriggerV1Credentials;
	isTrigger: true;
}

export type AmqpTriggerV1Node = AmqpTriggerV1NodeBase & {
	config: NodeConfig<AmqpTriggerV1Config>;
};

export type AmqpTriggerV1Node = AmqpTriggerV1Node;