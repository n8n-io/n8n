/**
 * AMQP Trigger Node Types
 *
 * Listens to AMQP 1.0 Messages
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/amqptrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AmqpTriggerV1Params {
	/**
	 * Name of the queue of topic to listen to
	 */
	sink?: string | Expression<string>;
	/**
	 * Leave empty for non-durable topic subscriptions or queues
	 */
	clientname?: string | Expression<string>;
	/**
	 * Leave empty for non-durable topic subscriptions or queues
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

export type AmqpTriggerV1Node = {
	type: 'n8n-nodes-base.amqpTrigger';
	version: 1;
	config: NodeConfig<AmqpTriggerV1Params>;
	credentials?: AmqpTriggerV1Credentials;
	isTrigger: true;
};

export type AmqpTriggerNode = AmqpTriggerV1Node;
