/**
 * Kafka Trigger Node - Version 1
 * Consume messages from a Kafka topic
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface KafkaTriggerV1Params {
/**
 * Name of the queue of topic to consume from
 */
		topic: string | Expression<string>;
/**
 * ID of the consumer group
 */
		groupId: string | Expression<string>;
/**
 * Whether to use Confluent Schema Registry
 * @default false
 */
		useSchemaRegistry?: boolean | Expression<boolean>;
/**
 * URL of the schema registry
 * @displayOptions.show { useSchemaRegistry: [true] }
 */
		schemaRegistryUrl: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface KafkaTriggerV1Credentials {
	kafka: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface KafkaTriggerV1NodeBase {
	type: 'n8n-nodes-base.kafkaTrigger';
	version: 1;
	credentials?: KafkaTriggerV1Credentials;
	isTrigger: true;
}

export type KafkaTriggerV1ParamsNode = KafkaTriggerV1NodeBase & {
	config: NodeConfig<KafkaTriggerV1Params>;
};

export type KafkaTriggerV1Node = KafkaTriggerV1ParamsNode;