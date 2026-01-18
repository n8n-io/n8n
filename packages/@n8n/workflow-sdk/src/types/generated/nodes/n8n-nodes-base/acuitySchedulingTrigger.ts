/**
 * Acuity Scheduling Trigger Node Types
 *
 * Handle Acuity Scheduling events via webhooks
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/acuityschedulingtrigger/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface AcuitySchedulingTriggerV1Params {
	authentication?: 'apiKey' | 'oAuth2' | Expression<string>;
	event:
		| 'appointment.canceled'
		| 'appointment.changed'
		| 'appointment.rescheduled'
		| 'appointment.scheduled'
		| 'order.completed'
		| Expression<string>;
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
// Node Type
// ===========================================================================

export type AcuitySchedulingTriggerNode = {
	type: 'n8n-nodes-base.acuitySchedulingTrigger';
	version: 1;
	config: NodeConfig<AcuitySchedulingTriggerV1Params>;
	credentials?: AcuitySchedulingTriggerV1Credentials;
	isTrigger: true;
};
