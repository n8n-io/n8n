/**
 * Twilio Trigger Node - Version 1
 * Starts the workflow on a Twilio update
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TwilioTriggerV1Params {
	updates: Array<'com.twilio.messaging.inbound-message.received' | 'com.twilio.voice.insights.call-summary.complete'>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface TwilioTriggerV1Credentials {
	twilioApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface TwilioTriggerV1NodeBase {
	type: 'n8n-nodes-base.twilioTrigger';
	version: 1;
	credentials?: TwilioTriggerV1Credentials;
	isTrigger: true;
}

export type TwilioTriggerV1ParamsNode = TwilioTriggerV1NodeBase & {
	config: NodeConfig<TwilioTriggerV1Params>;
};

export type TwilioTriggerV1Node = TwilioTriggerV1ParamsNode;