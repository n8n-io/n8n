/**
 * MQTT Node - Version 1
 * Push messages to MQTT
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
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
// Node Type
// ===========================================================================

export type MqttV1Node = {
	type: 'n8n-nodes-base.mqtt';
	version: 1;
	config: NodeConfig<MqttV1Params>;
	credentials?: MqttV1Credentials;
};