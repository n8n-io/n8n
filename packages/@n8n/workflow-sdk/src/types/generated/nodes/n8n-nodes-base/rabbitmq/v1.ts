/**
 * RabbitMQ Node - Version 1
 * Sends messages to a RabbitMQ topic
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Publish data to queue */
export type RabbitmqV1QueueConfig = {
	mode: 'queue';
/**
 * Name of the queue to publish to
 * @displayOptions.show { mode: ["queue"] }
 * @displayOptions.hide { operation: ["deleteMessage"] }
 */
		queue?: string | Expression<string>;
/**
 * Whether to send the data the node receives as JSON
 * @displayOptions.show { operation: ["sendMessage"] }
 * @default true
 */
		sendInputData?: boolean | Expression<boolean>;
/**
 * The message to be sent
 * @displayOptions.show { sendInputData: [false] }
 */
		message?: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Publish data to exchange */
export type RabbitmqV1ExchangeConfig = {
	mode: 'exchange';
/**
 * Name of the exchange to publish to
 * @displayOptions.show { mode: ["exchange"] }
 */
		exchange?: string | Expression<string>;
/**
 * Type of exchange
 * @displayOptions.show { mode: ["exchange"] }
 * @default fanout
 */
		exchangeType?: 'direct' | 'topic' | 'headers' | 'fanout' | Expression<string>;
/**
 * The routing key for the message
 * @displayOptions.show { mode: ["exchange"] }
 */
		routingKey?: string | Expression<string>;
/**
 * Whether to send the data the node receives as JSON
 * @displayOptions.show { operation: ["sendMessage"] }
 * @default true
 */
		sendInputData?: boolean | Expression<boolean>;
/**
 * The message to be sent
 * @displayOptions.show { sendInputData: [false] }
 */
		message?: string | Expression<string>;
	options?: Record<string, unknown>;
};

export type RabbitmqV1Params =
	| RabbitmqV1QueueConfig
	| RabbitmqV1ExchangeConfig
	;

// ===========================================================================
// Credentials
// ===========================================================================

export interface RabbitmqV1Credentials {
	rabbitmq: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type RabbitmqV1Node = {
	type: 'n8n-nodes-base.rabbitmq';
	version: 1;
	config: NodeConfig<RabbitmqV1Params>;
	credentials?: RabbitmqV1Credentials;
};