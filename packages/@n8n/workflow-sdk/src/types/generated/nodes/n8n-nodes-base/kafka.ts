/**
 * Kafka Node Types
 *
 * Sends messages to a Kafka topic
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/kafka/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';
import type { IDataObject } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface KafkaV1Params {
	/**
	 * Name of the queue of topic to publish to
	 */
	topic?: string | Expression<string>;
	/**
	 * Whether to send the data the node receives as JSON to Kafka
	 * @default true
	 */
	sendInputData?: boolean | Expression<boolean>;
	/**
	 * The message to be sent
	 */
	message?: string | Expression<string>;
	jsonParameters?: boolean | Expression<boolean>;
	/**
	 * Whether to use Confluent Schema Registry
	 * @default false
	 */
	useSchemaRegistry?: boolean | Expression<boolean>;
	/**
	 * URL of the schema registry
	 */
	schemaRegistryUrl: string | Expression<string>;
	/**
	 * Whether to use a message key
	 * @default false
	 */
	useKey?: boolean | Expression<boolean>;
	/**
	 * The message key
	 */
	key: string | Expression<string>;
	/**
	 * Namespace and Name of Schema in Schema Registry (namespace.name)
	 */
	eventName: string | Expression<string>;
	headersUi?: Record<string, unknown>;
	/**
	 * Header parameters as JSON (flat object)
	 */
	headerParametersJson?: IDataObject | string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface KafkaV1Credentials {
	kafka: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type KafkaV1Node = {
	type: 'n8n-nodes-base.kafka';
	version: 1;
	config: NodeConfig<KafkaV1Params>;
	credentials?: KafkaV1Credentials;
};

export type KafkaNode = KafkaV1Node;
