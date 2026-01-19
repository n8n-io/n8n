/**
 * RabbitMQ Trigger Node - Version 1
 * Listens to RabbitMQ messages
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RabbitmqTriggerV1Config {
/**
 * The name of the queue to read from
 */
		queue?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface RabbitmqTriggerV1Credentials {
	rabbitmq: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface RabbitmqTriggerV1NodeBase {
	type: 'n8n-nodes-base.rabbitmqTrigger';
	version: 1;
	credentials?: RabbitmqTriggerV1Credentials;
	isTrigger: true;
}

export type RabbitmqTriggerV1Node = RabbitmqTriggerV1NodeBase & {
	config: NodeConfig<RabbitmqTriggerV1Config>;
};

export type RabbitmqTriggerV1Node = RabbitmqTriggerV1Node;