/**
 * Kafka Node - Version 1
 * Sends messages to a Kafka topic
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';
import type { IDataObject } from '../../../../base';

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
 * @displayOptions.show { sendInputData: [false] }
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
 * @displayOptions.show { useSchemaRegistry: [true] }
 */
		schemaRegistryUrl: string | Expression<string>;
/**
 * Whether to use a message key
 * @default false
 */
		useKey?: boolean | Expression<boolean>;
/**
 * The message key
 * @displayOptions.show { useKey: [true] }
 */
		key: string | Expression<string>;
/**
 * Namespace and Name of Schema in Schema Registry (namespace.name)
 * @displayOptions.show { useSchemaRegistry: [true] }
 */
		eventName: string | Expression<string>;
	headersUi?: {
		headerValues?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
/**
 * Header parameters as JSON (flat object)
 * @displayOptions.show { jsonParameters: [true] }
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

interface KafkaV1NodeBase {
	type: 'n8n-nodes-base.kafka';
	version: 1;
	credentials?: KafkaV1Credentials;
}

export type KafkaV1ParamsNode = KafkaV1NodeBase & {
	config: NodeConfig<KafkaV1Params>;
};

export type KafkaV1Node = KafkaV1ParamsNode;