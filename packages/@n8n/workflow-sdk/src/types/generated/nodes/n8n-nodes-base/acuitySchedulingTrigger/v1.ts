/**
 * Acuity Scheduling Trigger Node - Version 1
 * Handle Acuity Scheduling events via webhooks
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AcuitySchedulingTriggerV1Params {
	authentication?: 'apiKey' | 'oAuth2' | Expression<string>;
	event: 'appointment.canceled' | 'appointment.changed' | 'appointment.rescheduled' | 'appointment.scheduled' | 'order.completed' | Expression<string>;
/**
 * By default does the webhook-data only contain the ID of the object. If this option gets activated, it will resolve the data automatically.
 * @default true
 */
		resolveData?: boolean | Expression<boolean>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface AcuitySchedulingTriggerV1Credentials {
	acuitySchedulingApi: CredentialReference;
	acuitySchedulingOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface AcuitySchedulingTriggerV1NodeBase {
	type: 'n8n-nodes-base.acuitySchedulingTrigger';
	version: 1;
	credentials?: AcuitySchedulingTriggerV1Credentials;
	isTrigger: true;
}

export type AcuitySchedulingTriggerV1ParamsNode = AcuitySchedulingTriggerV1NodeBase & {
	config: NodeConfig<AcuitySchedulingTriggerV1Params>;
};

export type AcuitySchedulingTriggerV1Node = AcuitySchedulingTriggerV1ParamsNode;