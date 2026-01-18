/**
 * RabbitMQ Node Types
 *
 * Sends messages to a RabbitMQ topic
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/rabbitmq/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Publish data to queue */
export type RabbitmqV11QueueConfig = {
	mode: 'queue';
	/**
	 * Name of the queue to publish to
	 */
	queue?: string | Expression<string>;
	/**
	 * Whether to send the data the node receives as JSON
	 * @default true
	 */
	sendInputData?: boolean | Expression<boolean>;
	/**
	 * The message to be sent
	 */
	message?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Publish data to exchange */
export type RabbitmqV11ExchangeConfig = {
	mode: 'exchange';
	/**
	 * Name of the exchange to publish to
	 */
	exchange?: string | Expression<string>;
	/**
	 * Type of exchange
	 * @default fanout
	 */
	exchangeType?: 'direct' | 'topic' | 'headers' | 'fanout' | Expression<string>;
	/**
	 * The routing key for the message
	 */
	routingKey?: string | Expression<string>;
	/**
	 * Whether to send the data the node receives as JSON
	 * @default true
	 */
	sendInputData?: boolean | Expression<boolean>;
	/**
	 * The message to be sent
	 */
	message?: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type RabbitmqV11Params = RabbitmqV11QueueConfig | RabbitmqV11ExchangeConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface RabbitmqV11Credentials {
	rabbitmq: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type RabbitmqNode = {
	type: 'n8n-nodes-base.rabbitmq';
	version: 1 | 1.1;
	config: NodeConfig<RabbitmqV11Params>;
	credentials?: RabbitmqV11Credentials;
};
