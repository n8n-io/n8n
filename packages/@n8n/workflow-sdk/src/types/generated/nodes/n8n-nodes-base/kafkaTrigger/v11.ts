/**
 * Kafka Trigger Node - Version 1.1
 * Consume messages from a Kafka topic
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface KafkaTriggerV11Params {
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
// Node Type
// ===========================================================================

export type KafkaTriggerV11Node = {
	type: 'n8n-nodes-base.kafkaTrigger';
	version: 1 | 1.1;
	config: NodeConfig<KafkaTriggerV11Params>;
	credentials?: KafkaTriggerV11Credentials;
	isTrigger: true;
};