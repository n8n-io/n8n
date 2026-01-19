/**
 * MQTT Trigger Node - Version 1
 * Listens to MQTT events
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface MqttTriggerV1Config {
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

interface MqttTriggerV1NodeBase {
	type: 'n8n-nodes-base.mqttTrigger';
	version: 1;
	credentials?: MqttTriggerV1Credentials;
	isTrigger: true;
}

export type MqttTriggerV1Node = MqttTriggerV1NodeBase & {
	config: NodeConfig<MqttTriggerV1Config>;
};

export type MqttTriggerV1Node = MqttTriggerV1Node;