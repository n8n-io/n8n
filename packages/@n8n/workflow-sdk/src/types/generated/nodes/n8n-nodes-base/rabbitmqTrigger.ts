/**
 * RabbitMQ Trigger Node Types
 *
 * Listens to RabbitMQ messages
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/rabbitmqtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface RabbitmqTriggerV1Params {
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
// Node Type
// ===========================================================================

export type RabbitmqTriggerNode = {
	type: 'n8n-nodes-base.rabbitmqTrigger';
	version: 1;
	config: NodeConfig<RabbitmqTriggerV1Params>;
	credentials?: RabbitmqTriggerV1Credentials;
	isTrigger: true;
};
