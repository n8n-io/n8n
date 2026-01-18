/**
 * Twilio Trigger Node Types
 *
 * Starts the workflow on a Twilio update
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/twiliotrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface TwilioTriggerV1Params {
	updates: Array<
		| 'com.twilio.messaging.inbound-message.received'
		| 'com.twilio.voice.insights.call-summary.complete'
	>;
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

export type TwilioTriggerV1Node = {
	type: 'n8n-nodes-base.twilioTrigger';
	version: 1;
	config: NodeConfig<TwilioTriggerV1Params>;
	credentials?: TwilioTriggerV1Credentials;
	isTrigger: true;
};

export type TwilioTriggerNode = TwilioTriggerV1Node;
