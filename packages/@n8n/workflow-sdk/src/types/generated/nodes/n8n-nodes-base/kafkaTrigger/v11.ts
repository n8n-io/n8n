/**
 * Kafka Trigger Node - Version 1.1
 * Consume messages from a Kafka topic
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface KafkaTriggerV11Config {
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

export interface KafkaTriggerV11Credentials {
	kafka: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface KafkaTriggerV11NodeBase {
	type: 'n8n-nodes-base.kafkaTrigger';
	version: 1.1;
	credentials?: KafkaTriggerV11Credentials;
	isTrigger: true;
}

export type KafkaTriggerV11Node = KafkaTriggerV11NodeBase & {
	config: NodeConfig<KafkaTriggerV11Config>;
};

export type KafkaTriggerV11Node = KafkaTriggerV11Node;