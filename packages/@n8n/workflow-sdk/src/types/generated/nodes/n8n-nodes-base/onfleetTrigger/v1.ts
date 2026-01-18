/**
 * Onfleet Trigger Node - Version 1
 * Starts the workflow when Onfleet events occur
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface OnfleetTriggerV1Params {
	triggerOn: 'SMSRecipientOptOut' | 'smsRecipientResponseMissed' | 'taskArrival' | 'taskAssigned' | 'taskCloned' | 'taskCompleted' | 'taskCreated' | 'taskDelayed' | 'taskDeleted' | 'taskEta' | 'taskFailed' | 'taskStarted' | 'taskUnassigned' | 'taskUpdated' | 'workerCreated' | 'workerDeleted' | 'workerDuty' | Expression<string>;
	additionalFields?: Record<string, unknown>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface OnfleetTriggerV1Credentials {
	onfleetApi: CredentialReference;
}

// ===========================================================================
// Node Type
// ===========================================================================

export type OnfleetTriggerV1Node = {
	type: 'n8n-nodes-base.onfleetTrigger';
	version: 1;
	config: NodeConfig<OnfleetTriggerV1Params>;
	credentials?: OnfleetTriggerV1Credentials;
	isTrigger: true;
};