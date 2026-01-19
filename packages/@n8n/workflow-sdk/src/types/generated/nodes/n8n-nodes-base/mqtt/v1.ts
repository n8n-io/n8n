/**
 * MQTT Node - Version 1
 * Push messages to MQTT
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MqttV1Params {
/**
 * The topic to publish to
 */
		topic: string | Expression<string>;
/**
 * Whether to send the data the node receives as JSON
 * @default true
 */
		sendInputData?: boolean | Expression<boolean>;
/**
 * The message to publish
 * @displayOptions.show { sendInputData: [false] }
 */
		message: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MqttV1Credentials {
	mqtt: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface MqttV1NodeBase {
	type: 'n8n-nodes-base.mqtt';
	version: 1;
	credentials?: MqttV1Credentials;
}

export type MqttV1ParamsNode = MqttV1NodeBase & {
	config: NodeConfig<MqttV1Params>;
};

export type MqttV1Node = MqttV1ParamsNode;