/**
 * Kafka Trigger Node Types
 *
 * Consume messages from a Kafka topic
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/kafkatrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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

export type KafkaTriggerV11Node = {
	type: 'n8n-nodes-base.kafkaTrigger';
	version: 1 | 1.1;
	config: NodeConfig<KafkaTriggerV11Params>;
	credentials?: KafkaTriggerV11Credentials;
	isTrigger: true;
};

export type KafkaTriggerNode = KafkaTriggerV11Node;
