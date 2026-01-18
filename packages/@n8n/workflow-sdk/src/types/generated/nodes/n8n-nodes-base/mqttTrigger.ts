/**
 * MQTT Trigger Node Types
 *
 * Listens to MQTT events
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/mqtttrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MqttTriggerV1Params {
	/**
	 * Topics to subscribe to, multiple can be defined with comma. Wildcard characters are supported (+ - for single level and # - for multi level). By default all subscription used QoS=0. To set a different QoS, write the QoS desired after the topic preceded by a colom. For Example: topicA:1,topicB:2
	 */
	topics?: string | Expression<string>;
	options?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface MqttTriggerV1Credentials {
	mqtt: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type MqttTriggerV1Node = {
	type: 'n8n-nodes-base.mqttTrigger';
	version: 1;
	config: NodeConfig<MqttTriggerV1Params>;
	credentials?: MqttTriggerV1Credentials;
	isTrigger: true;
};

export type MqttTriggerNode = MqttTriggerV1Node;
