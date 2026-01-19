/**
 * RabbitMQ Node - Version 1
 * Sends messages to a RabbitMQ topic
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


// ===========================================================================
// Credentials
// ===========================================================================

export interface RabbitmqV1Credentials {
	rabbitmq: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface RabbitmqV1NodeBase {
	type: 'n8n-nodes-base.rabbitmq';
	version: 1;
	credentials?: RabbitmqV1Credentials;
}

export type RabbitmqV1QueueNode = RabbitmqV1NodeBase & {
	config: NodeConfig<RabbitmqV1QueueConfig>;
};

export type RabbitmqV1ExchangeNode = RabbitmqV1NodeBase & {
	config: NodeConfig<RabbitmqV1ExchangeConfig>;
};

export type RabbitmqV1Node =
	| RabbitmqV1QueueNode
	| RabbitmqV1ExchangeNode
	;